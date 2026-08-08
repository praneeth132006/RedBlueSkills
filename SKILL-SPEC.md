# SKILL specification (v1)

Every skill in this repository is a directory containing a `SKILL.md` file. The
file is a superset of the [Anthropic Agent Skills](https://docs.claude.com/en/docs/agents/skills)
format: it opens with YAML frontmatter, followed by a Markdown body. Agents load
the frontmatter's `name` + `description` to decide *when* to use the skill, then
read the body to actually *perform* the work.

We extend the base format with security metadata so that every skill is
**risk-labeled**, **provenance-tracked**, and **paired across red/blue**. The
validator (`tools/validate.py`) enforces this schema on every pull request, so a
skill cannot merge unless it is complete and internally consistent.

---

## Directory layout

```
skills/<app-type>/<team>/<killchain-stage>/<skill-name>/
├── SKILL.md            # required — frontmatter + body
├── scripts/            # optional — helper scripts the body references
└── references/         # optional — payload lists, signatures, deep-dive docs
```

- `<app-type>` — the target surface. Shipping: `web-app`, `api`, `cloud-native`,
  `ci-cd`, `mobile`, `network`.
- `<team>` — `red` (offense), `blue` (defense), or `purple` (joint / detection
  engineering that spans both).
- `<killchain-stage>` — see the enum below.
- `<skill-name>` — kebab-case, globally unique, matches the frontmatter `name`.

---

## Frontmatter schema

```yaml
---
name: web-sql-injection              # REQUIRED. kebab-case, ^[a-z0-9]+(-[a-z0-9]+)*$, <=64 chars, globally unique.
description: >-                      # REQUIRED. <=1024 chars. Written for an agent: what it does + when to use it.
  Detect and exploit SQL injection in web applications during an authorized
  assessment. Use when a request parameter reaches a SQL query and you need to
  confirm, characterize, and demonstrate impact of the flaw.
version: 1.0.0                       # REQUIRED. semver.
team: red                            # REQUIRED. red | blue | purple
app_type: web-app                    # REQUIRED. must match the <app-type> directory.
killchain:                           # REQUIRED.
  framework: mitre-attack            #   mitre-attack | unified-kill-chain
  stage: initial-access              #   see enum below; must match the <killchain-stage> directory.
techniques:                          # REQUIRED. At least one reference id total.
  attack: [T1190]                    #   MITRE ATT&CK technique/sub-technique ids. ^T\d{4}(\.\d{3})?$
  capec: [CAPEC-66]                  #   optional. ^CAPEC-\d+$
  cwe: [CWE-89]                      #   optional. ^CWE-\d+$
  owasp: ["A03:2021"]                #   optional. ^A\d{2}:\d{4}$
  d3fend: []                         #   blue skills SHOULD list D3FEND ids. ^D3-[A-Z]{2,}$
pairs_with: [web-sqli-detection]     # REQUIRED (may be empty []). Names of complementary skills.
                                     #   Cross-team pairings MUST be bidirectional (both list each other).
risk:                                # REQUIRED. Blast radius of *running* this skill.
  level: high                        #   info | low | medium | high | critical
  reversible: true                   #   does running it leave lasting change on the target?
  data_touch: read-write             #   none | read | read-write
authorization: required              # REQUIRED. required | not-required
                                     #   Active/offensive actions are 'required'. Passive defensive analysis is 'not-required'.
maturity: validated                  # REQUIRED. draft | reviewed | validated | stale
validation:                          # REQUIRED when maturity == validated.
  method: lab                        #   lab | ctf | field | none
  target: owasp-juice-shop           #   the target the skill was proven against.
  last_validated: 2026-07-20         #   ISO-8601 date.
  validated_by: praneeth132006        #   GitHub handle of the validator.
license: Apache-2.0                  # REQUIRED. must be Apache-2.0.
---
```

### `killchain.stage` enum

Offensive stages (Unified Kill Chain, condensed) and defensive stages
(NIST-aligned) share one namespace so red/blue skills sort side by side:

| Offense (`red`)      | Defense (`blue`)   |
| -------------------- | ------------------ |
| `recon`              | `harden`           |
| `initial-access`     | `detect`           |
| `execution`          | `respond`          |
| `persistence`        | `recover`          |
| `privilege-escalation` | `hunt`           |
| `defense-evasion`    |                    |
| `credential-access`  |                    |
| `lateral-movement`   |                    |
| `collection`         |                    |
| `exfiltration`       |                    |
| `impact`             |                    |

`purple` skills may use any stage.

---

## Body structure

The Markdown body is the operational content. Required `##` sections, in order:

1. **Overview** — one paragraph: what the skill does and the conditions it applies to.
2. **Authorization & scope** — the guardrail. Explicit statement that this runs
   only against systems the operator is authorized to test, plus scope checks to
   perform before acting. (Blue skills state data-handling boundaries instead.)
3. **Preconditions** — what must be true / what inputs are needed.
4. **Procedure** — numbered, reproducible steps. Commands in fenced blocks.
5. **Paired defense / offense** — how the `pairs_with` skill relates; what signal
   this skill produces or consumes.
6. **Validation** — how to reproduce the `validation` block against the named target.
7. **References** — authoritative sources (OWASP, MITRE, vendor docs).

Keep payloads and destructive commands illustrative and scoped. Never include
credentials, real target data, or techniques whose only purpose is evasion of
defenses on systems you do not own.

---

## Maturity lifecycle

```
draft  ──review──▶  reviewed  ──validate──▶  validated  ──(6mo / breaking change)──▶  stale
```

- **draft** — authored, not yet reviewed. Allowed in the tree; excluded from the
  default catalog.
- **reviewed** — a maintainer has read it for correctness and safety.
- **validated** — proven end-to-end against a named target (`validation` block
  required). Only `validated` skills are recommended for production use.
- **stale** — was validated, but the technique or target has drifted. Flagged by
  CI when `last_validated` is older than 6 months.
