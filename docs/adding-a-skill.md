# Adding a skill

This is the hands-on companion to [`CONTRIBUTING.md`](../CONTRIBUTING.md). It walks
you from an empty directory to a merged red↔blue pair, explains the anatomy of a
`SKILL.md`, and documents **exactly what the CI gate checks** so nothing surprises
you in review.

The bar is **correctness, safety, and pairing** — not volume. One well-made pair
beats ten drafts.

---

## The 60-second mental model

- A **skill** is a directory with a `SKILL.md`: YAML frontmatter (the machine-readable
  header an agent reads to decide *when* to use it) + a Markdown body (the procedure
  it follows to *do* the work).
- Skills come in **teams**: `red` (offense), `blue` (defense), `purple` (joint).
- **Every red skill pairs with a blue skill** that detects or mitigates it, and the
  pairing is **bidirectional** — both list each other. CI fails otherwise. This is
  the load-bearing rule of the whole project: *offense you can't detect doesn't ship.*
- A skill is only `validated` once it's been **proven against a real target** and
  stamped with who did it and when.

---

## Skill anatomy

Every `SKILL.md` has two parts.

### 1. Frontmatter (the header agents reason over)

The full schema lives in [`SKILL-SPEC.md`](../SKILL-SPEC.md); the copy-paste
starter is [`SKILL-TEMPLATE.md`](../SKILL-TEMPLATE.md) (and [`_template/`](../_template/)).
The fields that matter most:

| Field | What it's for |
|---|---|
| `name` | kebab-case, globally unique, **matches the directory name**. |
| `description` | 1–2 sentences written *for an agent* — lead with the action, then the trigger. This is what makes the skill get picked at the right moment. |
| `team` / `app_type` / `killchain.stage` | Must all match the directory path `skills/<app-type>/<team>/<stage>/<name>/`. |
| `techniques` | At least one reference id (ATT&CK / CAPEC / CWE / OWASP / D3FEND). Blue skills *should* carry `d3fend` ids. |
| `pairs_with` | The complementary skill(s). Cross-team pairs **must** be reciprocal. |
| `risk` | Blast radius of *running* the skill: `level`, `reversible`, `data_touch`. |
| `authorization` | `required` for active/offensive actions; `not-required` for passive defensive analysis. |
| `maturity` + `validation` | `validated` requires a full `validation` block (method, target, date, handle). |

### 2. Body (the operational content)

Required `##` sections, **in order**:

1. **Overview** — what it does and when it applies.
2. **Authorization & scope** — the guardrail (red) / data-handling boundaries (blue).
3. **Preconditions** — what must be true, what inputs are needed.
4. **Procedure** — numbered, reproducible steps; commands in fenced blocks.
5. **Paired defense / offense** — how the `pairs_with` skill relates.
6. **Validation** — how to reproduce the `validation` block.
7. **References** — OWASP, MITRE, vendor docs.

> Keep payloads **illustrative and scoped**. Never include credentials, real target
> data, or techniques whose only purpose is evading defenses on systems you don't own.

---

## The red/blue split — how a pair fits together

A pair is one problem seen from both sides. The **red** skill *emits a signal*; the
**blue** skill *consumes it*. Design them together so the signal one produces is the
signal the other looks for.

Using the shipped SQL-injection pair as the reference:

| | Red: [`web-sql-injection`](../skills/web-app/red/initial-access/web-sql-injection/SKILL.md) | Blue: [`web-sqli-detection`](../skills/web-app/blue/detect/web-sqli-detection/SKILL.md) |
|---|---|---|
| **team / stage** | `red` / `initial-access` | `blue` / `detect` |
| **goal** | Confirm & characterize the flaw, minimal proof | Catch attempts *and* success from logs/WAF/DB telemetry |
| **risk** | `high`, `data_touch: read-write`, auth **required** | `info`, `data_touch: read`, auth **not-required** |
| **techniques** | T1190 · CAPEC-66 · CWE-89 · A03:2021 | same + `d3fend: [D3-NTA, D3-FA]` |
| **`pairs_with`** | `[web-sqli-detection]` | `[web-sql-injection]` ← reciprocal |
| **the shared signal** | The payloads it sends (error-based, boolean, UNION, time-based) | Exactly those payload patterns + resulting DB errors/anomalies |

