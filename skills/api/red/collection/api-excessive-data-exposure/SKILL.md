---
name: api-excessive-data-exposure
description: >-
  Find and prove excessive data exposure (part of API3:2023) in an API during an
  authorized test — endpoints that return more object properties than the caller
  needs, leaking sensitive or internal fields the client merely hides. Use when an
  API response may carry fields beyond what the consuming UI displays.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: collection
techniques:
  attack: [T1213]
  capec: [CAPEC-116]
  cwe: [CWE-200, CWE-213]
  owasp: ["A04:2021"]
  d3fend: []
pairs_with: [api-data-exposure-monitoring]
risk:
  level: medium
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

# API excessive data exposure

## Overview

Many APIs serialize a full object and rely on the client to display only the safe
fields — so the wire response carries PII, password hashes, internal flags,
tokens, or other users' attributes that the UI simply hides. This skill inspects
raw API responses for fields beyond what the caller needs, proving the leak from
the response body itself. It is the read-side twin of mass assignment.

## Authorization & scope

**Run only against APIs you are explicitly authorized to test.** Inspect responses
to **your own** authenticated requests. Capture the **field names and types** that
should not be present as proof — do **not** collect, store, or exfiltrate other
users' real PII at volume. One representative response demonstrating the extra
fields is sufficient; redact real values in your notes.

## Preconditions

- A valid account and the endpoints that return objects (detail and list/search).
- A way to see raw responses (proxy, `curl`, or the API client) — not just the
  rendered UI.

## Procedure

1. **Read raw, not rendered.** Call an object endpoint directly and inspect the
   full JSON, ignoring what the UI shows:
   ```bash
   curl -s -H "Authorization: Bearer $USER_TOKEN" \
        https://TARGET/api/v2/user/profile | jq 'keys'
   ```
2. **Diff wire vs. UI.** Compare returned fields against what the client actually
   displays. Flag surplus fields: `password_hash`, `ssn`, `mfa_secret`, `is_admin`,
   `internal_notes`, `tenant_id`, tokens, other users' attributes.
3. **List/search endpoints.** These are the worst offenders — a `GET /users` or a
   search result may embed full records for many principals. Check whether items
   include fields no consumer needs.
4. **Related/embedded objects.** Look at expanded relations (`?include=owner`,
   GraphQL nested selections) that pull sensitive fields from linked objects.
5. **Error and debug leakage.** Trigger errors and inspect whether responses leak
   stack traces, queries, or internal identifiers.
6. **Assess impact minimally.** Record the endpoint and the specific surplus/
   sensitive field names; if a field exposes another principal's data, note it as
   higher severity and stop — do not enumerate.
7. **Record** the fix: serialize an explicit response schema (allowlist of
   fields) per consumer, filter server-side, and never depend on the client to
   hide data.

## Paired defense / offense

Pairs with **api-data-exposure-monitoring**, which watches for responses carrying
sensitive field names and oversized payloads. Use this skill to locate the leaking
endpoints; the monitoring skill confirms the exposure is observable in telemetry
and catches regressions.

## Validation

Reproduce against **OWASP crAPI** in a lab:

1. Stand up crAPI and authenticate a user.
2. Inspect a profile / vehicle / dashboard response body directly and enumerate
   its fields.
3. Confirm the response includes fields the UI does not display (e.g. internal or
   sensitive attributes).

**Validated 2026-08-05 against OWASP crAPI.** `GET /community/api/v2/community/posts/recent` returned other users' `author.email` and `author.vehicleid` — fields the feed UI never shows — and `mechanic_report` responses leaked the vehicle owner's email and VIN.

## References

- OWASP API Security Top 10 — API3:2023 (excessive data exposure lineage)
- OWASP: A04:2021 Insecure Design; A01:2021 Broken Access Control
- MITRE ATT&CK T1213 Data from Information Repositories; CAPEC-116 Excavation
- CWE-200 Exposure of Sensitive Information; CWE-213 Exposure Due to Policy
