---
name: api-bola
description: >-
  Find and prove Broken Object Level Authorization (BOLA / API1:2023) in a REST
  or GraphQL API during an authorized assessment. Use when an object identifier
  in a path, query, body, or GraphQL argument selects a record and you need to
  confirm one authenticated principal can read or modify another principal's or
  tenant's objects.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1190, T1548]
  capec: [CAPEC-180]
  cwe: [CWE-639, CWE-284]
  owasp: ["A01:2021"]
  d3fend: []
pairs_with: [api-bola-detection]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-crapi
  last_validated: 2026-08-05
  validated_by: praneeth132006
license: Apache-2.0
---

# API Broken Object Level Authorization (BOLA)

## Overview

BOLA is the most common and most damaging API flaw: an endpoint takes a
client-supplied object id and returns or mutates that object without checking the
caller owns it. APIs are especially exposed because object ids travel in clean,
guessable places — `/api/v2/orders/1023`, `?account=8842`, a GraphQL `node(id:)`
argument — and there is no server-rendered page to hide them. This skill uses two
controlled principals to prove horizontal access (a peer's object) and, where
relevant, cross-tenant access, with read-only proof by default.

## Authorization & scope

**Run only against APIs you are explicitly authorized to test.** Use accounts
provisioned for the engagement. Prove cross-object access with a **single
non-sensitive field** from principal B while authenticated as principal A — do
not bulk-enumerate or exfiltrate real user PII. If write access is in scope,
mutate a **test object you created** through the peer endpoint pattern and restore
it; never destroy another tenant's data to "prove" the finding.

## Preconditions

- Two accounts/API keys you control, ideally in different tenants or roles, and
  the object identifiers each can legitimately reach.
- A captured request corpus (proxy, HAR, or the API's OpenAPI/GraphQL schema) so
  every object-bearing endpoint is enumerated.

## Procedure

1. **Inventory object references.** From the schema or traffic, list every
   endpoint that accepts an id: REST path params, query params, request-body ids,
   and GraphQL node/global ids. Note the id type (sequential int, UUID, ULID,
   composite).
2. **Baseline as A.** Authenticate as principal A and record a legitimate
   response for one of A's objects.
3. **Cross-principal read.** Replay the same request with A's credentials but B's
   object id:
   ```bash
   # A's token, B's object id
   curl -s -H "Authorization: Bearer $A_TOKEN" \
        "https://TARGET/api/v2/orders/$B_ORDER_ID" -o /dev/null -w "%{http_code}\n"
   ```
   A `200` carrying B's data confirms horizontal BOLA. A `403/404` that differs by
   timing or body may still leak existence.
4. **GraphQL variant.** Query `node(id: "<B global id>")` or a typed field with
   B's id while authed as A; nested resolvers frequently skip the ownership check
   the top-level query enforces.
5. **Predictability.** Sequential/short ids widen impact to mass enumeration;
   UUIDs are not a control if they leak in listings, emails, logs, or `Location`
   headers.
6. **Careful write.** If in scope, `PATCH`/`PUT`/`DELETE` a **test object you own**
   via the peer pattern to demonstrate mutation, then restore state.
7. **Record** the endpoint, the id that crossed the boundary, read-vs-write, id
   predictability, and the fix: enforce a server-side ownership check on **every**
   object access, scoped to the authenticated principal — never trust the id alone.

## Paired defense / offense

Pairs with **api-bola-detection**. The signal you generate — one principal
touching object ids outside its normal set, cross-tenant `200`s, and sequential-id
walks — is exactly what that skill hunts for. When validating together, confirm
the detection fires on the cross-account read you produce.

## Validation

Reproduce against **OWASP crAPI** (Completely Ridiculous API) in a lab:

1. Stand up crAPI (`docker compose up` from the crAPI release bundle).
2. Register two users; place an order / add a vehicle for each.
3. As user A, request user B's order/vehicle-report id and confirm A receives B's
   object — a horizontal BOLA — then note whether ids are sequential.

**Validated 2026-08-05 against OWASP crAPI.** Authenticated as a brand-new user with no vehicles and called `GET /identity/api/v2/vehicle/{id}/location` with another user's vehicle id (harvested from the community feed): HTTP 200 returning that user's GPS coordinates and email. `GET /workshop/api/mechanic/mechanic_report?report_id=1..3` returned other users' reports (owner email + VIN) over sequential ids — horizontal BOLA plus enumeration.

## References

- OWASP API Security Top 10 — API1:2023 Broken Object Level Authorization
- OWASP: A01:2021 Broken Access Control
- MITRE ATT&CK T1190, T1548 — Abuse Elevation Control Mechanism
- CWE-639 Authorization Bypass Through User-Controlled Key; CWE-284
- PortSwigger Web Security Academy — Access control & API testing
