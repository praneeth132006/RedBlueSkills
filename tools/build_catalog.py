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
README_MD = REPO / "README.md"
SITE = REPO / "site"
SITE_CATALOG = SITE / "catalog.json"  # served copy the website fetches
SITE_BADGES = SITE / "badges"
SITE_COVERAGE_SVG = SITE / "coverage.svg"

# Managed region in README.md — live counts are spliced in, never hand-typed.
STATS_BEGIN = "<!-- STATS:BEGIN -->"
STATS_END = "<!-- STATS:END -->"

TEAM_BADGE = {"red": "🔴 red", "blue": "🔵 blue", "purple": "🟣 purple"}

# Surfaces in display order, and which are planned (no skills yet, shown dark on
# the site's coverage map). Keep in sync with SKILL-SPEC APP_TYPES + COVERAGE.md.
SURFACES_ORDER = ["web-app", "api", "cloud-native", "ci-cd", "mobile", "network", "llm-ai"]
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


# --- derived stats, badges, heatmap, README injection -----------------------

def compute_stats(rows: list[dict], coverage: dict) -> dict:
    total = len(rows)
    validated = sum(1 for r in rows if r.get("maturity") == "validated")
    reviewed = sum(1 for r in rows if r.get("maturity") == "reviewed")
    surfaces = sum(1 for s in coverage["surfaces_order"]
                   if coverage["totals"][s]["total"])
    # Unordered red<->blue pairs, counted once each.
    seen = set()
    for r in rows:
        for p in r.get("pairs_with") or []:
            seen.add(frozenset((r["name"], p)))
    return {
        "total": total,
        "validated": validated,
        "reviewed": reviewed,
        "pairs": len(seen),
        "surfaces": surfaces,
        "validated_pct": round(100 * validated / total) if total else 0,
    }


def _badge(label: str, message: str, color: str) -> str:
    return json.dumps(
        {"schemaVersion": 1, "label": label, "message": message, "color": color},
        indent=2, ensure_ascii=False,
    ) + "\n"


def render_badges(stats: dict) -> dict[str, str]:
    """Shields.io endpoint files — the README badges read these, so a count is
    never written by hand."""
    return {
        "skills.json": _badge("skills", str(stats["total"]), "informational"),
        "validated.json": _badge(
            "validated", f"{stats['validated']}/{stats['total']}", "brightgreen"),
        "pairs.json": _badge("red↔blue pairs", str(stats["pairs"]), "blueviolet"),
        "surfaces.json": _badge("surfaces", str(stats["surfaces"]), "blue"),
    }


def render_coverage_svg(coverage: dict, stats: dict) -> str:
    """A surface x kill-chain-stage heatmap. Theme-aware (adapts to the reader's
    light/dark GitHub/site theme via prefers-color-scheme). Fully generated."""
    used = [st for st in coverage["stage_order"]
            if any(st in coverage["cells"][s] for s in coverage["surfaces_order"])]
    surfaces = coverage["surfaces_order"]
    pad_l, pad_t = 132, 96
    cw, ch = 74, 30
    w = pad_l + cw * len(used) + 70
    h = pad_t + ch * len(surfaces) + 30

    def cell_fill(c: dict | None) -> str:
        if not c or not c["total"]:
            return "var(--empty)"
        if c["validated"] == c["total"]:
            return "var(--full)"
        if c["validated"]:
            return "var(--part)"
        return "var(--some)"

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" '
        f'role="img" aria-label="RedBlueSkills coverage heatmap">',
        "<style>",
        ":root{--bg:#ffffff;--fg:#1f2328;--muted:#656d76;--grid:#d0d7de;"
        "--empty:#eef1f4;--some:#ffd8a8;--part:#a5d8ff;--full:#69db7c;}",
        "@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;"
        "--muted:#8b949e;--grid:#30363d;--empty:#161b22;--some:#7a4b12;"
        "--part:#1f4d7a;--full:#1a7f37;}}",
        ".t{fill:var(--fg);} .m{fill:var(--muted);} .n{fill:var(--fg);font-weight:700;}",
        "</style>",
        f'<rect width="{w}" height="{h}" fill="var(--bg)"/>',
        f'<text x="16" y="30" class="n" font-size="15">RedBlueSkills coverage</text>',
        f'<text x="16" y="50" class="m" font-size="11">{stats["total"]} skills · '
        f'{stats["validated"]} validated · {stats["pairs"]} red↔blue pairs · '
        f'{stats["surfaces"]} surfaces</text>',
    ]
    # column headers (rotated)
    for j, st in enumerate(used):
        x = pad_l + j * cw + cw / 2
        parts.append(
            f'<text x="{x:.0f}" y="{pad_t - 8}" class="m" font-size="10" '
            f'text-anchor="start" transform="rotate(-45 {x:.0f} {pad_t - 8})">{st}</text>')
    # rows
    for i, s in enumerate(surfaces):
        y = pad_t + i * ch
        parts.append(
            f'<text x="{pad_l - 10}" y="{y + ch/2 + 4:.0f}" class="t" font-size="11" '
            f'text-anchor="end">{s}</text>')
        for j, st in enumerate(used):
            x = pad_l + j * cw
            c = coverage["cells"][s].get(st)
            parts.append(
                f'<rect x="{x}" y="{y}" width="{cw-3}" height="{ch-3}" rx="3" '
                f'fill="{cell_fill(c)}" stroke="var(--grid)" stroke-width="0.5"/>')
            if c and c["total"]:
                parts.append(
                    f'<text x="{x + (cw-3)/2:.0f}" y="{y + ch/2 + 4:.0f}" class="t" '
                    f'font-size="11" text-anchor="middle">{c["total"]}</text>')
        tot = coverage["totals"][s]["total"]
        parts.append(
            f'<text x="{pad_l + len(used)*cw + 6}" y="{y + ch/2 + 4:.0f}" class="n" '
            f'font-size="11">{tot}</text>')
    # legend
    ly = pad_t + len(surfaces) * ch + 18
    legend = [("empty", "var(--empty)"), ("some", "var(--some)"),
              ("partial", "var(--part)"), ("all validated", "var(--full)")]
    lx = pad_l
    for label, fill in legend:
        parts.append(f'<rect x="{lx}" y="{ly-10}" width="12" height="12" rx="2" '
                     f'fill="{fill}" stroke="var(--grid)" stroke-width="0.5"/>')
        parts.append(f'<text x="{lx+17}" y="{ly}" class="m" font-size="10">{label}</text>')
        lx += 34 + len(label) * 6
    parts.append("</svg>")
    return "\n".join(parts) + "\n"


