# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] — 2026-09-18

### Added
- Ten researched skills: JWT validation, file upload controls, and LLM artifact
  supply-chain assessment/hardening, plus webhook authenticity/replay controls,
  plus a reviewed CORS trust pair. The eight fixture-backed skills are
  paired and validated against the new
  `security-controls` fixture (21 tests with negative and positive controls).
- `redblueskills verify`, `--version`, and bundled `lab` commands. Actual packed
  npm installs are tested, including all offline labs and integrity-failure cases.

### Fixed
- Skill schema errors now produce diagnostics instead of crashes; all required
  sections, pairing types, and evidence dates are checked.
- Partial-install catalogs list only installed skills, ETHICS.md ships with
  installs, source-overlapping/symlink destinations are rejected, and missing
  destination arguments fail explicitly.
- MCP malformed requests return protocol errors, notifications receive no reply,
  and large catalog output drains before shutdown.
- The orchestrator covers new routes, respects source-review boundaries, and
  separates execution risk from vulnerability severity and missing telemetry.
- Removed the npm postinstall banner; package installation has no lifecycle side
  effects. Release gates test the packed package and regenerated provenance.

### Added
- **Four new red↔blue LLM pairs (8 skills), each validated end-to-end.** The
  `llm-ai` surface now covers nine OWASP LLM Top-10 2025 categories: added data &
  model poisoning (LLM04) ↔ training-data provenance, improper output handling
  (LLM05) ↔ output encoding, vector & embedding weaknesses (LLM08) ↔ vector-store
  isolation, and misinformation (LLM09) ↔ grounding verification.
- **Extended the `llm-local` lab from 10 to 20 assertions** — real runnable
  cross-tenant retrieval, HTML-sink injection, corpus poisoning, and ungrounded
  fabrication cases in `mock_llm.py`, so every new skill's `validated` stamp is
  re-provable with `make validate-labs`, not just asserted.

### Changed
- **Site visual system unified around the coverage-map language.** Removed the
  bolted-on glassmorphism, macOS terminal chrome, imported Dracula syntax palette,
  pill buttons, and hover-lift transforms that had drifted from the design system.
  Every surface now uses one panel primitive (opaque fill + a single `--line`
  hairline, two radii), and syntax/verdict colours come from the page's own
  red/blue/green/ink tokens. The impact panels read as `guess` (red edge) vs
  `proof` (green edge). Package-runner switcher install commands are documented in
  the README/Quickstart.

## [1.0.0] — 2026-08-10

First stable release. Every claim the library makes about itself is now generated
and verifiable: counts are derived from the catalog, the SBOM and provenance
manifest are content-hashed and signed at release, and validated skills are
re-provable on demand.

### Added
- **Supply-chain provenance.** New `tools/build_provenance.py` emits a CycloneDX
  1.5 SBOM (`sbom.cdx.json`) and a provenance manifest (`provenance.json`) that
  records, per skill, the SHA-256 of its `SKILL.md` and who validated it against
  which lab, when. Both are **deterministic** (no timestamps or clock-based UUIDs)
  and gated by `--check` in CI, and **signed at release with cosign keyless
  signing** plus a SLSA build-provenance attestation (`.github/workflows/provenance.yml`).
  Verification is documented in [`docs/provenance.md`](docs/provenance.md).
- **Dynamic badges, counts, and coverage heatmap — nothing hand-typed.**
  `tools/build_catalog.py` now generates shields.io endpoint badges
  (`site/badges/*.json`), a theme-aware surface × kill-chain heatmap
  (`site/coverage.svg`), and splices live totals into the README's managed
  `STATS` block. CI fails if any drift. Fixes the previously stale `skills-20`
  badge.
- **Lab-replay harness.** `tools/replay_labs.py` (+ `make validate-labs`)
  discovers every `_lab/*/validate.{sh,py}` and re-proves the self-contained labs
  (ci-local, llm-local) on each CI run — a `validated` stamp is now a claim you
  can re-run, not just trust.
- **MCP server (`bin/mcp.js`, `redblueskills-mcp`).** A dependency-free
  Model Context Protocol server over the library so agents can `list_skills`,
  `get_skill`, `search_skills`, `get_catalog`, and read `coverage` directly —
  no `init` copy step. Smoke-tested in CI.
- **Website**: a new **provenance** section (SBOM + manifest downloads, the
  coverage heatmap, and copy-paste `cosign verify-blob` / `make validate-labs`),
  plus a docs page for verification.

### Changed
- **`package.json` → 1.0.0**; ships `sbom.cdx.json`, `provenance.json`, and
  `COVERAGE.md`, and exposes the `redblueskills-mcp` binary. The npm-publish
  workflow now asserts the release tag matches the version and that the provenance
  artifacts are in the package.
- **README** de-hardcodes every count; totals come from generated badges and the
  managed stats table.

### Security
- **CLI path-traversal hardening.** `bin/cli.js` now refuses to copy any skill
  whose catalog path escapes the bundled `skills/` tree and never writes outside
  the chosen `--dest` — defense in depth against a tampered `catalog.json`.
- Confirmed no secrets are committed; `_lab/loot/`, lab keys, and `.env` remain
  git-ignored.

### Added (7th surface & OWASP completions, earlier in this cycle)
- **New `llm-ai` surface — the 7th — mapping the OWASP Top 10 for LLM
  Applications 2025 (5 new red↔blue pairs, 10 skills), all `validated`:** LLM01
  `llm-prompt-injection` ↔ `llm-prompt-injection-detection`, LLM02
  `llm-sensitive-info-disclosure` ↔ `llm-output-dlp`, LLM06 `llm-excessive-agency`
  ↔ `llm-agency-confinement`, LLM07 `llm-system-prompt-leakage` ↔
  `llm-system-prompt-hardening`, and LLM10 `llm-unbounded-consumption` ↔
  `llm-consumption-limits`. Mapped to MITRE ATLAS / ATT&CK / D3FEND and NIST
  SP 800-53 Rev 5.
- **`_lab/llm-local/` — a dependency-free stdlib-Python mock-LLM lab** (validation
  target `llm-local`). `mock_llm.py` runs a storefront-assistant app in `vuln` and
  `hardened` modes; `validate.py` asserts each of the 5 controls is exploitable on
  the vulnerable build and blocked on the hardened one (run
  `python3 _lab/llm-local/validate.py`). The library is now **120 skills across 7
  live surfaces, 57 validated**.
- **`attack-my-application` orchestrator is now surface-aware (v1.2.0):** Step 1
  classifies the target's `app_type` (web / api / cloud-native / ci-cd / mobile /
  network / llm-ai) and Step 2 gained an `llm-ai` routing table, so the
  orchestrator can drive an LLM-app assessment, not only a web one.
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

[Unreleased]: https://github.com/praneeth132006/RedBlueSkills/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/praneeth132006/RedBlueSkills/releases/tag/v0.1.0
