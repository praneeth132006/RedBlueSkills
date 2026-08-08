---
name: cloud-serverless-hardening
description: >-
  Harden serverless functions against execution-role privilege escalation. Use when
  least-privileging AWS Lambda / GCP Cloud Functions / Azure Functions: scoping each
  function's execution role to only the resources and actions it needs, removing
  iam:PassRole and wildcard grants, separating who can deploy from what the function can
  do at runtime, scoping triggers, and monitoring role use.
version: 1.0.0
team: blue
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1078.004, T1651]
  capec: [CAPEC-122]
  cwe: [CWE-269, CWE-732]
  owasp: []
  d3fend: [D3-ACH, D3-DAM]
pairs_with: [cloud-serverless-privilege-abuse]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Cloud serverless hardening

## Overview

A serverless function's blast radius is its execution role, so hardening is about
making that role as small as the function's job and keeping the power to *change* the
function separate from the power the function *has*. This skill works on four axes:
**least-privilege roles** (one role per function, scoped to the exact resources and
actions it needs — no account-wide reach), **no escalation primitives** (remove
`iam:PassRole`, `iam:Put*Policy`, and wildcard `*` actions/resources from runtime
roles), **separation of duties** (the identity that deploys/updates function code is
distinct from the runtime role, so modify-permission doesn't become arbitrary
execution under a privileged identity), and **trigger + monitoring** (scope invocation
sources and alert on role use outside the function's purpose). It removes the
escalation paths the paired offense proves.

## Authorization & scope

Defensive configuration of serverless functions and IAM you operate. Role and policy
review exposes privileged configuration — handle under your data-handling policy. No
active testing of third-party accounts.

## Preconditions

- Admin access to the function configuration and the IAM roles/policies they use.
- An inventory of each function's legitimate resource and action needs.

## Procedure

1. **One least-privilege role per function.** Give each function a dedicated execution
   role scoped to the specific resources/actions it needs; avoid shared or
   account-wide roles.
2. **Remove escalation primitives.** Strip `iam:PassRole` (unless narrowly scoped to a
   specific, non-privileged role and required), `iam:Put*Policy`/`AttachRolePolicy`, and
   wildcard actions/resources from runtime roles; avoid admin managed policies.
3. **Separate deploy from runtime.** Ensure the CI/CD identity that can
   `UpdateFunctionCode`/deploy is distinct from the runtime execution role and cannot
   itself assume a privileged role; require review for function code/config changes.
4. **Scope triggers and inputs.** Restrict which sources can invoke each function
   (resource policies, event-source scoping) and validate/authorize inputs so a trigger
   can't drive privileged action.
5. **Constrain the runtime environment.** Set minimal timeouts/memory, avoid embedding
   long-lived secrets (use scoped, short-lived credentials / secret managers), and keep
   the metadata/credential surface minimal.
6. **Monitor role use.** Enable cloud audit logging for the function's role and alert on
   actions outside its normal set (see `cloud-audit-logging-detection`).
7. **Review continuously.** Periodically re-run access analysis / policy simulation and
   prune grants that are unused.

## Detection engineering notes

- **Separation of deploy vs. runtime identity** is the control most often missed —
  without it, "can update the function" quietly equals "can run anything as the
  function's role."
- Cloud **access analyzers / policy simulation** turn least-privilege from a one-time
  cleanup into a repeatable check that catches new `PassRole`/wildcard grants.

## Paired offense / defense

Pairs with **cloud-serverless-privilege-abuse**. Run that skill before and after: it
should first prove cross-resource reach and a modify-to-execute pivot, and afterward
find each function's role scoped to its job with no escalation primitives and deploy
separated from runtime.

## Validation

Reproduce in a scoped test account you own:

1. Start from a function with a wildcard/`PassRole` runtime role; confirm the paired
   skill proves out-of-scope reach and the modify-to-execute pivot.
2. Scope the role, remove `PassRole`/wildcards, and separate the deploy identity from
   the runtime role.
3. Re-run the paired skill and confirm the escalation paths are closed while the
   function still performs its task.

## References

- AWS Lambda / GCP Cloud Functions / Azure Functions least-privilege & execution-role
  docs; cloud access-analyzer / policy-simulation guidance
- MITRE ATT&CK T1078.004, T1651; MITRE D3FEND D3-ACH (Application Configuration
  Hardening), D3-DAM (Domain Account Monitoring)
- CAPEC-122; CWE-269, CWE-732
