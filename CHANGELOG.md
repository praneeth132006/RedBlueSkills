# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **`api` vertical — 6 red↔blue pairs (12 skills)** across OWASP API Security
  Top 10 #1–5: `api-bola` ↔ `api-bola-detection`, `api-broken-authentication` ↔
  `api-authentication-monitoring`, `api-bfla` ↔ `api-function-authorization-monitoring`,
  `api-mass-assignment` ↔ `api-mass-assignment-hardening`, `api-excessive-data-exposure`
  ↔ `api-data-exposure-monitoring`, and `api-unrestricted-resource-consumption` ↔
  `api-rate-limit-hardening`. Authored at `reviewed` maturity; they promote to
  `validated` once reproduced against a live API lab (OWASP crAPI).
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
