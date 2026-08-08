---
name: ci-identity-access-hardening
description: >-
  Harden CI/CD identity & access management against CICD-SEC-2. Use when
  right-sizing the non-human identities across the pipeline ecosystem — pipeline
  tokens, service accounts, bots, PATs, registry creds, OIDC roles — to
  least-privilege and per-job scope, replacing long-lived stored secrets with
  short-lived federated identity, eliminating shared admin accounts, and rotating and
  de-provisioning stale credentials.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1078, T1098.001]
  capec: [CAPEC-122]
  cwe: [CWE-269, CWE-732]
  owasp: ["A01:2021"]
  d3fend: [D3-ACH, D3-DAM]
pairs_with: [ci-identity-privilege-abuse]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# CI/CD identity & access hardening

## Overview

The identities a pipeline acts as are the blast radius of any pipeline compromise,
so the defense is to make each one as small and short-lived as possible. This skill
right-sizes CI/CD IAM on four axes: **least privilege** (each identity grants only
what its job needs — single-repo not org-wide, read not write, one resource not all),
**per-job scope** (no single shared identity spanning many pipelines), **ephemerality**
(short-lived OIDC-federated tokens instead of long-lived stored secrets), and
**hygiene** (routine rotation, and de-provisioning of stale/unused identities). It
removes the excess that CICD-SEC-2 abuse depends on.

## Authorization & scope

Defensive configuration of identities and access you own across SCM, CI, registry,
and cloud. Enumerating grants may expose privileged configuration — handle under
your data-handling policy. No active testing of third-party systems.

## Preconditions

- Admin access to the IAM of each system in the pipeline ecosystem (SCM, CI,
  registry, cloud).
- An inventory of every non-human identity a pipeline can use and its current
  permissions.

## Procedure

1. **Inventory non-human identities.** Enumerate pipeline tokens, service accounts,
   bots, machine PATs, registry credentials, and OIDC roles; note where each is used
   and what it can do today.
2. **Least-privilege each identity.** Reduce every grant to the job's actual need:
   default the pipeline token to read-only and add scopes per-job; scope cloud roles
   to specific resources/actions; give registry creds pull-only unless a job
   publishes.
3. **Scope per pipeline/job.** Replace shared cross-pipeline identities with
   per-repo/per-environment ones so a foothold in one job cannot act as another.
   Eliminate shared admin bots.
4. **Prefer short-lived federated identity.** Replace long-lived stored cloud/registry
   secrets with OIDC federation (GitHub/GitLab → AWS/GCP/Azure) so jobs assume a
   scoped role for the run and hold no durable secret.
5. **Rotate and de-provision.** Rotate any remaining long-lived credentials on a
   schedule; remove identities and tokens with no recent use; revoke on contributor
   offboarding.
6. **Constrain OIDC trust.** Scope cloud trust policies to the specific
   repo/branch/environment (subject claims), not the whole org, so only the intended
   pipeline can assume the role.
7. **Audit access.** Review effective permissions periodically and alert on new broad
   grants, new long-lived credentials, and identities used from unexpected pipelines.

## Detection engineering notes

- **Short-lived OIDC with a narrowly-scoped trust policy** is the single biggest win:
  it removes both the standing secret and the cross-pipeline reach at once.
- Track **credential age and last-use**: unrotated long-lived secrets and unused
  identities are the recurring root cause and are cheap to alert on.

## Paired offense / defense

Pairs with **ci-identity-privilege-abuse**. Run that skill before and after: it
should first enumerate over-scoped, shared, or stale identities reaching out-of-scope
resources, and after hardening find each identity scoped to its job with no
cross-boundary reach.

## Validation

Reproduce in a lab you own:

1. Start from an over-scoped runner role and an org-scoped SCM token; confirm the
   paired skill proves out-of-scope reach.
2. Scope the role/token to the job, switch to short-lived OIDC with a branch-scoped
   trust policy, and remove any shared bot.
3. Re-run the paired skill and confirm no out-of-scope reach remains while the job's
   legitimate task still succeeds.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-2 Inadequate Identity and Access
  Management
- OWASP: A01:2021 Broken Access Control
- OIDC federation for CI/CD; cloud least-privilege role and trust-policy guidance
- MITRE ATT&CK T1078, T1098.001; D3FEND D3-ACH (Application Configuration
  Hardening), D3-DAM (Domain Account Monitoring); CAPEC-122; CWE-269, CWE-732
