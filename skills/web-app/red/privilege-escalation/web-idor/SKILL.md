---
name: web-idor
description: >-
  Find and prove insecure direct object reference / broken object-level
  authorization (BOLA) in a web application during an authorized assessment. Use
  when an identifier in a request selects a record and you need to confirm you
  can access or modify objects belonging to another user or tenant.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1190, T1548]
  capec: [CAPEC-180]
  cwe: [CWE-639, CWE-284]
  owasp: ["A01:2021"]
  d3fend: []
pairs_with: [web-access-control-monitoring]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web IDOR / broken object-level authorization

## Overview

IDOR/BOLA occurs when the application selects a resource from a client-supplied
identifier without verifying the caller is authorized for *that specific object*.
This skill uses two controlled accounts to prove horizontal access (peer's data)
and, where relevant, vertical access (admin-only objects), with read-only proof
by default and careful, reversible checks for write access.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Use test
accounts provisioned for the engagement. Prove cross-user access with a **single
non-sensitive field** from account B while authenticated as account A; do not
enumerate or download other users' real PII at scale. If you test write/modify
access, make a reversible change to a test object and restore it.

## Preconditions

- Two (or more) accounts you control, ideally in different tenants/roles, plus
  their object identifiers (IDs, UUIDs, filenames, account numbers).
- A proxy or scripting to replay requests swapping identifiers and session tokens.

## Procedure

1. **Map object references.** As account A, exercise the app and record every
   request that carries an identifier (`/api/orders/1023`, `?userId=`, GUIDs in
   bodies, JWT `sub` claims, filenames).
2. **Cross-account read.** While authenticated as A, request B's object id:
   ```bash
   # A's session token, B's object id
   curl -s -H "Authorization: Bearer $A_TOKEN" https://TARGET/api/orders/$B_ORDER_ID
   ```
   A `200` returning B's data confirms horizontal IDOR.
3. **Test predictability.** Sequential/guessable ids (increment/decrement) widen
   impact; random UUIDs may still be IDOR if they leak elsewhere (in listings,
   emails, referrers).
4. **Vertical check.** Attempt admin-only object endpoints with a low-privilege
   token to detect missing function-level authorization.
5. **Write access (careful).** If in scope, attempt a reversible modification to
   *your own or a test* object via another user's endpoint pattern, then restore.
6. **Prove impact minimally.** One confirmed cross-account read (one field) plus
   the predictability assessment is enough; avoid mass enumeration.
7. **Record** the endpoint, the identifier that crossed the boundary, whether it
   was read or write, and remediation (enforce per-object ownership checks
   server-side on every request; don't rely on unguessable ids alone).

## Paired defense / offense

Pairs with **web-access-control-monitoring**. Authorization failures that *should*
have occurred but didn't, one session touching many distinct object ids in a short
window, and access to ids outside a user's normal set are the detection surface.
When validating together, confirm the monitoring flags the cross-account access
pattern you generate.

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. `cd _lab && docker compose up -d juice-shop`.
2. Register two accounts. As user A, call the basket/order API with user B's id.
3. Confirm A can read B's object (e.g. basket contents) — a horizontal IDOR —
   and note whether ids are sequential.

## References

- OWASP: API1:2023 Broken Object Level Authorization; A01:2021 Broken Access Control
- MITRE ATT&CK T1548 — Abuse Elevation Control Mechanism
- CWE-639 — Authorization Bypass Through User-Controlled Key
- PortSwigger Web Security Academy — Access control vulnerabilities
