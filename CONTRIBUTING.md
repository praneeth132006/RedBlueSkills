# Contributing to RedBlueSkills

Thanks for helping build a security skill library that defenders and authorized
testers can actually trust. Contributions are judged on **correctness, safety,
and pairing** — not volume.

Before anything else, read [`ETHICS.md`](ETHICS.md). Content that fails the
responsible-use standards there will be declined regardless of technical merit.

## What makes a good skill

- Solves one clearly-scoped problem an agent or operator faces.
- Follows [`SKILL-SPEC.md`](SKILL-SPEC.md) exactly (the validator enforces it).
- **Pairs across teams.** A red skill ships with — or links to an existing — blue
  skill that detects or mitigates it, and vice versa. The pairing must be
  bidirectional.
- Is **validated**: proven end-to-end against a lab or CTF target, with the
  `validation` block filled in. Draft/reviewed skills are welcome as WIP but are
  not recommended for production and are excluded from the default catalog.

## Workflow

1. **Set up:**
   ```bash
   make install          # PyYAML + pytest
   ```
2. **Start from the template:**
   ```bash
   cp -r _template skills/<app-type>/<team>/<stage>/<skill-name>
   ```
3. **Author `SKILL.md`.** Fill every required frontmatter field and every required
   body section. Keep payloads illustrative and scoped.
4. **Add or update the paired skill** on the other team and cross-link both in
   `pairs_with`.
5. **Validate against a target.** Use `_lab/` (or a documented CTF/lab) and fill
   the `validation` block with method, target, date, and your handle.
6. **Run the gate locally:**
   ```bash
   make check            # validate + catalog freshness + tests
   ```
   Regenerate the catalog if you changed any metadata:
   ```bash
   make catalog          # updates catalog.json + INDEX.md
   ```
7. **Open a PR** using the template. CI runs the same `make check`.

## Review criteria

A maintainer will check that your skill:

- Passes CI (schema, pairing, catalog freshness, tests).
- Is technically correct and reproducible from the written procedure.
- Meets the responsible-use standards in [`ETHICS.md`](ETHICS.md).
- Cites authoritative references (OWASP, MITRE ATT&CK/D3FEND, vendor docs).

Two maintainer approvals are required for a skill to reach `validated`. See
[`GOVERNANCE.md`](GOVERNANCE.md).

## Changing the tooling or schema

Schema changes touch every skill, so they need discussion first — open an issue
describing the change and its migration impact before a PR. Any new validation
rule must come with a test under `tools/tests/`.

## Commit & PR style

- Small, focused PRs (one skill or one pair at a time).
- Conventional-ish subjects: `add(web-app): CSRF red+blue pair`, `fix(tools): ...`.
- Sign your work if your employer requires a DCO/CLA.

By contributing you agree your work is licensed under [Apache-2.0](LICENSE).
