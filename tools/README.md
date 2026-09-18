# Tooling

Small, dependency-light Python tools that keep the skill library consistent.

| Tool | Purpose |
|---|---|
| `validate.py` | Lints every `SKILL.md` against [`SKILL-SPEC.md`](../SKILL-SPEC.md): required fields, controlled vocabularies, ATT&CK/CWE/CAPEC/OWASP/D3FEND id formats, directory↔metadata agreement, and **bidirectional red↔blue pairing**. |
| `build_catalog.py` | Generates `catalog.json` (machine-readable, for search/agents) and `INDEX.md` (human-readable). `--check` fails CI if they are stale. |

## Setup

Python 3.10+ and Node.js 16+ are required for the full test suite. Distribution
tests install the library into temporary directories and load all skills via MCP.

```bash
python -m pip install -r tools/requirements-dev.txt
```

## Common commands

```bash
make validate     # python tools/validate.py
make catalog      # python tools/build_catalog.py
make check        # schema + artifact freshness + tooling/distribution tests
make validate-labs # replay the two self-contained labs (also run by CI)
make test         # pytest tools/tests
```

## Adding a rule

Validation rules live in `validate.py` as small, isolated checks appended to an
`errors` list. Add the check, then add a fixture-based test under
`tools/tests/` so the rule is covered.