def render_readme(stats: dict) -> str | None:
    """Splice the live counts into README's managed STATS region."""
    if not README_MD.exists():
        return None
    src = README_MD.read_text(encoding="utf-8")
    if STATS_BEGIN not in src or STATS_END not in src:
        return None
    block = (
        f"{STATS_BEGIN}\n"
        f"| skills | red↔blue pairs | validated end-to-end | live surfaces |\n"
        f"|:--:|:--:|:--:|:--:|\n"
        f"| **{stats['total']}** | **{stats['pairs']}** | "
        f"**{stats['validated']}** ({stats['validated_pct']}%) | "
        f"**{stats['surfaces']}** |\n\n"
        f"<sub>Counts generated from `catalog.json` by `tools/build_catalog.py` — "
        f"never hand-edited. CI fails if this table drifts.</sub>\n"
        f"{STATS_END}"
    )
    pre = src.split(STATS_BEGIN)[0]
    post = src.split(STATS_END)[1]
    return f"{pre}{block}{post}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="fail if committed artifacts differ from freshly generated ones")
    args = ap.parse_args()

    rows = collect()
    coverage = build_coverage(rows)
    stats = compute_stats(rows, coverage)
    catalog = render_catalog_json(rows, coverage)
    index = render_index_md(rows)
    coverage_doc = render_coverage_doc(coverage) if COVERAGE_MD.exists() else None
    badges = render_badges(stats)
    coverage_svg = render_coverage_svg(coverage, stats)
    readme = render_readme(stats)

    # (path, freshly-rendered content) for every generated artifact.
    targets: list[tuple[Path, str]] = [
        (CATALOG_JSON, catalog),
        (INDEX_MD, index),
    ]
    if coverage_doc is not None:
        targets.append((COVERAGE_MD, coverage_doc))
    if readme is not None:
        targets.append((README_MD, readme))
    if SITE.is_dir():
        targets.append((SITE_CATALOG, catalog))
        targets.append((SITE_COVERAGE_SVG, coverage_svg))
        for fname, content in badges.items():
            targets.append((SITE_BADGES / fname, content))

    if args.check:
        stale = [str(p.relative_to(REPO)) for p, content in targets
                 if not p.exists() or p.read_text(encoding="utf-8") != content]
        if stale:
            print(f"STALE: {', '.join(stale)} out of date — run `make catalog`",
                  file=sys.stderr)
            return 1
        print("catalog artifacts are up to date")
        return 0

    SITE_BADGES.mkdir(parents=True, exist_ok=True) if SITE.is_dir() else None
    for p, content in targets:
        p.write_text(content, encoding="utf-8")
    print(f"wrote {len(targets)} artifact(s) ({len(rows)} skills, "
          f"{stats['validated']} validated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
