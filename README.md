# RedBlueSkills

**Agent-native, validated security skills for red teams and blue teams — paired offense and defense, risk-labeled, and proven before merge.**

[![Validate](https://github.com/Security-Environment/RedBlueSkills/actions/workflows/validate.yml/badge.svg)](https://github.com/Security-Environment/RedBlueSkills/actions/workflows/validate.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-20-informational)](INDEX.md)
[![npm](https://img.shields.io/badge/npm-redblueskills-c4362a)](https://www.npmjs.com/package/redblueskills)

RedBlueSkills is a library of [Claude Agent Skills](https://docs.claude.com/en/docs/agents/skills) —
`SKILL.md` packages an AI agent (or a human) can load to actually *perform*
security work: recon, exploitation for authorized assessments, detection
engineering, hardening, threat hunting, and incident response.

It is built to be **used inside CI, SOCs, and pentest workflows**, not just read.
That means four things most "awesome-security" lists don't give you:

| Principle | What it means here |
|---|---|
| 🤖 **Agent-native** | Every skill is an executable `SKILL.md` with a machine-readable header — loadable by Claude Code and other agents, not just human-readable notes. |
| 🔗 **Paired red ↔ blue** | Every offensive technique links to its detection/defense counterpart, and CI enforces the pairing is bidirectional. Offense you can't detect doesn't ship. |
| ✅ **Validated & provenanced** | Skills are proven against a real lab or CTF target, stamped with who validated them and when, and auto-flagged as `stale` after 6 months. |
| 🛠️ **Tooled** | A schema validator, catalog generator, and test suite gate every PR. Quality scales with contributors instead of rotting. |

> ⚠️ **Authorized use only.** These skills are for security testing on systems you
> own or are explicitly permitted to test, and for defending systems you operate.
> Read [`ETHICS.md`](ETHICS.md) before using anything here. You are responsible
> for staying within your authorization and the law.

---

## New here? Start with the Quickstart

**[`QUICKSTART.md`](QUICKSTART.md) — zero to a security report in 5 minutes.** No
security background needed: install, point your agent at an app you own, say
"attack my application," read the report.

| Guide | What it covers |
|---|---|
| **[QUICKSTART.md](QUICKSTART.md)** | The 5-minute, no-jargon path from install to report. |
| **[docs/orchestrator.md](docs/orchestrator.md)** | How `attack-my-application` works, stage by stage, with a sample transcript. |
| **[docs/examples/](docs/examples/)** | Full runs against real stacks — [Flask](docs/examples/flask.md) · [Node/Express](docs/examples/node-express.md) · [Rails](docs/examples/rails.md). |
| **[docs/adding-a-skill.md](docs/adding-a-skill.md)** | Write your own red↔blue pair; every CI gate explained. |
| **[ETHICS.md](ETHICS.md)** | The rules of the road. Read once. |

---

## Browse the library

See **[INDEX.md](INDEX.md)** for the full catalog (auto-generated), or
[`catalog.json`](catalog.json) for a machine-readable feed.

Skills are organized by **application type → team → kill-chain stage**:

```
skills/web-app/
├── red/                          # offense                    ⟷ paired blue skill
│   ├── recon/web-http-fingerprinting/          ⟷ web-security-headers
│   ├── initial-access/
│   │   ├── web-sql-injection/                  ⟷ web-sqli-detection
│   │   ├── web-reflected-xss/                  ⟷ web-xss-detection
│   │   ├── web-command-injection/              ⟷ web-command-injection-detection
│   │   ├── web-path-traversal/                 ⟷ web-path-traversal-detection
│   │   ├── web-ssrf/                           ⟷ web-ssrf-hardening
│   │   └── web-xxe/                            ⟷ web-xxe-hardening
│   ├── privilege-escalation/web-idor/          ⟷ web-access-control-monitoring
│   ├── credential-access/web-broken-authentication/ ⟷ web-authentication-hardening
│   └── execution/web-csrf/                     ⟷ web-csrf-hardening
└── blue/                         # defense
    ├── detect/    web-sqli-detection · web-xss-detection · web-command-injection-detection
    │              web-path-traversal-detection · web-access-control-monitoring
    └── harden/    web-security-headers · web-ssrf-hardening · web-xxe-hardening
                   web-authentication-hardening · web-csrf-hardening
```

**v1 ships the `web-app` vertical, deeply** — 10 red↔blue pairs covering the OWASP
Top 10 core. It is the reference implementation for every future surface (`api`,
`cloud-native`, `mobile`, `network`, `ci-cd`) — each will follow the same schema,
tooling, and pairing discipline.

---

## Install into your agent — one command

You don't need to clone this repo to use it. The library is published to npm, so
any coding LLM (Claude Code and friends) can pull the whole thing — skills,
`catalog.json`, and the `attack-my-application` orchestrator — into its skills
path in one step:

```bash
npx redblueskills init          # all skills + orchestrator → ./.claude/skills/redblueskills
npx redblueskills add web-ssrf  # just one (its paired defense comes along)
npx redblueskills list red      # browse offense (or: blue, a stage, or free text)
```

Then simply tell your agent **"attack my application"** (see below), or point it
at any `skills/**/SKILL.md`. A generated `README` in the install directory tells
the agent when to load each skill.

There's also a **website** — a browsable catalog with the same install flow — in
[`site/`](site/). It is fully self-contained: every `SKILL.md` and every doc is
bundled into `site/content.json` at build time and rendered in-page, so browsing
the library never sends you off to GitHub. To run it locally:

```
make site        # builds the catalog + content bundle, serves http://localhost:8799
```

`make site-build` regenerates `site/catalog.json` and `site/content.json` without
starting a server — run it after editing any skill or doc. The result is a plain
static directory, deployable to any static host if you ever want it published.

## The `attack-my-application` orchestrator

The headline capability. One instruction runs a full, authorized assessment: the
orchestrator ([`orchestrators/attack-my-application/SKILL.md`](orchestrators/attack-my-application/SKILL.md))
**fingerprints** the target, **selects** the skills whose preconditions the app
satisfies, **runs** them in kill-chain order (minimal-proof first), **verifies**
each finding against its paired blue skill, and produces a prioritized report —
behind a hard **authorization gate** it will not cross.

```bash
npx redblueskills attack https://staging.example.com     # prints the instruction
npx redblueskills attack --print                          # the full playbook
```

> ⚠️ It only assesses systems you own or are explicitly authorized to test. The
> authorization gate is non-negotiable and per-session.

## Use a single skill

**With an AI agent (e.g. Claude Code):** point the agent at a skill directory, or
copy the skill into your agent's skills path. The frontmatter `description` tells
the agent when to use it; the body tells it how.

**As a human:** each `SKILL.md` is a self-contained, reproducible runbook —
overview, authorization checklist, preconditions, numbered procedure, the paired
defense/offense, and how to validate it yourself.

Search the catalog by ATT&CK technique, risk level, or team:

```bash
jq '.skills[] | select(.techniques.attack[]? == "T1190")' catalog.json
jq '.skills[] | select(.team == "blue" and .stage == "detect") | .name' catalog.json
```

---

## Contribute

New skills are welcome — the bar is quality and pairing, not volume.

```bash
git clone https://github.com/Security-Environment/RedBlueSkills.git
cd RedBlueSkills
make install                       # dev deps into your environment
cp -r _template skills/web-app/red/initial-access/my-skill
# ...author SKILL.md per SKILL-SPEC.md...
make check                         # validate + catalog freshness + tests
```

The same `make check` gate runs in CI. A PR that adds offense without a paired
detection, skips its validation stamp, or breaks the schema will fail
automatically. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and
[`SKILL-SPEC.md`](SKILL-SPEC.md).

---

## Repository map

| Path | What it is |
|---|---|
| [`skills/`](skills/) | The skill library. |
| [`orchestrators/`](orchestrators/) | Multi-skill playbooks — home of `attack-my-application`. |
| [`bin/cli.js`](bin/cli.js) · [`package.json`](package.json) | The `redblueskills` npm CLI (`init` / `add` / `list` / `attack`). |
| [`site/`](site/) | The browsable website (static; reads `catalog.json`). |
| [`SKILL-SPEC.md`](SKILL-SPEC.md) | The frontmatter schema + body structure every skill follows. |
| [`_template/`](_template/) | Copy-to-start skeleton for a new skill. |
| [`tools/`](tools/) | Validator, catalog generator, tests. |
| [`_lab/`](_lab/) | Docker targets skills are validated against. |
| [`INDEX.md`](INDEX.md) / [`catalog.json`](catalog.json) | Generated catalog (human / machine). |
| [`ETHICS.md`](ETHICS.md) | Responsible-use policy. **Read first.** |
| [`GOVERNANCE.md`](GOVERNANCE.md) · [`SECURITY.md`](SECURITY.md) · [`CONTRIBUTING.md`](CONTRIBUTING.md) | How the project is run, reported to, and extended. |

## License

[Apache License 2.0](LICENSE). Content herein is provided for lawful, authorized
security testing and defense only.
