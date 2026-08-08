#!/usr/bin/env python3
"""Generate the machine-readable catalog and human-readable index of skills.

Outputs:
    catalog.json  — every skill's metadata + path, for tooling / search / agents.
    INDEX.md      — grouped tables with red<->blue pairings, for humans.

Run after adding or changing a skill. CI runs this with --check to fail the
build if the committed artifacts are stale.

Usage:
    python tools/build_catalog.py [--check]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate import load_frontmatter  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
SKILLS = REPO / "skills"
CATALOG_JSON = REPO / "catalog.json"
INDEX_MD = REPO / "INDEX.md"
COVERAGE_MD = REPO / "COVERAGE.md"
SITE_CATALOG = REPO / "site" / "catalog.json"  # served copy the website fetches

TEAM_BADGE = {"red": "🔴 red", "blue": "🔵 blue", "purple": "🟣 purple"}

# Surfaces in display order, and which are planned (no skills yet, shown dark on
# the site's coverage map). Keep in sync with SKILL-SPEC APP_TYPES + COVERAGE.md.
SURFACES_ORDER = ["web-app", "api", "cloud-native", "ci-cd", "mobile", "network"]
PLANNED_SURFACES = []
# Kill-chain stages in canonical order: offense then defense.
STAGE_ORDER = [
    "recon", "initial-access", "execution", "persistence", "privilege-escalation",
    "defense-evasion", "credential-access", "lateral-movement", "collection",
    "exfiltration", "impact",
    "harden", "detect", "respond", "recover", "hunt",
]

COVERAGE_BEGIN = "<!-- COVERAGE:BEGIN -->"
COVERAGE_END = "<!-- COVERAGE:END -->"


def build_coverage(rows: list[dict]) -> dict:
    """Per-(surface, stage) coverage counts, for the website map and COVERAGE.md."""
    cells: dict[str, dict[str, dict]] = {}
    totals: dict[str, dict] = {}
    for surface in SURFACES_ORDER:
        cells[surface] = {}
        totals[surface] = {"total": 0, "validated": 0, "red": 0, "blue": 0, "purple": 0}
    for r in rows:
        s, stage, team = r.get("app_type"), r.get("stage"), r.get("team")
        if s not in cells or not stage:
            continue
        cell = cells[s].setdefault(stage, {"red": 0, "blue": 0, "purple": 0,
                                           "validated": 0, "total": 0})
        cell["total"] += 1
        if team in ("red", "blue", "purple"):
            cell[team] += 1
            totals[s][team] += 1
        totals[s]["total"] += 1
        if r.get("maturity") == "validated":
            cell["validated"] += 1
            totals[s]["validated"] += 1
    return {
        "surfaces_order": SURFACES_ORDER,
        "planned": PLANNED_SURFACES,
        "stage_order": STAGE_ORDER,
        "cells": cells,
        "totals": totals,
    }


def render_coverage_md(coverage: dict) -> str:
    """A surface x stage matrix table (only non-empty stage columns)."""
    used_stages = [st for st in coverage["stage_order"]
                   if any(st in coverage["cells"][s] for s in coverage["surfaces_order"])]
    head = "| surface | " + " | ".join(used_stages) + " | **total** |"
    sep = "|" + "---|" * (len(used_stages) + 2)
    lines = [head, sep]
    for s in coverage["surfaces_order"]:
        planned = s in coverage["planned"]
        label = f"`{s}`" + (" _(planned)_" if planned else "")
        cellvals = []
        for st in used_stages:
            c = coverage["cells"][s].get(st)
            if not c:
                cellvals.append("·" if not planned else "")
            else:
                mark = "✓" if c["validated"] == c["total"] else ""
                cellvals.append(f"{c['total']}{mark}")
        tot = coverage["totals"][s]["total"]
        lines.append(f"| {label} | " + " | ".join(cellvals)
                     + f" | **{tot or '—'}** |")
    grand = sum(coverage["totals"][s]["total"] for s in coverage["surfaces_order"])
    val = sum(coverage["totals"][s]["validated"] for s in coverage["surfaces_order"])
    legend = (f"\n_{grand} skills across {len([s for s in coverage['surfaces_order'] if coverage['totals'][s]['total']])} "
              f"live surfaces; {val} validated end-to-end. `·` = empty slot, "
              f"`✓` = every skill in the cell is validated, `_(planned)_` = surface not yet started._")
    return "\n".join(lines) + "\n" + legend


def render_coverage_doc(coverage: dict) -> str:
    """COVERAGE.md with the matrix spliced between the COVERAGE markers."""
    src = COVERAGE_MD.read_text(encoding="utf-8")
    if COVERAGE_BEGIN not in src or COVERAGE_END not in src:
        return src
    pre = src.split(COVERAGE_BEGIN)[0]
    post = src.split(COVERAGE_END)[1]
    table = render_coverage_md(coverage)
    return f"{pre}{COVERAGE_BEGIN}\n\n{table}\n\n{COVERAGE_END}{post}"


def collect() -> list[dict]:
    rows = []
    for path in sorted(SKILLS.rglob("SKILL.md")):
        fm, _body, errors = load_frontmatter(path)
        if fm is None:
            continue
        lv = (fm.get("validation") or {}).get("last_validated")
        rows.append({
            "name": fm.get("name"),
            "description": " ".join(str(fm.get("description", "")).split()),
            "team": fm.get("team"),
            "app_type": fm.get("app_type"),
            "stage": (fm.get("killchain") or {}).get("stage"),
            "techniques": fm.get("techniques") or {},
            "pairs_with": fm.get("pairs_with") or [],
            "risk": (fm.get("risk") or {}).get("level"),
            "authorization": fm.get("authorization"),
            "maturity": fm.get("maturity"),
            "version": fm.get("version"),
            "last_validated": lv.isoformat() if hasattr(lv, "isoformat") else lv,
            "path": str(path.relative_to(REPO)),
        })
    return rows


def render_catalog_json(rows: list[dict], coverage: dict) -> str:
    doc = {
        "schema": "redblueskills/catalog/v1",
        "count": len(rows),
        "coverage": coverage,
        "skills": rows,
    }
    return json.dumps(doc, indent=2, ensure_ascii=False) + "\n"


def render_index_md(rows: list[dict]) -> str:
    by_app: dict[str, list[dict]] = {}
    for r in rows:
        by_app.setdefault(r["app_type"] or "unknown", []).append(r)

    out = [
        "<!-- GENERATED BY tools/build_catalog.py — DO NOT EDIT BY HAND -->",
        "# Skill index",
        "",
        f"{len(rows)} skill(s). Regenerate with `make catalog`.",
        "",
        "| Legend | |",
        "|---|---|",
        "| 🔴 red | offensive |",
        "| 🔵 blue | defensive |",
        "| 🟣 purple | joint |",
        "",
    ]
    for app in sorted(by_app):
        out.append(f"## {app}")
        out.append("")
        out.append("| Skill | Team | Stage | ATT&CK | Risk | Maturity | Paired with |")
        out.append("|---|---|---|---|---|---|---|")
        for r in sorted(by_app[app], key=lambda x: (x["team"] or "", x["stage"] or "", x["name"] or "")):
            attack = ", ".join((r["techniques"] or {}).get("attack") or []) or "—"
            pairs = ", ".join(f"`{p}`" for p in r["pairs_with"]) or "—"
            link = f"[`{r['name']}`]({r['path']})"
            out.append(
                f"| {link} | {TEAM_BADGE.get(r['team'], r['team'])} | {r['stage']} "
                f"| {attack} | {r['risk']} | {r['maturity']} | {pairs} |"
            )
        out.append("")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="fail if committed artifacts differ from freshly generated ones")
    args = ap.parse_args()

    rows = collect()
    coverage = build_coverage(rows)
    catalog = render_catalog_json(rows, coverage)
    index = render_index_md(rows)
    coverage_doc = render_coverage_doc(coverage) if COVERAGE_MD.exists() else None

    if args.check:
        stale = []
        if not CATALOG_JSON.exists() or CATALOG_JSON.read_text(encoding="utf-8") != catalog:
            stale.append("catalog.json")
        if not INDEX_MD.exists() or INDEX_MD.read_text(encoding="utf-8") != index:
            stale.append("INDEX.md")
        if coverage_doc is not None and COVERAGE_MD.read_text(encoding="utf-8") != coverage_doc:
            stale.append("COVERAGE.md")
        if SITE_CATALOG.parent.is_dir() and (
            not SITE_CATALOG.exists() or SITE_CATALOG.read_text(encoding="utf-8") != catalog
        ):
            stale.append("site/catalog.json")
        if stale:
            print(f"STALE: {', '.join(stale)} out of date — run `make catalog`", file=sys.stderr)
            return 1
        print("catalog artifacts are up to date")
        return 0

    CATALOG_JSON.write_text(catalog, encoding="utf-8")
    INDEX_MD.write_text(index, encoding="utf-8")
    wrote = ["catalog.json", "INDEX.md"]
    if coverage_doc is not None:
        COVERAGE_MD.write_text(coverage_doc, encoding="utf-8")
        wrote.append("COVERAGE.md")
    if SITE_CATALOG.parent.is_dir():
        SITE_CATALOG.write_text(catalog, encoding="utf-8")
        wrote.append("site/catalog.json")
    print(f"wrote {', '.join(wrote)} ({len(rows)} skills)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
