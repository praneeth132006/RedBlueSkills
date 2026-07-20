# RedBlueSkills

**Agent-native, validated security skills for red teams and blue teams — paired offense and defense, risk-labeled, and proven before merge.**

[![Validate](https://github.com/Security-Environment/RedBlueSkills/actions/workflows/validate.yml/badge.svg)](https://github.com/Security-Environment/RedBlueSkills/actions/workflows/validate.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-6-informational)](INDEX.md)

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

## Browse the library

See **[INDEX.md](INDEX.md)** for the full catalog (auto-generated), or
[`catalog.json`](catalog.json) for a machine-readable feed.

Skills are organized by **application type → team → kill-chain stage**:

```
skills/web-app/
├── red/                        # offense
│   ├── recon/web-http-fingerprinting/
│   └── initial-access/
│       ├── web-sql-injection/
│       └── web-reflected-xss/
└── blue/                       # defense
    ├── detect/
    │   ├── web-sqli-detection/     ⟷ pairs with web-sql-injection
    │   └── web-xss-detection/      ⟷ pairs with web-reflected-xss
    └── harden/web-security-headers/  ⟷ pairs with web-http-fingerprinting
```

**v1 ships the `web-app` vertical, deeply.** It is the reference implementation
for every future surface (`api`, `cloud-native`, `mobile`, `network`, `ci-cd`) —
each will follow the same schema, tooling, and pairing discipline.

---

## Use a skill

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