The test of a good pair: *would the blue skill actually see what the red skill
does?* If not, the red skill is describing offense nobody can detect — fix the pair
before merging.

---

## Walkthrough: adding a new pair

Say you're adding an **open-redirect** red skill and its detection.

**1. Set up.**
```bash
make install            # PyYAML + pytest
```

**2. Copy the template into the right path.** The path encodes app-type / team /
stage / name:
```bash
cp -r _template skills/web-app/red/initial-access/web-open-redirect
cp -r _template skills/web-app/blue/detect/web-open-redirect-detection
```

**3. Author both `SKILL.md` files.** Fill every required field and section. Set
`pairs_with` on each to point at the other:
```yaml
# in web-open-redirect/SKILL.md
pairs_with: [web-open-redirect-detection]
# in web-open-redirect-detection/SKILL.md
pairs_with: [web-open-redirect]
```

**4. Validate against a target.** Use [`_lab/`](../_lab/) or a documented CTF/lab,
then fill the `validation` block:
```yaml
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-08-05
  validated_by: your-github-handle
```
Not ready to validate? Ship it as `maturity: draft` — welcome as WIP, just excluded
from the default catalog.

**5. Run the gate locally** (this is the same thing CI runs):
```bash
make check
```

**6. Regenerate the catalog** if you changed any metadata:
```bash
make catalog            # updates catalog.json, INDEX.md, site/catalog.json
```

**7. Open a PR** using the template.

---

## What the CI gate checks (so you're never surprised)

`make check` — and the [`validate.yml`](../.github/workflows/validate.yml) workflow
— runs three things. A PR that fails any of them can't merge:

### 1. Schema validation — `python tools/validate.py`

Per skill:
- **Required fields present** and non-empty (`name`, `description`, `version`,
  `team`, `app_type`, `killchain`, `techniques`, `pairs_with`, `risk`,
  `authorization`, `maturity`, `license`).
- **Controlled vocabularies** — `team`, `app_type`, `killchain.stage`, `risk.level`,
  `data_touch`, `authorization`, `maturity`, `validation.method` must use allowed
  values.
- **ID formats** — `name` is kebab-case ≤64 chars; `version` is semver;
  `description` ≤1024 chars; ATT&CK (`T####[.###]`), CAPEC, CWE, OWASP (`A##:####`),
  D3FEND ids match their patterns; at least one technique id total.
- **Directory ↔ metadata agreement** — `app_type` / `team` / `killchain.stage` /
  `name` must equal the corresponding path segment.
- **`license` is `Apache-2.0`.**
- **Validated skills have a full `validation` block** and are **not older than 6
  months** (else you must set `maturity: stale` or re-validate).
- **Required body sections present** (`## Overview`, `## Validation`, `## References`).

Across skills:
- **Bidirectional pairing** — every name in `pairs_with` must exist and must list
  you back. Same-team pairings (other than `purple`) are flagged.
- **No duplicate skill names.**

### 2. Catalog freshness — `python tools/build_catalog.py --check`

Fails if `catalog.json`, `INDEX.md`, or `site/catalog.json` differ from what a fresh
generation produces. Translation: **run `make catalog` and commit the result**
whenever you touch skill metadata.

### 3. Tests — `python -m pytest tools/tests -q`

The validator's own test suite. If you change a validation rule, add a test for it
under [`tools/tests/`](../tools/tests/).

---

## Review criteria

A maintainer will confirm your skill:

- Passes CI (schema, pairing, catalog freshness, tests).
- Is technically correct and **reproducible from the written procedure alone**.
- Meets the responsible-use standards in [`ETHICS.md`](../ETHICS.md).
- Cites authoritative references.

Two maintainer approvals are required for a skill to reach `validated` — see
[`GOVERNANCE.md`](../GOVERNANCE.md).

Thanks for building this out. Every solid pair makes the library more trustworthy
for the next person who runs "attack my application."
