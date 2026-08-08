---
name: ci-third-party-governance-hardening
description: >-
  Govern third-party services in the CI/CD ecosystem against CICD-SEC-8. Use when
  bringing OAuth/GitHub Apps, marketplace actions/plugins, and SaaS connectors under
  control — maintaining an approved inventory, least-privileging each integration's
  scopes, pinning actions to full commit SHAs, removing unused/unmaintained
  integrations, and monitoring third-party access to repos, secrets, and pipelines.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1195.001, T1199]
  capec: [CAPEC-679]
  cwe: [CWE-829, CWE-1104]
  owasp: ["A08:2021"]
  d3fend: [D3-ACH, D3-EAL]
pairs_with: [ci-third-party-integration-abuse]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# CI/CD third-party governance hardening

## Overview

Every third-party service wired into CI/CD is an implicitly-trusted path into the
pipeline, so governance means treating that trust as an explicit, minimal, and
monitored grant. This skill brings third-party usage under control on four axes:
**inventory** (a known, approved list of every OAuth/GitHub App, integration, and
marketplace action, with an owner), **least privilege** (each integration scoped to
the minimum access it needs — no org-admin for a coverage badge), **integrity**
(marketplace actions/orbs/plugins pinned to full commit SHAs so a moved tag can't
inject backdoored code), and **lifecycle + monitoring** (unused and unmaintained
integrations removed, and third-party access logged and alerted). It removes the
ungoverned, over-privileged surface CICD-SEC-8 abuse depends on.

## Authorization & scope

Defensive governance of integrations in an org/pipeline you operate. Integration
inventories expose configuration and data flows — handle under your data-handling
policy. No active testing of third-party services or other orgs.

## Preconditions

- Admin access to the org/repo integration and OAuth-app settings and to pipeline
  definitions.
- The ability to require approval for new integrations and to pin/lock action
  versions.

## Procedure

1. **Build an approved inventory.** Enumerate every installed OAuth/GitHub App,
   authorized integration, and marketplace action/plugin referenced by pipelines;
   record owner, purpose, scopes, and last use. Require approval to add new ones.
2. **Least-privilege each integration.** Reduce granted scopes to the minimum
   (read-only where possible, single-repo not org, no secret access unless required);
   remove admin grants that exist only for convenience.
3. **Pin actions to full SHAs.** Replace mutable refs (`@v3`, `@main`) on third-party
   actions/orbs/plugins with full commit SHAs; adopt a review process for version
   bumps and prefer verified/first-party actions where equivalent.
4. **Vet before adoption.** For new third-party actions/services, check maintenance,
   ownership, permissions requested, and reputation before wiring them into a
   pipeline that holds secrets.
5. **Constrain data flows.** Ensure connectors that receive source or secrets
   (code-quality SaaS, notifications) only receive what they need, and prefer ones
   that support scoped, revocable tokens.
6. **Lifecycle and revoke.** Remove integrations that are unused, unmaintained, or no
   longer needed; rotate/revoke their credentials on removal and on incident.
7. **Monitor third-party access.** Log integration activity and alert on new
   integrations, scope escalations, and unusual access to repos/secrets by an
   installed app.

## Detection engineering notes

- **SHA-pinning third-party actions** is the highest-leverage integrity control — it
  turns "an upstream tag moved" from silent code execution into a reviewed change.
- An **approved inventory with owners** makes the ungoverned-sprawl problem tractable:
  anything not on the list, or with no owner, is a candidate for removal.

## Paired offense / defense

Pairs with **ci-third-party-integration-abuse**. Run that skill before and after
governance: it should first find over-scoped apps and unpinned actions reaching
sensitive resources, and afterward find a scoped, SHA-pinned, inventoried set with no
excess reach.

## Validation

Reproduce in a lab you own:

1. In a throwaway org, install a broadly-scoped test integration and reference a
   tag-pinned marketplace action; confirm the paired skill proves the over-reach and
   unpinned execution.
2. Scope the integration down, pin the action to a SHA, and remove the unused app.
3. Re-run the paired skill and confirm the ungoverned paths are closed.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-8 Ungoverned Usage of Third-Party
  Services
- OWASP: A08:2021 Software and Data Integrity Failures
- GitHub/GitLab App scope & approval controls; action/orb SHA-pinning; SLSA
- MITRE ATT&CK T1195.001, T1199; D3FEND D3-ACH (Application Configuration
  Hardening), D3-EAL (Executable Allowlisting); CAPEC-679; CWE-829, CWE-1104
