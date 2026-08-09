#!/usr/bin/env python3
"""Generate the SBOM and the provenance manifest for the skill library.

Two artifacts, both derived entirely from the skills on disk — no value is
hand-written, so they can never drift from what actually ships:

    sbom.cdx.json   — CycloneDX 1.5 SBOM. Every skill is a component with a
                      SHA-256 of its SKILL.md and its risk/team/stage metadata,
                      plus the package itself and the tools that vouch for it.
    provenance.json — who validated each skill, against which lab, when, and the
                      content hash that stamp applies to. This is the "offense
                      you can't detect doesn't ship" claim, made checkable.

Both files are deterministic: no timestamps, no UUIDs from the clock, ordering
is stable. That is what lets CI run this with --check and fail on any drift, and
what lets a release signature (cosign keyless, in CI) mean something — the bytes
are reproducible from the tree.

Usage:
    python tools/build_provenance.py [--check]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate import load_frontmatter  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
SKILLS = REPO / "skills"
ORCHESTRATORS = REPO / "orchestrators"
PACKAGE_JSON = REPO / "package.json"
SBOM_JSON = REPO / "sbom.cdx.json"
PROVENANCE_JSON = REPO / "provenance.json"
SITE = REPO / "site"

# Stable namespace so the SBOM serial number is reproducible from content
# instead of a random clock-based UUID (which would defeat --check).
_NS = uuid.UUID("6f9619ff-8b86-d011-b42d-00cf4fc964ff")


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _package_meta() -> dict:
    pkg = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    return {
        "name": pkg.get("name", "redblueskills"),
        "version": pkg.get("version", "0.0.0"),
        "license": pkg.get("license", "Apache-2.0"),
        "repository": (pkg.get("repository") or {}).get("url", ""),
    }


def collect_skills() -> list[dict]:
    """Every skill, sorted by repo-relative path, with its content hash."""
    out = []
    for path in sorted(SKILLS.rglob("SKILL.md")):
        fm, _body, _errors = load_frontmatter(path)
        if fm is None:
            continue
        rel = str(path.relative_to(REPO))
        validation = fm.get("validation") or {}
        lv = validation.get("last_validated")
        out.append({
            "name": fm.get("name"),
            "path": rel,
            "sha256": _sha256(path),
            "version": fm.get("version"),
            "team": fm.get("team"),
            "app_type": fm.get("app_type"),
            "stage": (fm.get("killchain") or {}).get("stage"),
            "risk": (fm.get("risk") or {}).get("level"),
            "authorization": fm.get("authorization"),
            "maturity": fm.get("maturity"),
            "pairs_with": fm.get("pairs_with") or [],
            "techniques": fm.get("techniques") or {},
            "validation": {
                "method": validation.get("method"),
                "target": validation.get("target"),
                "last_validated": lv.isoformat() if hasattr(lv, "isoformat") else lv,
                "validated_by": validation.get("validated_by"),
            } if fm.get("maturity") == "validated" else None,
        })
    return out


# --- SBOM (CycloneDX 1.5) ----------------------------------------------------

def render_sbom(pkg: dict, skills: list[dict]) -> str:
    root_ref = f"pkg:npm/{pkg['name']}@{pkg['version']}"
    components = []
    for s in skills:
        props = [
            {"name": "redblueskills:team", "value": str(s["team"])},
            {"name": "redblueskills:app_type", "value": str(s["app_type"])},
            {"name": "redblueskills:stage", "value": str(s["stage"])},
            {"name": "redblueskills:risk", "value": str(s["risk"])},
            {"name": "redblueskills:maturity", "value": str(s["maturity"])},
        ]
        components.append({
            "type": "data",
            "bom-ref": f"skill:{s['name']}",
            "name": s["name"],
            "version": s["version"],
            "description": f"{s['team']} skill for {s['app_type']} ({s['stage']})",
            "licenses": [{"license": {"id": "Apache-2.0"}}],
            "hashes": [{"alg": "SHA-256", "content": s["sha256"]}],
            "properties": props,
        })
    # Deterministic serial number from the component hashes.
    digest_seed = "".join(s["sha256"] for s in skills) + pkg["version"]
    serial = uuid.uuid5(_NS, digest_seed)
    doc = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": f"urn:uuid:{serial}",
        "version": 1,
        "metadata": {
            "component": {
                "type": "library",
                "bom-ref": root_ref,
                "name": pkg["name"],
                "version": pkg["version"],
                "licenses": [{"license": {"id": pkg["license"]}}],
                "externalReferences": (
                    [{"type": "vcs", "url": pkg["repository"]}] if pkg["repository"] else []
                ),
            },
            "tools": {
                "components": [
                    {"type": "application", "name": "redblueskills-provenance",
                     "version": pkg["version"]},
                ]
            },
        },
        "components": components,
    }
    return json.dumps(doc, indent=2, ensure_ascii=False, sort_keys=False) + "\n"


# --- provenance manifest -----------------------------------------------------

def render_provenance(pkg: dict, skills: list[dict]) -> str:
    validated = [s for s in skills if s["maturity"] == "validated"]
    reviewed = [s for s in skills if s["maturity"] == "reviewed"]
    labs = sorted({s["validation"]["target"] for s in validated
                   if s["validation"] and s["validation"].get("target")})
    entries = []
    for s in skills:
        entries.append({
            "name": s["name"],
            "path": s["path"],
            "sha256": s["sha256"],
            "team": s["team"],
            "app_type": s["app_type"],
            "stage": s["stage"],
            "risk": s["risk"],
            "maturity": s["maturity"],
            "pairs_with": s["pairs_with"],
            "validation": s["validation"],
        })
    doc = {
        "schema": "redblueskills/provenance/v1",
        "package": {"name": pkg["name"], "version": pkg["version"],
                    "repository": pkg["repository"]},
        "summary": {
            "total": len(skills),
            "validated": len(validated),
            "reviewed": len(reviewed),
            "labs": labs,
        },
        "algorithm": "sha256",
        "note": (
            "Each entry's sha256 is over the exact SKILL.md bytes. A 'validated' "
            "entry means the paired attack+defense was proven against 'validation.target' "
            "on 'last_validated' by 'validated_by'. Re-prove with `make validate-labs`. "
            "This file is deterministic and is signed at release time (cosign keyless)."
        ),
        "skills": entries,
    }
    return json.dumps(doc, indent=2, ensure_ascii=False, sort_keys=False) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="fail if committed artifacts differ from freshly generated ones")
    args = ap.parse_args()

    pkg = _package_meta()
    skills = collect_skills()
    sbom = render_sbom(pkg, skills)
    provenance = render_provenance(pkg, skills)

    targets = [(SBOM_JSON, sbom), (PROVENANCE_JSON, provenance)]
    # Serve copies beside the website so it can link/download them.
    if SITE.is_dir():
        targets.append((SITE / "sbom.cdx.json", sbom))
        targets.append((SITE / "provenance.json", provenance))

    if args.check:
        stale = [p.relative_to(REPO) for p, content in targets
                 if not p.exists() or p.read_text(encoding="utf-8") != content]
        if stale:
            print(f"STALE: {', '.join(map(str, stale))} out of date — run "
                  "`make provenance`", file=sys.stderr)
            return 1
        print("provenance artifacts are up to date")
        return 0

    for p, content in targets:
        p.write_text(content, encoding="utf-8")
    validated = sum(1 for s in skills if s["maturity"] == "validated")
    print(f"wrote sbom.cdx.json + provenance.json "
          f"({len(skills)} skills, {validated} validated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
