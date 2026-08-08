---
name: ci-identity-privilege-abuse
description: >-
  Demonstrate Inadequate Identity & Access Management (CICD-SEC-2) during an
  authorized assessment — abusing over-permissioned, stale, or poorly-governed
  identities across the CI/CD ecosystem (SCM, CI platform, registry, cloud) to reach
  resources far beyond a job's legitimate need. Use when a pipeline token, service
  account, bot/machine identity, personal access token, or OIDC role grants broad or
  cross-project access, so a foothold in one pipeline escalates to others, to the
  registry, or into the cloud.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1078, T1098.001]
  capec: [CAPEC-122]
  cwe: [CWE-269, CWE-732]
  owasp: ["A01:2021"]
  d3fend: []
pairs_with: [ci-identity-access-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# CI/CD identity privilege abuse

## Overview

CI/CD is a dense web of non-human identities — pipeline tokens, bot accounts,
service accounts, machine PATs, registry credentials, and OIDC-federated cloud roles
— and they are routinely over-scoped: a job that only needs to read one repo holds
org-wide write; a runner's cloud role can touch every bucket; a shared bot is admin
everywhere. **Inadequate IAM** is the accumulation of these excess grants plus stale
and unrotated credentials. This skill maps the identities a pipeline can act as,
enumerates their *effective* permissions, and proves — on a target you are
authorized to test — that a foothold in one job reaches resources it should never
touch (another project, the registry, cloud storage), using read-only proof, not
destructive action.

## Authorization & scope

**Run only against identities and resources you are authorized to test.** Enumerate
and prove *reach* with read-only, non-mutating calls (list/describe/whoami); do
**not** create users, alter grants, delete data, or move laterally into out-of-scope
systems. Emit non-reversible proof (a resource *count*, an identity name, an
authenticated `whoami`) rather than exfiltrating data. Report over-scoped or stale
credentials promptly so they can be reduced or rotated.

## Preconditions

- A pipeline/job you can influence in scope, and permission to enumerate the
  permissions of the identities it can assume.
- Read access to the CI, SCM, registry, and cloud APIs for the enumeration calls.

## Procedure

1. **Enumerate identities.** List every identity the pipeline can act as: the
   default pipeline token, configured service accounts, stored PATs/registry creds,
   and any OIDC-assumable cloud role. Note which are shared across pipelines.
2. **Resolve effective permissions.** For each, query what it can actually do
   (read-only):
   ```bash
   # cloud role reachable from the runner (read-only identity check)
   aws sts get-caller-identity
   aws iam list-attached-role-policies --role-name <runner-role>   # scope, not use
   # SCM token scope
   curl -sI -H "authorization: Bearer $TOKEN" https://api.github.com/ | grep -i x-oauth-scopes
   ```
3. **Find the excess.** Compare effective permissions against the job's legitimate
   need: org-wide vs. single-repo, write vs. read, cross-project registry push,
   cloud access to unrelated resources, admin on a shared bot.
4. **Prove cross-boundary reach (safely).** With a single read-only call, show the
   identity reaches a resource outside the job's scope — list another project's
   protected data's *metadata*, `whoami` against the registry, or enumerate an
   unrelated bucket — then stop.
5. **Check hygiene.** Identify stale identities (no recent use), never-rotated
   long-lived credentials, and secrets shared across many pipelines (blast radius if
   one leaks).
6. **Record** each identity as (where used, effective permissions, legitimate need,
   excess, stale?/shared?), and the fix: least-privilege and per-job scoping,
   short-lived OIDC over stored secrets, no shared admin bots, and routine rotation
   and de-provisioning.

## Paired defense / offense

Pairs with **ci-identity-access-hardening**. Every excess grant, shared bot, and
stale credential this skill surfaces is what that skill removes — right-sizing each
identity, replacing long-lived secrets with short-lived federated ones, and
de-provisioning what is unused.

## Validation

Reproduce in a lab you own:

1. Configure a pipeline whose runner assumes a deliberately over-scoped cloud role
   (e.g. broad read across resources) and holds an org-scoped SCM token.
2. From a job, run read-only identity/permission enumeration and show the token/role
   reaches resources outside the job's need.
3. Apply the paired hardening (scope the role/token to just this job, switch to
   short-lived OIDC) and confirm the out-of-scope reach is gone while the job's own
   task still succeeds.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-2 Inadequate Identity and Access
  Management
- OWASP: A01:2021 Broken Access Control
- Cloud OIDC federation for CI (GitHub/GitLab → AWS/GCP/Azure); least-privilege
  service-account guidance
- MITRE ATT&CK T1078 Valid Accounts, T1098.001 Additional Cloud Credentials;
  CAPEC-122; CWE-269, CWE-732
