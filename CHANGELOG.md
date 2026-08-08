# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **`ci-cd` completed to the full OWASP CI/CD Top 10 — 5 new red↔blue pairs
  (10 skills)** covering the previously-missing risks: CICD-SEC-1
  `ci-flow-control-abuse` ↔ `ci-flow-control-hardening`, CICD-SEC-2
  `ci-identity-privilege-abuse` ↔ `ci-identity-access-hardening`, CICD-SEC-5
  `ci-pbac-abuse` ↔ `ci-pbac-hardening`, CICD-SEC-8
  `ci-third-party-integration-abuse` ↔ `ci-third-party-governance-hardening`, and
  CICD-SEC-10 `ci-logging-evasion` ↔ `ci-audit-logging-detection`. The `ci-cd`
  surface now spans CICD-SEC-1…10 (20 skills).
- **`mobile` completed to the full OWASP Mobile Top 10 (2024) — 5 new red↔blue
  pairs (10 skills)** covering the previously-missing categories: M2
  `mobile-supply-chain-tampering` ↔ `mobile-supply-chain-hardening`, M6
  `mobile-privacy-exposure` ↔ `mobile-privacy-hardening`, M7
  `mobile-binary-tampering` ↔ `mobile-binary-protection-hardening`, M8
  `mobile-security-misconfiguration` ↔ `mobile-misconfiguration-hardening`, and M10
  `mobile-weak-cryptography` ↔ `mobile-cryptography-hardening`. The `mobile` surface
  now spans M1–M10 (20 skills).
- **`cloud-native` + `network` deepened — 4 new red↔blue pairs (8 skills):**
  `cloud-serverless-privilege-abuse` ↔ `cloud-serverless-hardening` (execution-role
  privilege escalation), `cloud-logging-tamper` ↔ `cloud-audit-logging-detection`
  (T1562.008 audit-trail tampering), `network-remote-access-abuse` ↔
  `network-remote-access-hardening` (T1133 external remote services), and
  `network-egress-exfiltration` ↔ `network-egress-filtering-hardening` (T1048/T1071
  exfil & C2 over permitted channels). Both surfaces now sit at 14 skills.
  - Repo total: **110 skills, all reciprocally paired**; `make check` green.
- **`_lab/ci-local/`** — a dependency-free (git + bash, no Docker/cloud) CI/CD
  validation lab. `bash _lab/ci-local/validate.sh` runs each control in a vulnerable
  and a hardened configuration and asserts the attack succeeds then is blocked
  (6/6). It is the `validation.target` (`ci-local`) that promotes **3 ci-cd pairs to
  `maturity: validated`**: `ci-flow-control-*` (CICD-SEC-1, `pre-receive`
  protected-branch hook), `ci-pbac-*` (CICD-SEC-5, per-job secret scoping), and
  `ci-logging-evasion` / `ci-audit-logging-detection` (CICD-SEC-10, out-of-band
  append-only audit sink). The other 22 new skills remain `maturity: reviewed`
  (they require a hosted SCM/cloud/mobile plane no in-repo lab provides), each with a
  reproducible `## Validation` section. Validated skills repo-wide: **47**.
- **`api` vertical — 6 red↔blue pairs (12 skills)** across OWASP API Security
  Top 10 #1–5: `api-bola` ↔ `api-bola-detection`, `api-broken-authentication` ↔
  `api-authentication-monitoring`, `api-bfla` ↔ `api-function-authorization-monitoring`,
  `api-mass-assignment` ↔ `api-mass-assignment-hardening`, `api-excessive-data-exposure`
  ↔ `api-data-exposure-monitoring`, and `api-unrestricted-resource-consumption` ↔
  `api-rate-limit-hardening`.
  - **9 of the 12 are `validated`** end-to-end against a live **OWASP crAPI** lab
    (all 6 red skills, proven by running the attack; and the 3 blue detections,
    proven by running the detection logic over the real paired-attack traffic).
    Each skill's `## Validation` section records the concrete observation.
  - **3 remain `reviewed`** with the blocker documented in-skill:
    `api-function-authorization-monitoring` needs role-enriched access logs crAPI
    does not emit by default, and the two hardening skills
    (`api-mass-assignment-hardening`, `api-rate-limit-hardening`) can only be
    validated by applying the fix to a target you can rebuild.
- **`_lab/crapi/`** — the OWASP crAPI stack vendored as the `api` vertical's
  validation target (served on `localhost:8888`); documented in `_lab/README.md`.
- **Self-contained website** — every `SKILL.md` and repo doc is bundled into
  `site/content.json` (`tools/build_site_content.py`) and rendered in-page by a
  dependency-free reader (`site/reader.js`) at `#/skill/<name>`, `#/doc/<id>`, and
  `#/docs`; browsing no longer links out to GitHub. New "Graphite" theme with a
  Syne / Space Grotesk / Space Mono type system. `make site` builds and serves it;
  CI fails if the bundle is stale.

### Removed
- **GitHub Pages deploy workflow** (`.github/workflows/pages.yml`) — Pages was never
  enabled on the repo, so every push produced a failed deployment. The site is a
  plain static directory served with `make site`.

### Added (earlier in this cycle)
- **`QUICKSTART.md`** — a 5-minute, no-jargon path from install to a security report.
- **`docs/`** — an end-user documentation set:
  - `docs/orchestrator.md` — the `attack-my-application` orchestrator explained
    stage by stage, with the surface × technique matrix and a sample transcript.
  - `docs/examples/` — full walkthroughs on real stacks: Flask, Node/Express, Rails.
  - `docs/adding-a-skill.md` — contributor guide: skill anatomy, the red/blue split
    against a real pair, an add-a-pair walkthrough, and every CI gate documented.
- **`SKILL-TEMPLATE.md`** — a discoverable, copy-paste starter for new skills.
- **CLI**: `redblueskills quickstart` prints the getting-started guide; `init` now
  points new users to it. `QUICKSTART.md`, `docs/`, and `SKILL-TEMPLATE.md` ship in
  the npm package.

### Changed
- **Orchestrator** (`attack-my-application`, → v1.1.0): documents the surface ×
  technique matrix, and the report now includes a per-screen risk roll-up and a
  technique coverage roll-up.
- **Website** upgraded to a full landing experience: quickstart, a browsable
  catalog (team filters + technique search + show-all), the surface × technique
  matrix, real-stack example cards, a sample-report preview, and a contribute
  section — all on the existing "Obsidian Aurora" design system.
- **README** now opens with a Getting-started map linking the new docs.

## [0.1.0] — 2026-07-20

Initial public release. Establishes the framework and the first vertical.

### Added
- **SKILL spec** (`SKILL-SPEC.md`): frontmatter schema and body structure for all
  skills, with risk labels, provenance, and red↔blue pairing.
- **Tooling**: `validate.py` (schema + bidirectional pairing enforcement),
  `build_catalog.py` (`catalog.json` + `INDEX.md`), and a pytest suite.
- **`web-app` vertical** — three validated red↔blue pairs:
  - `web-http-fingerprinting` ↔ `web-security-headers`
  - `web-sql-injection` ↔ `web-sqli-detection`
  - `web-reflected-xss` ↔ `web-xss-detection`
- **Lab** (`_lab/`) with docker targets for validation.
- **Governance & safety**: `ETHICS.md`, `GOVERNANCE.md`, `SECURITY.md`,
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
- **CI** running the full validation + test gate on every push and PR.

[Unreleased]: https://github.com/Security-Environment/RedBlueSkills/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Security-Environment/RedBlueSkills/releases/tag/v0.1.0
