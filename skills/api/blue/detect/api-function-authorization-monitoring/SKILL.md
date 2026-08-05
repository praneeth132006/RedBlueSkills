---
name: api-function-authorization-monitoring
description: >-
  Detect Broken Function Level Authorization abuse (BFLA / API5:2023) against an
  API from access logs and role/route telemetry — low-privilege principals
  reaching admin or internal operations, method tampering, and role-claim misuse.
  Use when building API function-authorization detections or triaging suspected
  privilege escalation.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1190, T1078]
  capec: [CAPEC-122]
  cwe: [CWE-285, CWE-862]
  owasp: ["A01:2021"]
  d3fend: [D3-UBA]
pairs_with: [api-bfla]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# API function-authorization monitoring

## Overview

BFLA abuse looks like a normal request to a privileged endpoint — the anomaly is
the **role of the caller** and the **method** used. This skill detects
low-privilege principals successfully invoking admin/internal operations, method
tampering against role-gated routes, and success on operations a principal's role
should never reach. It depends on logs that carry both the caller's server-side
role and the route template + method.

## Authorization & scope

Passive analysis of telemetry from APIs you operate. Correlating principals to
privileged actions is sensitive; handle under your normal policy. Do not replay
observed privileged calls.

## Preconditions

- Access logs with: authenticated principal id, **server-side role/scopes**, route
  template, HTTP method, and status.
- A mapping of which routes+methods are privileged (from OpenAPI security
  requirements, a route/role matrix, or a gateway policy).
- A SIEM for aggregation.

## Procedure

1. **Role-vs-route violations.** Join each request's role against the
   privileged-route matrix and alert on a low-privilege role receiving success on
   a privileged operation:
   ```
   index=api status IN (200,201,204)
   | lookup priv_routes route method OUTPUT min_role
   | where isnotnull(min_role) AND role_rank(role) < role_rank(min_role)
   | stats count by principal_id, role, route, method
   ```
2. **Admin/internal reach.** Alert when principals outside the admin group get
   success on `/admin/*` or `/internal/*` routes.
3. **Method tampering.** Flag write methods (`POST/PUT/PATCH/DELETE`) or
   `X-HTTP-Method-Override` headers succeeding on routes that a role may only
   `GET`.
4. **Route-variant probing.** Detect one principal walking version/shape variants
   of the same privileged operation (`/v1` vs `/v2`, case/slash variants) —
   characteristic of guard-bypass hunting.
5. **First-time privileged action.** Alert when a principal invokes a privileged
   operation it has never used before, weighted by how privileged it is.
6. **Triage & escalate.** Confirm the action executed and had effect, identify
   whether the route lacks a server-side function check, and drive the fix.

## Detection engineering notes

- This detection is only as good as the **route→required-role matrix**; generate
  it from the API's own security definitions so it stays in sync with releases.
- Log the **effective server-side role**, not a client-supplied role header —
  otherwise the detection inherits the very flaw it hunts.

## Paired offense / defense

Pairs with **api-bfla**. Its low-privilege invocation of an admin operation
surfaces as a role-vs-route violation (step 1); its method tampering as step 3.

## Validation

Reproduce against **OWASP crAPI** in a lab:

1. Stand up crAPI with access logging (including caller role) into your SIEM.
2. Run the paired `api-bfla` procedure with a standard user against an
   administrative operation.
3. Confirm the low-privilege-on-privileged-route alert fires.

Promote to `validated` once the detection fires on the paired run.

## References

- OWASP API Security Top 10 — API5:2023 Broken Function Level Authorization
- OWASP: A01:2021 Broken Access Control
- MITRE ATT&CK T1190; T1078; D3FEND D3-UBA (User Behavior Analysis)
- CWE-285 Improper Authorization; CWE-862 Missing Authorization
