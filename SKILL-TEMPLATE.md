# Skill template (copy-paste starter)

Copy the block below into `skills/<app-type>/<team>/<stage>/<name>/SKILL.md` and
fill it in. It's the same starter as [`_template/SKILL.md`](_template/SKILL.md),
surfaced here so it's easy to find. Full field reference:
[`SKILL-SPEC.md`](SKILL-SPEC.md). Step-by-step guide:
[`docs/adding-a-skill.md`](docs/adding-a-skill.md).

Fastest path:

```bash
cp -r _template skills/web-app/red/initial-access/my-skill    # then edit SKILL.md
make check                                                    # validate before PR
make catalog                                                  # if you changed metadata
```

> Remember the load-bearing rule: a red skill must pair with a blue skill (and vice
> versa), and the pairing must be **bidirectional** — each lists the other in
> `pairs_with`. CI enforces it.

---

````markdown
---
name: REPLACE-with-kebab-case-name          # matches the directory name; ^[a-z0-9]+(-[a-z0-9]+)*$
description: >-
  REPLACE. One or two sentences an agent reads to decide WHEN to use this skill.
  Lead with the action, then the trigger conditions. Keep under 1024 characters.
version: 0.1.0                               # semver
team: red                                    # red | blue | purple
app_type: web-app                            # must match the parent <app-type> directory
killchain:
  framework: mitre-attack                    # mitre-attack | unified-kill-chain
  stage: initial-access                      # must match the parent <killchain-stage> directory
techniques:
  attack: [T1190]                            # at least one reference id total (any category)
  capec: []                                  # e.g. [CAPEC-66]
  cwe: []                                    # e.g. [CWE-89]
  owasp: []                                  # e.g. ["A03:2021"]
  d3fend: []                                 # blue skills SHOULD list these, e.g. [D3-NTA]
pairs_with: [REPLACE-paired-skill-name]      # cross-team & bidirectional; use [] only if truly none
risk:
  level: low                                 # info | low | medium | high | critical
  reversible: true                           # does running it leave lasting change on the target?
  data_touch: read                           # none | read | read-write
authorization: required                      # required (active/offensive) | not-required (passive defense)
maturity: draft                              # draft | reviewed | validated | stale
# validation:                                # REQUIRED when maturity == validated — uncomment & fill
#   method: lab                              #   lab | ctf | field | none
#   target: owasp-juice-shop
#   last_validated: 2026-01-01               #   ISO-8601; must be within the last 6 months
#   validated_by: your-github-handle
license: Apache-2.0                          # must be Apache-2.0
---

# Skill title

## Overview

One paragraph: what this skill does and the conditions under which it applies.

## Authorization & scope

State plainly that this is for authorized testing only, and list the scope checks
the operator must confirm before acting (target in scope, written authorization on
file, testing window, minimal-impact data handling). **Blue skills:** state
data-handling boundaries instead (what logs/telemetry you read, and that you don't
act offensively on the target).

## Preconditions

- What must be true before starting.
- What inputs the skill needs.

## Procedure

1. Step one.
   ```bash
   # illustrative, scoped command — keep payloads minimal and non-destructive
   ```
2. Step two.

## Paired defense / offense

Explain the `pairs_with` relationship: what signal this skill emits (red) or
consumes (blue), and how the complementary skill closes the loop.

## Validation

How to reproduce the result against the named target.

## References

- Authoritative source 1 (OWASP / MITRE ATT&CK / D3FEND / vendor)
- Authoritative source 2
````
