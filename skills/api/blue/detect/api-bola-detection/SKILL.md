---
name: api-bola-detection
description: >-
  Detect Broken Object Level Authorization (BOLA / API1:2023) abuse against a
  REST or GraphQL API from access logs, gateway telemetry, and authorization
  decisions. Use when building API access-control detections, triaging suspected
  cross-tenant data access, or hunting for object-id enumeration.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1190, T1548]
  capec: [CAPEC-180]
  cwe: [CWE-639, CWE-284]
  owasp: ["A01:2021"]
  d3fend: [D3-UBA]
pairs_with: [api-bola]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-crapi
  last_validated: 2026-08-05
  validated_by: praneeth132006
license: Apache-2.0
---

# API BOLA detection

## Overview

BOLA requests are individually well-formed — the flaw is *who* is allowed to make
them — so signatures don't work. This skill detects BOLA behaviourally from API
gateway/access logs: one principal touching object ids outside its normal set,
cross-tenant `200`s, sequential-id walks, and denied-then-allowed sequences. It
depends on the gateway emitting the authenticated principal (user/tenant/key id)
and the object id per request.

## Authorization & scope

Passive analysis of telemetry from APIs you operate. Access logs bind principals
to the objects they read — treat as sensitive and access under your normal
data-handling policy. Do not replay captured requests against production.

## Preconditions

- Structured API access logs with, per request: authenticated principal id,
  tenant id, route template (`/orders/{id}`), the resolved object id, method, and
  status. GraphQL: the operation name and top-level field/id arguments.
- Ideally an explicit authorization-decision event (subject, object, allow/deny).
- A SIEM or log store for aggregation.

## Procedure

1. **Object-id fan-out per principal.** Flag a principal/key reading an unusually
   high count of distinct object ids in a short window:
   ```
   index=api route="/orders/{id}" method=GET status=200
   | stats dc(object_id) as objects, min(object_id) as lo, max(object_id) as hi
           by principal_id, src_ip
   | where objects > 25
   ```
2. **Sequential scanning.** Where ids are numeric, `hi - lo ≈ objects` indicates a
   monotonic walk — an enumeration sweep over guessable ids.
3. **Cross-tenant access.** Join object → owning tenant; alert when
   `principal.tenant != object.tenant` on a `200`. This is the highest-fidelity
   BOLA signal when ownership metadata is available.
4. **GraphQL nesting.** Watch for a single operation resolving many objects of a
   type the principal rarely reads; nested resolvers are a common BOLA gap.
5. **Denied-then-allowed.** A `403` immediately followed by a `200` for the same
   object+principal can indicate a bypass (id reshaping, alternate route).
6. **Triage & escalate.** Confirm whether returned objects belonged to another
   principal/tenant, scope the exposure window, and drive the server-side
   ownership-check fix on the offending route.

## Detection engineering notes

- The single highest-value input is a **tenant-tagged object-access log**; without
  ownership metadata, lean on id-cardinality and sequential-walk heuristics.
- Baseline normal object-access breadth **per role and per API key** — service
  accounts and support tooling legitimately touch many objects; set thresholds
  from that baseline, not a global constant.

## Paired offense / defense

Pairs with **api-bola**. Run that skill in the lab: its cross-account read should
surface as cross-tenant access (step 3) and, if you enumerate, as an object-id
fan-out (steps 1–2).

## Validation

Reproduce against **OWASP crAPI** in a lab:

1. Stand up crAPI with API access logging into your SIEM.
2. Run the paired `api-bola` procedure with two users, including a short id sweep.
3. Confirm the single-principal distinct-object fan-out crosses your threshold and
   the cross-tenant read is visible in the logs.

**Validated 2026-08-05 against OWASP crAPI.** Running the detection logic over the gateway access log from the paired `api-bola` run flagged one source touching sequential `mechanic_report` ids `[1,2,3]` (a monotonic walk) and cross-object vehicle-location access. (crAPI's default logs carry request path/status/source but not the authenticated principal or object tenant, so the sequential-walk and id-fan-out heuristics were validated on real traffic; the principal-keyed and cross-tenant-join variants additionally require log enrichment.)

## References

- OWASP API Security Top 10 — API1:2023 BOLA
- OWASP: A01:2021 Broken Access Control
- MITRE ATT&CK T1190, T1548; D3FEND D3-UBA (User Behavior Analysis)
- CWE-639 Authorization Bypass Through User-Controlled Key
