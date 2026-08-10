"""Tests for the generated artifacts: catalog stats/badges/heatmap, the SBOM +
provenance manifest, and the lab-replay runner.

The load-bearing property here is *determinism*: everything is derived from the
tree, nothing is hand-written, and re-running a generator on unchanged input
produces byte-identical output. That is what lets CI gate freshness and what
makes a release signature meaningful.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent.parent
REPO = TOOLS.parent
sys.path.insert(0, str(TOOLS))

import build_catalog  # noqa: E402
import build_provenance  # noqa: E402
import replay_labs  # noqa: E402


# --- catalog stats / badges / heatmap ---------------------------------------

def test_committed_artifacts_are_fresh():
    """catalog.json, badges, heatmap, README stats must match the tree."""
    assert build_catalog.main.__module__  # importable
    import subprocess
    r = subprocess.run([sys.executable, str(TOOLS / "build_catalog.py"), "--check"])
    assert r.returncode == 0, "run `make catalog` and commit the result"


def test_stats_match_catalog():
    catalog = json.loads((REPO / "catalog.json").read_text(encoding="utf-8"))
    rows = catalog["skills"]
    stats = build_catalog.compute_stats(rows, catalog["coverage"])
    assert stats["total"] == catalog["count"] == len(rows)
    assert stats["validated"] == sum(1 for r in rows if r["maturity"] == "validated")
    # every red<->blue pairing is counted once, and there is at least one.
    assert stats["pairs"] > 0
    assert stats["surfaces"] == 7


def test_badges_are_valid_shields_endpoints():
    catalog = json.loads((REPO / "catalog.json").read_text(encoding="utf-8"))
    stats = build_catalog.compute_stats(catalog["skills"], catalog["coverage"])
    badges = build_catalog.render_badges(stats)
    for content in badges.values():
        doc = json.loads(content)
        assert doc["schemaVersion"] == 1
        assert doc["label"] and doc["message"]
    assert json.loads(badges["skills.json"])["message"] == str(stats["total"])


def test_heatmap_svg_is_wellformed():
    catalog = json.loads((REPO / "catalog.json").read_text(encoding="utf-8"))
    stats = build_catalog.compute_stats(catalog["skills"], catalog["coverage"])
    svg = build_catalog.render_coverage_svg(catalog["coverage"], stats)
    assert svg.strip().startswith("<svg")
    assert svg.strip().endswith("</svg>")
    assert "prefers-color-scheme" in svg  # theme-aware


# --- SBOM + provenance -------------------------------------------------------

def test_provenance_artifacts_are_fresh():
    import subprocess
    r = subprocess.run([sys.executable, str(TOOLS / "build_provenance.py"), "--check"])
    assert r.returncode == 0, "run `make provenance` and commit the result"


def test_provenance_generation_is_deterministic():
    pkg = build_provenance._package_meta()
    skills = build_provenance.collect_skills()
    a = build_provenance.render_provenance(pkg, skills)
    b = build_provenance.render_provenance(pkg, skills)
    assert a == b
    sbom_a = build_provenance.render_sbom(pkg, skills)
    sbom_b = build_provenance.render_sbom(pkg, skills)
    assert sbom_a == sbom_b


def test_sbom_has_no_volatile_fields():
    """No wall-clock timestamp or random serial — those would break --check."""
    sbom = json.loads((REPO / "sbom.cdx.json").read_text(encoding="utf-8"))
    assert "timestamp" not in sbom.get("metadata", {})
    # serialNumber must be reproducible (uuid5), so re-render must match.
    pkg = build_provenance._package_meta()
    skills = build_provenance.collect_skills()
    again = json.loads(build_provenance.render_sbom(pkg, skills))
    assert again["serialNumber"] == sbom["serialNumber"]


def test_provenance_hashes_match_files():
    man = json.loads((REPO / "provenance.json").read_text(encoding="utf-8"))
    for e in man["skills"]:
        got = hashlib.sha256((REPO / e["path"]).read_bytes()).hexdigest()
        assert got == e["sha256"], f"hash drift for {e['name']}"


def test_provenance_summary_counts_are_consistent():
    man = json.loads((REPO / "provenance.json").read_text(encoding="utf-8"))
    catalog = json.loads((REPO / "catalog.json").read_text(encoding="utf-8"))
    assert man["summary"]["total"] == catalog["count"]
    assert man["summary"]["validated"] == sum(
        1 for s in catalog["skills"] if s["maturity"] == "validated")


def test_every_validated_skill_has_provenance():
    man = json.loads((REPO / "provenance.json").read_text(encoding="utf-8"))
    for e in man["skills"]:
        if e["maturity"] == "validated":
            v = e["validation"]
            assert v and v["target"] and v["validated_by"] and v["last_validated"]


# --- lab replay --------------------------------------------------------------

def test_replay_discovers_offline_labs():
    labs = {l["name"]: l for l in replay_labs.discover()}
    # the two self-contained labs must always be discovered and marked offline.
    assert "ci-local" in labs and labs["ci-local"]["offline"] is True
    assert "llm-local" in labs and labs["llm-local"]["offline"] is True
