---
name: ci-third-party-integration-abuse
description: >-
  Demonstrate Ungoverned Usage of Third-Party Services (CICD-SEC-8) during an
  authorized assessment — abusing the broad, unaudited access granted to third-party
  apps, OAuth integrations, marketplace actions/plugins, and SaaS connectors wired
  into the CI/CD ecosystem. Use when an external integration holds standing
  repo/org/pipeline permissions (an OAuth/GitHub App, a CI marketplace action, a
  code-quality or deploy SaaS) so compromising or impersonating that integration
  grants an attacker access without ever touching a first-party credential.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1195.001, T1199]
  capec: [CAPEC-679]
  cwe: [CWE-829, CWE-1104]
  owasp: ["A08:2021"]
  d3fend: []
pairs_with: [ci-third-party-governance-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# CI/CD third-party integration abuse

## Overview

Modern CI/CD is stitched together from third-party services — OAuth apps and GitHub/
GitLab Apps, marketplace Actions and pipeline plugins, code-quality and coverage
SaaS, deploy and notification connectors. Each is granted standing access to the
repo, org, or pipeline, and that access is rarely inventoried, scoped, or reviewed.
**Ungoverned third-party usage** is the risk that this sprawling, over-privileged,
implicitly-trusted surface becomes the way in: a compromised or malicious
integration (or a marketplace action pinned to a moving tag that gets backdoored)
executes in the pipeline or reads its secrets with fully legitimate permissions. This
skill inventories the third-party access in a CI/CD environment you are authorized to
test and proves that a single integration's access reaches sensitive resources — via
its granted scope, not a stolen first-party secret.

## Authorization & scope

**Run only against an org/repo/pipeline you are authorized to test.** Enumerate
integrations and prove *reach* with read-only calls (list scopes, list what an app
can access); do **not** install new integrations against a real org, backdoor a real
action, or exfiltrate data through a connector. If demonstrating a malicious-action
scenario, do it with a benign marker action in a throwaway repo you own. Report
over-scoped or unmaintained integrations promptly.

## Preconditions

- Permission to enumerate the third-party apps, OAuth grants, and marketplace
  actions/plugins configured in the target org/repo/pipeline.
- A throwaway repo you control for any active marketplace-action demonstration.

## Procedure

1. **Inventory third-party access.** Enumerate installed OAuth/GitHub Apps, authorized
   third-party integrations, and their granted scopes; list marketplace actions/
   plugins referenced by pipelines and how they are pinned (tag vs. SHA).
2. **Rank by blast radius.** For each integration, note its permissions (repo read/
   write, org admin, secret access, deploy) and whether it is actively maintained and
   still needed.
3. **Probe unpinned actions.** Identify marketplace actions pinned to a mutable ref
   (`@v3`, `@main`) rather than a full commit SHA — a supply-chain foothold, because
   the ref can be repointed to backdoored code that then runs with the pipeline's
   secrets.
4. **Prove integration reach (safely).** For an over-scoped integration you control,
   show — read-only — that its token reaches sensitive resources (list private repos,
   `whoami` with its scopes); for the unpinned-action risk, in a throwaway repo run a
   benign marker action to show third-party code executing with pipeline context.
5. **Check exfil channels.** Note connectors (notifications, code-quality SaaS) that
   receive source or secrets and whether that flow is governed.
6. **Record** each integration as (service, scopes, maintained?, needed?, pin type,
   data it receives) and the fix: inventory and approve integrations, least-privilege
   their scopes, pin actions to full SHAs, remove unused apps, and monitor
   integration activity.

## Paired defense / offense

Pairs with **ci-third-party-governance-hardening**. The over-scoped apps, unpinned
actions, and ungoverned connectors this skill surfaces are exactly what that skill
brings under control — an approved inventory, least-privilege scopes, SHA-pinned
actions, and monitoring of third-party access.

## Validation

Reproduce in a lab you own:

1. In a throwaway org/repo, install a test integration with broad scope and reference
   a marketplace action pinned to a mutable tag.
2. Show the integration's token reaching resources beyond its need, and a benign
   marker action executing with pipeline secrets.
3. Apply the paired hardening (scope the integration down, pin the action to a SHA,
   remove the unused app) and confirm the over-reach and unpinned execution paths are
   closed.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-8 Ungoverned Usage of Third-Party
  Services
- OWASP: A08:2021 Software and Data Integrity Failures
- GitHub/GitLab App & OAuth scope docs; action/orb pinning to full commit SHA; SLSA
- MITRE ATT&CK T1195.001 Supply Chain: Software Dependencies/Tools, T1199 Trusted
  Relationship; CAPEC-679; CWE-829, CWE-1104
