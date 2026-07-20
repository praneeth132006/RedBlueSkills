"""Tests for tools/validate.py.

Covers the schema checks on synthetic skills and asserts the repository's own
shipped skills all pass validation and pair correctly.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

TOOLS = Path(__file__).resolve().parent.parent
REPO = TOOLS.parent
sys.path.insert(0, str(TOOLS))

import validate  # noqa: E402

GOOD = """\
---
name: web-demo-skill
description: A valid demo skill used for tests.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1190]
  cwe: [CWE-89]
pairs_with: []
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

## Overview
Text.
## Validation
Text.
## References
Text.
"""


def _write_skill(root: Path, app: str, team: str, stage: str, name: str, content: str) -> Path:
    d = root / app / team / stage / name
    d.mkdir(parents=True)
    p = d / "SKILL.md"
    p.write_text(content, encoding="utf-8")
    return p


def test_valid_skill_passes(tmp_path):
    skills = tmp_path / "skills"
    p = _write_skill(skills, "web-app", "red", "initial-access", "web-demo-skill", GOOD)
    fm, errors = validate.validate_skill(p, skills)
    assert errors == [], errors
    assert fm["name"] == "web-demo-skill"


def test_bad_attack_id_flagged(tmp_path):
    skills = tmp_path / "skills"
    content = GOOD.replace("attack: [T1190]", "attack: [1190]")
    p = _write_skill(skills, "web-app", "red", "initial-access", "web-demo-skill", content)
    _fm, errors = validate.validate_skill(p, skills)
    assert any("not a valid" in e for e in errors)


def test_directory_metadata_mismatch_flagged(tmp_path):
    skills = tmp_path / "skills"
    # file says team: red but lives under blue/
    p = _write_skill(skills, "web-app", "blue", "detect", "web-demo-skill", GOOD)
    _fm, errors = validate.validate_skill(p, skills)
    assert any("!= directory" in e for e in errors)


def test_validated_requires_validation_block(tmp_path):
    skills = tmp_path / "skills"
    content = GOOD.replace("maturity: reviewed", "maturity: validated")
    p = _write_skill(skills, "web-app", "red", "initial-access", "web-demo-skill", content)
    _fm, errors = validate.validate_skill(p, skills)
    assert any("validation block" in e for e in errors)


def test_missing_required_section_flagged(tmp_path):
    skills = tmp_path / "skills"
    content = GOOD.replace("## References\nText.\n", "")
    p = _write_skill(skills, "web-app", "red", "initial-access", "web-demo-skill", content)
    _fm, errors = validate.validate_skill(p, skills)
    assert any("References" in e for e in errors)


def test_nonreciprocal_pairing_flagged():
    skills = {
        "a": {"team": "red", "pairs_with": ["b"]},
        "b": {"team": "blue", "pairs_with": []},
    }
    problems = validate.check_pairings(skills)
    assert any("not reciprocated" in p[1] for p in problems)


def test_missing_partner_flagged():
    skills = {"a": {"team": "red", "pairs_with": ["ghost"]}}
    problems = validate.check_pairings(skills)
    assert any("does not exist" in p[1] for p in problems)


def test_same_team_pairing_flagged():
    skills = {
        "a": {"team": "red", "pairs_with": ["b"]},
        "b": {"team": "red", "pairs_with": ["a"]},
    }
    problems = validate.check_pairings(skills)
    assert any("same team" in p[1] for p in problems)


def test_shipped_skills_all_valid():
    """The repository's own skills must always pass validation."""
    skills_dir = REPO / "skills"
    parsed = {}
    for path in skills_dir.rglob("SKILL.md"):
        fm, errors = validate.validate_skill(path, skills_dir)
        assert errors == [], f"{path}: {errors}"
        parsed[fm["name"]] = fm
    assert validate.check_pairings(parsed) == []
