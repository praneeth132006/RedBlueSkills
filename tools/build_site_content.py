#!/usr/bin/env python3
"""Bundle every SKILL.md and repo doc into site/content.json.

The website reads this bundle and renders the full text in-page, so browsing
the library never bounces the reader out to GitHub. Run it whenever the
skills or the top-level docs change:

    python3 tools/build_site_content.py

`make site` wires this up alongside the catalog build.
"""

from __future__ import annotations

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "content.json"

# Top-level docs the site links to, in the order they appear in the reader's
# "docs" index. id -> (path, title, blurb)
DOCS: dict[str, tuple[str, str, str]] = {
    "quickstart": ("QUICKSTART.md", "Quickstart", "Zero to a report in five minutes."),
    "index": ("INDEX.md", "Full index", "Every skill, grouped by team and stage."),
    "coverage": ("COVERAGE.md", "Coverage & taxonomy", "Every field a skill is classified on, and what each surface covers."),
    "orchestrator": ("docs/orchestrator.md", "Orchestrator walkthrough", "What happens when you say \"attack my application\"."),
    "research-1.1": ("docs/research-1.1.md", "v1.1 research & test scope", "Sources, new skill coverage, and validation limits."),
    "releasing": ("docs/RELEASING.md", "Package releases", "Build, publish, and verify the distributed package."),
    "provenance": ("docs/provenance.md", "Provenance & integrity", "SBOM, signed manifests, and how to verify a release."),
    "adding-a-skill": ("docs/adding-a-skill.md", "Adding a skill", "The contributor path, end to end."),
    "example-flask": ("docs/examples/flask.md", "Example · Flask", "A worked run against a Python/Flask app."),
    "example-node": ("docs/examples/node-express.md", "Example · Node + Express", "A worked run against a Node/Express app."),
    "example-rails": ("docs/examples/rails.md", "Example · Rails", "A worked run against a Ruby on Rails app."),
    "skill-template": ("SKILL-TEMPLATE.md", "SKILL-TEMPLATE.md", "The skeleton every new skill starts from."),
    "skill-spec": ("SKILL-SPEC.md", "SKILL-SPEC.md", "The schema validation enforces."),
    "contributing": ("CONTRIBUTING.md", "Contributing", "How to propose, build, and land a skill."),
    "ethics": ("ETHICS.md", "Ethics", "What this library will and will not ship."),
    "security": ("SECURITY.md", "Security policy", "Reporting a vulnerability."),
    "governance": ("GOVERNANCE.md", "Governance", "Who decides what, and how."),
    "code-of-conduct": ("CODE_OF_CONDUCT.md", "Code of conduct", "Ground rules for the project."),
    "changelog": ("CHANGELOG.md", "Changelog", "What changed, release by release."),
    "readme": ("README.md", "README", "The project in full."),
    "orchestrator-skill": (
        "orchestrators/attack-my-application/SKILL.md",
        "attack-my-application",
        "The orchestrator skill itself.",
    ),
}


def read(rel: str) -> str:
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"missing file referenced by the site bundle: {rel}")
    return p.read_text(encoding="utf-8")


def main() -> int:
    catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))

    skills = {}
    for entry in catalog.get("skills", []):
        skills[entry["name"]] = {
            "path": entry["path"],
            "body": read(entry["path"]),
        }

    docs = {}
    for doc_id, (rel, title, blurb) in DOCS.items():
        docs[doc_id] = {
            "path": rel,
            "title": title,
            "blurb": blurb,
            "body": read(rel),
        }

    bundle = {
        "schema": "redblueskills/site-content/v1",
        "skills": skills,
        "docs": docs,
        "doc_order": list(DOCS.keys()),
    }

    rendered = json.dumps(bundle, indent=1, ensure_ascii=False) + "\n"

    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != rendered:
            print(
                f"{OUT.relative_to(ROOT)} is stale — run `make site-build` and commit the result.",
                file=sys.stderr,
            )
            return 1
        print("site content bundle is up to date")
        return 0

    OUT.write_text(rendered, encoding="utf-8")
    kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT.relative_to(ROOT)} — {len(skills)} skills, {len(docs)} docs, {kb:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
