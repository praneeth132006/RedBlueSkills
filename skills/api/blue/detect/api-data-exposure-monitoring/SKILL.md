---
name: api-data-exposure-monitoring
description: >-
  Detect excessive data exposure (API3:2023) in an API from response telemetry and
  schema-diff analysis — endpoints returning sensitive field names, oversized
  payloads, or fields absent from the sanctioned response schema. Use when building
  data-exposure detections or reviewing API responses for sensitive-field leakage.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1213]
  capec: [CAPEC-116]
  cwe: [CWE-200, CWE-213]
  owasp: ["A04:2021"]
  d3fend: [D3-RAPA]
pairs_with: [api-excessive-data-exposure]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# API data-exposure monitoring

## Overview

Excessive data exposure is detectable at the boundary: the response either carries
a field name that should never leave the server, or returns far more data than the
endpoint's contract allows. This skill detects it two ways — a **response
schema-diff** in CI/gateway that compares emitted fields to the sanctioned output
schema, and **runtime telemetry** that flags sensitive field names and oversized
payloads. It favours metadata (field names, sizes) over logging response bodies.

## Authorization & scope

Passive analysis of APIs you operate. **Never log raw response bodies containing
PII**; detect on field-name presence and payload metadata. Response samples used
for schema-diff should come from a test tenant, not real users.

## Preconditions

- The sanctioned response schema per endpoint (OpenAPI response objects, GraphQL
  types, or serializer definitions).
- Gateway/response telemetry with route template, response size, and — ideally — a
  server-emitted list of serialized field names (not values).
- A CI stage able to run the API against test data and diff responses.

## Procedure

1. **Schema-diff in CI.** For each endpoint, call it with test data and compare the
   emitted field set against the sanctioned schema; fail the build on any field
   not in the contract, and on any field on a sensitive-name denylist:
   ```
   deny = {password, password_hash, ssn, mfa_secret, token, secret, internal_*}
   for field in emitted_fields:
       if field not in sanctioned_fields or matches(field, deny): FAIL(endpoint, field)
   ```
2. **Sensitive-field name watch (runtime).** If the gateway can emit serialized
   field names, alert when responses include denylisted names.
3. **Payload-size anomalies.** Baseline response size per route; alert on
   responses far above baseline (e.g. list endpoints returning full records) —
   `D3-RAPA` resource-access-pattern analysis:
   ```
   index=api route="/users" method=GET
   | eventstats avg(bytes) as m, stdev(bytes) as s by route
   | where bytes > m + 4*s
   ```
4. **List/search scrutiny.** Prioritise collection endpoints; flag per-item field
   counts above the sanctioned item schema.
5. **Related-object expansion.** Watch `include`/expand params and GraphQL nested
   selections that pull sensitive fields from linked objects.
6. **Triage & escalate.** Confirm the field is truly sensitive and reachable by an
   unintended consumer, then drive the response-allowlist fix and add the endpoint
   to the CI schema-diff gate.

## Detection engineering notes

- The **CI schema-diff is the durable control**; runtime detection catches drift
  and undocumented endpoints the gate doesn't cover.
- Keep the sensitive-name denylist in sync with your data-classification catalog
  so new sensitive fields are covered automatically.

## Paired offense / defense

Pairs with **api-excessive-data-exposure**. The surplus fields that skill finds are
exactly what the schema-diff (step 1) and sensitive-name watch (step 2) flag.

## Validation

Reproduce against **OWASP crAPI** in a lab:

1. Capture sanctioned response schemas for a few crAPI endpoints.
2. Run the paired `api-excessive-data-exposure` procedure to identify a leaking
   endpoint.
3. Confirm the schema-diff flags the surplus/sensitive field on that endpoint.

Promote to `validated` once the diff/telemetry flags the exposure on the paired run.

## References

- OWASP API Security Top 10 — API3:2023 (excessive data exposure lineage)
- OWASP: A04:2021 Insecure Design
- MITRE ATT&CK T1213; D3FEND D3-RAPA (Resource Access Pattern Analysis)
- CWE-200 Exposure of Sensitive Information; CWE-213
