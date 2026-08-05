---
name: api-unrestricted-resource-consumption
description: >-
  Assess Unrestricted Resource Consumption (API4:2023) in an API during an
  authorized test — missing rate limits, pagination caps, payload-size limits, and
  cost controls that let a caller exhaust CPU, memory, money, or third-party quota.
  Use when you need to confirm an API lacks the throttling and limits that bound a
  single caller's resource use.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: impact
techniques:
  attack: [T1499]
  capec: [CAPEC-125]
  cwe: [CWE-770, CWE-799]
  owasp: ["A04:2021"]
  d3fend: []
pairs_with: [api-rate-limit-hardening]
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

# API unrestricted resource consumption

## Overview

APIs turn a single request into work — database queries, CPU, memory, outbound
calls to paid third parties (SMS, email, LLM tokens). Without rate limits,
pagination caps, and size limits, one caller can degrade the service or run up
cost. This skill confirms the **absence of limits** with small, controlled probes
and a **capped** burst — the goal is to establish that no ceiling exists, not to
actually take the service down.

## Authorization & scope

**Run only against APIs you are explicitly authorized to test, in a window agreed
with the operator.** Resource-exhaustion testing can cause an outage or real cost —
treat it as the highest-coordination item in an engagement. Use a **test tenant**,
cap concurrency and total volume to the minimum that demonstrates the missing
limit, and **stop at the first sign of degradation**. Never target shared
production infrastructure or endpoints that bill third parties without written
sign-off. Prefer proving *"no limit is enforced"* over proving *"the service
fell over."*

## Preconditions

- A test account and a coordinated testing window with rollback/abort agreed.
- Endpoints of interest: expensive queries, list/search with pagination, file or
  batch uploads, and any endpoint that triggers a paid third-party action.

## Procedure

1. **Probe for a rate limit.** Send a **small** controlled series (e.g. 20–50
   requests) to a cheap endpoint and watch for `429`, `Retry-After`, or
   `RateLimit-*` headers. Their absence indicates no request-rate ceiling:
   ```bash
   for i in $(seq 1 30); do
     curl -s -o /dev/null -w "%{http_code} " \
       -H "Authorization: Bearer $USER_TOKEN" https://TARGET/api/v2/health
   done; echo
   ```
2. **Pagination cap.** Request a large `limit`/`page_size` (e.g. `?limit=100000`)
   and check whether the server caps it or attempts to return everything.
3. **Payload size.** Submit an oversized body / deeply nested JSON / large array
   within the test budget and check for a size or complexity limit (GraphQL:
   query depth/complexity).
4. **Amplification / cost endpoints.** Identify one request that fans out to
   expensive work (a report build, an export, an SMS/email/OTP send, an LLM call).
   With explicit sign-off, confirm whether **per-caller** limits bound it — a
   single unmetered call to a paid action is already a finding.
5. **Concurrency (capped).** With a small, agreed concurrency, confirm the server
   accepts unbounded parallel work from one principal; stop immediately on latency
   climb.
6. **Record** which limits are missing (rate, pagination, size, complexity,
   per-caller cost), the observed behaviour, and the fix: enforce layered limits —
   gateway rate limits, pagination/size/complexity caps, and per-caller quotas on
   costly actions.

## Paired defense / offense

Pairs with **api-rate-limit-hardening**, which adds the missing ceilings. Use this
skill to demonstrate the gap within the agreed window, then re-run after hardening
to confirm probes now hit `429`/caps well below any damaging level.

## Validation

Reproduce against **OWASP crAPI** (or a dedicated staging API) in a lab you fully
control — never a shared environment:

1. Stand up the API in an isolated lab.
2. Send a small controlled request series to a cheap endpoint and confirm the
   absence of rate-limit responses/headers.
3. Request an oversized pagination limit and confirm it is not capped.

**Validated 2026-08-05 against OWASP crAPI.** 40 rapid failed logins against `POST /identity/api/auth/login` all returned `401` with no `429`, no lockout, and no `RateLimit-*`/`Retry-After` headers — no request-rate ceiling is enforced.

## References

- OWASP API Security Top 10 — API4:2023 Unrestricted Resource Consumption
- OWASP: A04:2021 Insecure Design; Denial of Service Cheat Sheet
- MITRE ATT&CK T1499 Endpoint Denial of Service; CAPEC-125 Flooding
- CWE-770 Allocation of Resources Without Limits; CWE-799 Improper Control of
  Interaction Frequency
