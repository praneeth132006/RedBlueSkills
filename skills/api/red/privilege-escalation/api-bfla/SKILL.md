---
name: api-bfla
description: >-
  Find and prove Broken Function Level Authorization (BFLA / API5:2023) in an API
  during an authorized test — reaching administrative or cross-role operations
  with a lower-privilege principal. Use when an endpoint or HTTP method performs a
  privileged action and you need to confirm role/function checks are missing.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1190, T1078]
  capec: [CAPEC-122]
  cwe: [CWE-285, CWE-862]
  owasp: ["A01:2021"]
  d3fend: []
pairs_with: [api-function-authorization-monitoring]
risk:
  level: high
  reversible: true
  data_touch: read-write
authorization: required
maturity: reviewed
license: Apache-2.0
---

# API Broken Function Level Authorization (BFLA)

## Overview

Where BOLA is about *which object*, BFLA is about *which operation*: a
low-privilege principal invoking a function reserved for admins or another role —
promoting a user, deleting any record, reading an internal report, or using an
HTTP method the UI never exposes. APIs are prone to it because roles and methods
multiply combinations and the client (mobile app, SPA) is the only thing "hiding"
the privileged calls. This skill confirms missing function-level checks with a
controlled low-privilege principal.

## Authorization & scope

**Run only against APIs you are explicitly authorized to test.** Use a
provisioned low-privilege account and, where possible, a test admin account to
confirm the intended-vs-actual boundary. Prove the flaw with a **reversible or
read-only** privileged call against **test objects you created**; if you must
demonstrate a state change (e.g. role change), do it to a test user and revert.
Never mass-delete or alter real records to prove access.

## Preconditions

- A low-privilege account/API key, and knowledge (schema, docs, or a captured
  admin session) of the privileged routes, methods, and role values.
- A request replayer that can swap tokens, methods, and route versions.

## Procedure

1. **Map privileged functions.** From the OpenAPI/GraphQL schema, admin console
   traffic, or naming conventions, list admin/role-gated operations
   (`/admin/*`, `/internal/*`, `DELETE /users/{id}`, `role: admin` mutations).
2. **Direct invocation.** With the low-privilege token, call each privileged
   endpoint:
   ```bash
   curl -s -X DELETE -H "Authorization: Bearer $LOW_TOKEN" \
        "https://TARGET/api/v2/admin/users/$TEST_USER_ID" -o /dev/null -w "%{http_code}\n"
   ```
   A `2xx` (or a success body) confirms BFLA.
3. **Method tampering.** Where `GET` is allowed but writes are role-gated, try
   `POST/PUT/PATCH/DELETE` and method-override headers (`X-HTTP-Method-Override`).
4. **Verb/route variants.** Probe alternate versions and shapes: `/v1` vs `/v2`,
   trailing slashes, case, and undocumented sibling routes that skip the guard.
5. **Role-claim reliance.** If the API authorizes from a client-supplied role
   header or unverified token claim, test whether flipping it grants the function
   (coordinate with `api-broken-authentication` when a forge path exists).
6. **Confirm intent.** Where a test admin account exists, compare its response to
   the low-privilege one to prove the endpoint is genuinely privileged, not just
   idempotent.
7. **Record** the operation, principal role, method, whether state changed, and
   the fix: enforce function-level authorization server-side per route+method,
   deny by default, and drive it from a verified server-side role — never the
   client.

## Paired defense / offense

Pairs with **api-function-authorization-monitoring**. Low-privilege principals
reaching admin/internal routes, and method-tampering against role-gated
operations, are the detection surface. When validating together, confirm the
monitoring flags the privileged call you make with the low-privilege token.

## Validation

Reproduce against **OWASP crAPI** in a lab:

1. Stand up crAPI and authenticate a standard (non-admin) user.
2. Invoke an administrative/mechanic operation (e.g. a privileged report or
   management action) with the standard user's token.
3. Confirm the privileged function executes for the low-privilege principal.

Promote to `validated` once the privileged invocation is reproduced and recorded.

## References

- OWASP API Security Top 10 — API5:2023 Broken Function Level Authorization
- OWASP: A01:2021 Broken Access Control
- MITRE ATT&CK T1190; T1078 Valid Accounts
- CWE-285 Improper Authorization; CWE-862 Missing Authorization
