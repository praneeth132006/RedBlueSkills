---
name: cloud-serverless-privilege-abuse
description: >-
  Demonstrate serverless-function privilege escalation during an authorized cloud
  assessment — abusing an over-permissioned execution role (AWS Lambda, GCP Cloud
  Functions, Azure Functions) to reach resources far beyond the function's purpose,
  or turning the ability to modify a function's code/config into execution under that
  role. Use when a function's identity grants broad IAM (`iam:PassRole`, wildcard
  actions, admin) so code running in the function pivots into the wider cloud account.
version: 1.0.0
team: red
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1078.004, T1651]
  capec: [CAPEC-122]
  cwe: [CWE-269, CWE-732]
  owasp: []
  d3fend: []
pairs_with: [cloud-serverless-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Cloud serverless privilege abuse

## Overview

A serverless function runs with an execution role/identity, and that role is where the
privilege lives — not the function's small purpose. When the role is over-permissioned
(wildcard `*` actions, `iam:PassRole` to a privileged role, `iam:PutRolePolicy`,
admin-equivalent managed policies), two escalation paths open: **execution-to-account**,
where code running inside the function (reached via a legitimate trigger, an injection
flaw, or a config change you can make) uses the role to act across the account; and
**config-to-execution**, where the ability to update the function's code or environment
turns modify-permission into arbitrary execution under a more privileged role. This
skill proves, on a cloud account you are authorized to test, that a function's identity
reaches resources it should not — using read-only enumeration and inert markers.

## Authorization & scope

**Run only against a cloud account and functions you are authorized to test.** Prove
reach with read-only, non-mutating calls (`sts get-caller-identity`, `list`/`describe`,
IAM policy simulation); do **not** create/modify IAM, delete data, or persist. Any
config-to-execution demonstration must deploy a **benign marker** function in a scoped
test account you own and be torn down. Emit non-reversible proof (identity, resource
counts) rather than data. Report over-permissioned roles promptly.

## Preconditions

- A function or its execution role in scope, and permission to enumerate the role's
  effective permissions.
- For the config-to-execution path, permission to deploy/update a test function in a
  throwaway account.

## Procedure

1. **Identify the execution identity.** Determine the role/identity the function runs
   as and confirm it from within a benign invocation:
   ```bash
   aws sts get-caller-identity        # who does this function act as?
   ```
2. **Enumerate effective permissions (read-only).** Resolve what the role can do and
   look for escalation primitives:
   ```bash
   aws iam list-attached-role-policies --role-name <fn-role>
   aws iam simulate-principal-policy --policy-source-arn <role-arn> \
     --action-names iam:PassRole iam:PutRolePolicy sts:AssumeRole s3:GetObject
   ```
3. **Flag escalation primitives.** Note `iam:PassRole` (+ a service that accepts a
   privileged role), `iam:Put*Policy`/`AttachRolePolicy`, `lambda:UpdateFunctionCode`
   on a privileged function, wildcard actions/resources, and admin managed policies.
4. **Prove cross-resource reach (safely).** With a single read-only call, show the role
   reaches a resource outside the function's purpose (list an unrelated bucket, describe
   another service) — then stop.
5. **Demonstrate config-to-execution (own test account).** In a throwaway account, show
   that update-code/config permission on a function with a privileged role lets you run
   a benign marker under that role — proving the modify→execute pivot.
6. **Record** the role, its excess permissions and escalation primitives, the reachable
   resources, and the fix: least-privilege the execution role per function, remove
   `PassRole`/wildcards, separate deploy permission from the runtime role, and scope
   triggers.

## Paired defense / offense

Pairs with **cloud-serverless-hardening**. The over-scoped roles, `PassRole`/wildcard
grants, and modify-to-execute paths this skill surfaces are exactly what that skill
removes — least-privilege per-function roles and a separation between who can deploy and
what the function can do.

## Validation

Reproduce in a scoped test account you own:

1. Deploy a function whose execution role has a wildcard/`PassRole` policy beyond its
   need.
2. From a benign invocation, enumerate the role and prove reach to an unrelated
   resource; show update-code lets a marker run under the privileged role.
3. Apply the paired hardening (scope the role, drop `PassRole`/wildcards, split deploy
   vs. runtime) and confirm the out-of-scope reach and modify-to-execute pivot are gone
   while the function still works.

## References

- AWS Lambda / GCP Cloud Functions / Azure Functions execution-role & least-privilege
  docs; cloud IAM privilege-escalation research (`iam:PassRole`, policy-write paths)
- MITRE ATT&CK T1078.004 Cloud Accounts, T1651 Cloud Administration Command; MITRE
  D3FEND (see paired skill)
- CAPEC-122; CWE-269, CWE-732
