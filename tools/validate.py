#!/usr/bin/env python3
"""Validate every SKILL.md against the RedBlueSkills spec.

Enforces the frontmatter schema documented in SKILL-SPEC.md: required fields,
controlled vocabularies, reference-id formats, directory/metadata agreement,
and — the load-bearing rule for this project — bidirectional red<->blue pairing.

Exit code 0 when all skills are valid, 1 otherwise. Designed to run in CI.

Usage:
    python tools/validate.py [--skills-dir skills] [--quiet]
"""
from __future__ import annotations

import argparse
import datetime as _dt
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover - dependency guard
    sys.exit("PyYAML is required: pip install -r tools/requirements-dev.txt")

# --- controlled vocabularies -------------------------------------------------

TEAMS = {"red", "blue", "purple"}
APP_TYPES = {"web-app", "api", "cloud-native", "mobile", "network", "ci-cd", "llm-ai"}
FRAMEWORKS = {"mitre-attack", "unified-kill-chain"}
STAGES = {
    # offense
    "recon", "initial-access", "execution", "persistence",
    "privilege-escalation", "defense-evasion", "credential-access",
    "lateral-movement", "collection", "exfiltration", "impact",
    # defense
    "harden", "detect", "respond", "recover", "hunt",
}
RISK_LEVELS = {"info", "low", "medium", "high", "critical"}
DATA_TOUCH = {"none", "read", "read-write"}
AUTHORIZATION = {"required", "not-required"}
MATURITY = {"draft", "reviewed", "validated", "stale"}
VALIDATION_METHODS = {"lab", "ctf", "field", "none"}

# --- id formats --------------------------------------------------------------

RE_NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
RE_SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
RE_ATTACK = re.compile(r"^T\d{4}(\.\d{3})?$")
RE_CAPEC = re.compile(r"^CAPEC-\d+$")
RE_CWE = re.compile(r"^CWE-\d+$")
RE_OWASP = re.compile(r"^A\d{2}:\d{4}$")
RE_D3FEND = re.compile(r"^D3-[A-Z]{2,}$")

REQUIRED_BODY_SECTIONS = [
    "Overview",
    "Authorization & scope",
    "Preconditions",
    "Procedure",
    "Paired",
    "Validation",
    "References",
]

STALE_AFTER = _dt.timedelta(days=182)  # ~6 months


def load_frontmatter(path: Path) -> tuple[dict | None, str, list[str]]:
    """Return (frontmatter_dict, body, errors)."""
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        return None, "", [f"cannot read skill: {exc}"]
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return None, "", ["file does not begin with '---' frontmatter"]
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return None, "", ["frontmatter block is not terminated by a second '---'"]
    raw, body = "".join(lines[1:end]), "".join(lines[end + 1:])
    try:
        data = yaml.safe_load(raw)
    except yaml.YAMLError as exc:
        return None, body, [f"invalid YAML frontmatter: {exc}"]
    if not isinstance(data, dict):
        return None, body, ["frontmatter did not parse to a mapping"]
    return data, body, []


def _check_id_list(fm: dict, path: str, pattern: re.Pattern, errors: list[str]):
    node = fm
    for key in path.split("."):
        node = node.get(key, {}) if isinstance(node, dict) else {}
    if node == {}:
        return
    if not isinstance(node, list):
        errors.append(f"techniques.{path.split('.')[-1]} must be a list")
        return
    for item in node:
        if not pattern.match(str(item)):
            errors.append(f"'{item}' is not a valid {path} id (expected {pattern.pattern})")


