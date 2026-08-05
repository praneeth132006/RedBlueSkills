---
name: web-access-control-monitoring
description: >-
  Detect broken access control — IDOR/BOLA and missing function-level checks —
  against a web application from authorization decisions, access logs, and
  object-reference patterns. Use when building access-control detections,
  triaging suspected unauthorized data access, or hunting for enumeration.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1190, T1548]
  capec: [CAPEC-180]
  cwe: [CWE-639, CWE-284]
  owasp: ["A01:2021"]
  d3fend: [D3-UBA]
pairs_with: [web-idor]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web access-control monitoring

## Overview

Broken object-level and function-level authorization is hard to signature because
each request looks well-formed — the flaw is *who* is allowed to make it. This
skill detects it behaviourally: bursts of distinct object ids touched by one
session, access to ids outside a user's normal set, sequential-id enumeration, and
denied-then-allowed patterns. It depends on the app emitting authorization
decisions and stable subject/object identifiers into logs.

## Authorization & scope

Passive analysis of telemetry from systems you operate. Access logs tie users to
the objects they viewed — treat as sensitive. Do not replay observed requests.

## Preconditions

- Application/access logs that include the authenticated subject (user/tenant id)
  and the object identifier per request; ideally explicit authorization-decision
  events (allow/deny).
- A SIEM for aggregation.

## Procedure

1. **Enumeration by one subject.** Flag a session/user touching an unusually high
   count of distinct object ids in a short window:
   ```
   index=app uri_path="/api/orders/*"
   | rex field=uri_path "/api/orders/(?<obj>\d+)"
   | stats dc(obj) as objects, min(obj) as lo, max(obj) as hi by user, src_ip
   | where objects > 25
   ```
2. **Sequential scanning.** Detect monotonic id walks (`hi - lo ≈ objects`),
   characteristic of IDOR sweeps over guessable ids.
3. **Cross-tenant access.** Where object ownership is known, alert when the
   subject's tenant ≠ the object's tenant on a `200` response.
4. **Function-level violations.** Alert on low-privilege sessions reaching
   admin-only routes returning success (missing function-level authorization).
5. **Denied-then-allowed.** A `403` immediately followed by a `200` to the same
   object from the same subject can indicate a control bypass.
6. **Triage & escalate.** Confirm whether returned data belonged to another
   user/tenant, scope the exposure, and drive the authorization fix.

## Detection engineering notes

- The single most valuable input is an **explicit authorization-decision log**
  (subject, object, allow/deny). Without it, infer from id cardinality and
  ownership joins.
- Baseline normal object-access breadth per role to set thresholds; support/admin
  roles legitimately touch many objects.

## Paired offense / defense

Pairs with **web-idor**. Run that skill in the lab: the cross-account object read
should surface as cross-tenant access (step 3) and, if you enumerate, as a
distinct-id burst (steps 1–2).

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. `cd _lab && docker compose up -d juice-shop` with access logging.
2. Run the paired `web-idor` procedure with two accounts, including a short id
   sweep.
3. Confirm the single-session distinct-object-id burst crosses your threshold and
   the cross-account access is visible in logs.

## References

- OWASP: A01:2021 Broken Access Control; API1:2023 BOLA
- MITRE ATT&CK T1548; D3FEND D3-UBA (User Behavior Analysis)
- CWE-639 — Authorization Bypass Through User-Controlled Key
