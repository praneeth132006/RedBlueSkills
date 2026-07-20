# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