def validate_skill(path: Path, skills_dir: Path) -> tuple[dict | None, list[str]]:
    fm, body, errors = load_frontmatter(path)
    if fm is None:
        return None, errors

    # Validate shapes before vocabulary checks or nested lookups. Bad contributor
    # input must produce diagnostics, never a traceback that hides other skills.
    for key in ("name", "description", "version", "team", "app_type", "license",
                "authorization", "maturity"):
        if key in fm and (not isinstance(fm[key], str) or not fm[key].strip()):
            errors.append(f"{key} must be a non-empty string")
    for key in ("killchain", "techniques", "risk", "validation"):
        if key in fm and not isinstance(fm[key], dict):
            errors.append(f"{key} must be a mapping")
    for key, fields in {"killchain": ("framework", "stage"),
                        "risk": ("level", "data_touch"),
                        "validation": ("method", "target", "validated_by")}.items():
        node = fm.get(key)
        if isinstance(node, dict):
            for field in fields:
                if field in node and (not isinstance(node[field], str) or not node[field].strip()):
                    errors.append(f"{key}.{field} must be a non-empty string")
    partners = fm.get("pairs_with")
    if isinstance(partners, list):
        if any(not isinstance(x, str) or not RE_NAME.fullmatch(x) for x in partners):
            errors.append("pairs_with entries must be kebab-case skill names")
        elif len(set(partners)) != len(partners):
            errors.append("pairs_with contains duplicate names")
    if errors:
        return fm, errors

    def req(key):
        if key not in fm or fm[key] in (None, ""):
            errors.append(f"missing required field: {key}")
            return False
        return True

    # scalar required fields + vocab
    if req("name") and not RE_NAME.match(str(fm["name"])):
        errors.append(f"name '{fm['name']}' must be kebab-case (^[a-z0-9]+(-[a-z0-9]+)*$)")
    if req("name") and len(str(fm["name"])) > 64:
        errors.append("name exceeds 64 characters")
    if req("description") and len(str(fm["description"])) > 1024:
        errors.append("description exceeds 1024 characters")
    if req("version") and not RE_SEMVER.match(str(fm["version"])):
        errors.append(f"version '{fm.get('version')}' is not semver (X.Y.Z)")
    if req("team") and fm["team"] not in TEAMS:
        errors.append(f"team '{fm['team']}' not in {sorted(TEAMS)}")
    if req("app_type") and fm["app_type"] not in APP_TYPES:
        errors.append(f"app_type '{fm['app_type']}' not in {sorted(APP_TYPES)}")
    if req("license") and fm.get("license") != "Apache-2.0":
        errors.append("license must be 'Apache-2.0'")

    # killchain
    if req("killchain"):
        kc = fm["killchain"] or {}
        if kc.get("framework") not in FRAMEWORKS:
            errors.append(f"killchain.framework must be in {sorted(FRAMEWORKS)}")
        if kc.get("stage") not in STAGES:
            errors.append(f"killchain.stage '{kc.get('stage')}' not in allowed stages")

    # techniques (at least one reference id anywhere)
    if req("techniques"):
        _check_id_list(fm, "techniques.attack", RE_ATTACK, errors)
        _check_id_list(fm, "techniques.capec", RE_CAPEC, errors)
        _check_id_list(fm, "techniques.cwe", RE_CWE, errors)
        _check_id_list(fm, "techniques.owasp", RE_OWASP, errors)
        _check_id_list(fm, "techniques.d3fend", RE_D3FEND, errors)
        tq = fm["techniques"] or {}
        if not any(tq.get(k) for k in ("attack", "capec", "cwe", "owasp", "d3fend")):
            errors.append("techniques must list at least one reference id")

    # pairs_with must be a list (contents cross-checked globally)
    if "pairs_with" not in fm:
        errors.append("missing required field: pairs_with (use [] if none)")
    elif not isinstance(fm["pairs_with"], list):
        errors.append("pairs_with must be a list")

    # risk
    if req("risk"):
        risk = fm["risk"] or {}
        if risk.get("level") not in RISK_LEVELS:
            errors.append(f"risk.level '{risk.get('level')}' not in {sorted(RISK_LEVELS)}")
        if not isinstance(risk.get("reversible"), bool):
            errors.append("risk.reversible must be a boolean")
        if risk.get("data_touch") not in DATA_TOUCH:
            errors.append(f"risk.data_touch '{risk.get('data_touch')}' not in {sorted(DATA_TOUCH)}")

    if req("authorization") and fm["authorization"] not in AUTHORIZATION:
        errors.append(f"authorization '{fm['authorization']}' not in {sorted(AUTHORIZATION)}")

    # maturity + validation coupling
    if req("maturity") and fm["maturity"] not in MATURITY:
        errors.append(f"maturity '{fm['maturity']}' not in {sorted(MATURITY)}")
    if fm.get("maturity") == "validated":
        if "validation" not in fm or not isinstance(fm["validation"], dict):
            errors.append("maturity 'validated' requires a validation block")
        else:
            v = fm["validation"]
            if v.get("method") not in VALIDATION_METHODS:
                errors.append(f"validation.method not in {sorted(VALIDATION_METHODS)}")
            for k in ("target", "last_validated", "validated_by"):
                if not v.get(k):
                    errors.append(f"validation.{k} is required when validated")
            if v.get("method") == "none":
                errors.append("validated skills require an evidence-bearing validation.method")
            lv = v.get("last_validated")
            if lv:
                try:
                    d = _dt.date.fromisoformat(str(lv))
                    if d > _dt.date.today():
                        errors.append("validation.last_validated cannot be in the future")
                    if _dt.date.today() - d > STALE_AFTER:
                        errors.append(
                            f"validation.last_validated {lv} is older than 6 months; "
                            "set maturity to 'stale' or re-validate"
                        )
                except ValueError:
                    errors.append(f"validation.last_validated '{lv}' is not an ISO-8601 date")

    # directory <-> metadata agreement
    rel = path.parent.relative_to(skills_dir).parts
    if len(rel) == 4:
        d_app, d_team, d_stage, d_name = rel[0], rel[1], rel[2], rel[-1]
        if fm.get("app_type") and fm["app_type"] != d_app:
            errors.append(f"app_type '{fm.get('app_type')}' != directory '{d_app}'")
        if fm.get("team") and fm["team"] != d_team:
            errors.append(f"team '{fm.get('team')}' != directory '{d_team}'")
        kc_stage = (fm.get("killchain") or {}).get("stage")
        if kc_stage and kc_stage != d_stage:
            errors.append(f"killchain.stage '{kc_stage}' != directory '{d_stage}'")
        if fm.get("name") and fm["name"] != d_name:
            errors.append(f"name '{fm.get('name')}' != directory '{d_name}'")
    else:
        errors.append(
            "skill path must be skills/<app-type>/<team>/<stage>/<name>/SKILL.md"
        )

    # Ignore fenced examples: a heading inside a code sample is not a section.
    prose = []
    fence = None
    for line in body.splitlines():
        match = re.match(r"^ {0,3}(`{3,}|~{3,})", line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            continue
        if fence is None:
            prose.append(line)
    headings = re.findall(r"^##[ \t]+(.+?)\s*$", "\n".join(prose), re.MULTILINE)
    last = -1
    for section in REQUIRED_BODY_SECTIONS:
        choices = ("Paired defense / offense", "Paired offense / defense") if section == "Paired" else (section,)
        positions = [i for i, h in enumerate(headings) if h.lower() in {c.lower() for c in choices}]
        if not positions:
            errors.append(f"body is missing required '## {section}' section")
        elif positions[0] <= last:
            errors.append(f"body section '{section}' is out of order")
        else:
            last = positions[0]

    return fm, errors


def check_pairings(skills: dict[str, dict]) -> list[tuple[str, str]]:
    """Return (skill_name, error) for broken pairings."""
    problems = []
    for name, fm in skills.items():
        partners = fm.get("pairs_with")
        if not isinstance(partners, list):
            continue  # diagnosed by validate_skill
        for partner in partners:
            if not isinstance(partner, str):
                continue  # diagnosed by validate_skill
            if partner not in skills:
                problems.append((name, f"pairs_with '{partner}' does not exist"))
                continue
            back = skills[partner].get("pairs_with") or []
            if not isinstance(back, list) or name not in back:
                problems.append(
                    (name, f"pairing with '{partner}' is not reciprocated "
                           f"('{partner}' must list '{name}' in pairs_with)")
                )
            # cross-team pairs are the whole point; warn if same team
            if fm.get("team") == skills[partner].get("team") and fm.get("team") != "purple":
                problems.append(
                    (name, f"pairs_with '{partner}' is on the same team "
                           f"('{fm.get('team')}'); pairings should cross red<->blue")
                )
    return problems


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--skills-dir", default="skills")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    skills_dir = (repo_root / args.skills_dir).resolve()
    if not skills_dir.is_dir():
        print(f"skills directory not found: {skills_dir}", file=sys.stderr)
        return 1

    skill_files = sorted(skills_dir.rglob("SKILL.md"))
    if not skill_files:
        print(f"no SKILL.md files found under {skills_dir}", file=sys.stderr)
        return 1

    total_errors = 0
    parsed: dict[str, dict] = {}
    name_to_path: dict[str, Path] = {}

    for path in skill_files:
        fm, errors = validate_skill(path, skills_dir)
        rel = path.relative_to(repo_root) if path.is_relative_to(repo_root) else path
        if fm and isinstance(fm.get("name"), str) and fm["name"]:
            if fm["name"] in parsed:
                errors.append(f"duplicate skill name '{fm['name']}' "
                              f"(also at {name_to_path[fm['name']]})")
            else:
                parsed[fm["name"]] = fm
                name_to_path[fm["name"]] = rel
        if errors:
            total_errors += len(errors)
            print(f"\n✗ {rel}")
            for e in errors:
                print(f"    - {e}")
        elif not args.quiet:
            print(f"✓ {rel}  [{fm.get('team')}/{fm.get('maturity')}]")

    for name, err in check_pairings(parsed):
        total_errors += 1
        print(f"\n✗ {name_to_path.get(name, name)}")
        print(f"    - {err}")

    print(f"\n{'-' * 60}")
    if total_errors:
        print(f"FAILED: {total_errors} error(s) across {len(skill_files)} skill(s)")
        return 1
    print(f"OK: {len(skill_files)} skill(s) valid, "
          f"{sum(1 for f in parsed.values() if f.get('pairs_with'))} paired")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
