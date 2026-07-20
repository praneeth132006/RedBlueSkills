# Security policy

## Reporting a vulnerability in this project

If you find a security issue in the **tooling** (`tools/`, CI workflows) or the
repository infrastructure, please report it privately:

- Use GitHub's **[Report a vulnerability](https://github.com/Security-Environment/RedBlueSkills/security/advisories/new)**
  (Security → Advisories) to open a private advisory, **or**
- Open a minimal issue asking a maintainer to contact you, without disclosing
  details publicly.

Please do **not** file public issues for exploitable defects in the tooling until
a fix is available. We aim to acknowledge within 5 business days.

## Reporting a problem with a skill

Skills are dual-use by nature. Report via a normal issue if a skill:

- Contains an error that makes a defensive detection ineffective,
- Includes content that violates [`ETHICS.md`](ETHICS.md) (e.g. a payload whose
  only purpose is harm, or live secrets/real target data), or
- Is out of date / no longer validates against its target.

Maintainers will remove or revise content that breaches the responsible-use
standards.

## Scope

This repository ships **knowledge and small validation tooling**, not a running
service. There is no production system to attack here. The most sensitive assets
are the CI pipeline and the integrity of skill content — both are in scope for
reports above.

## Supported versions

The `main` branch is the supported version. Skills carry their own semver in
frontmatter; `stale` skills (validation older than 6 months) are flagged by CI
and should be treated as unverified until re-validated.
