---
name: api-rate-limit-hardening
description: >-
  Harden an API against Unrestricted Resource Consumption (API4:2023) with layered
  limits — gateway rate limiting, pagination and payload/complexity caps, and
  per-caller quotas on costly actions. Use when designing or reviewing an API that
  lacks throttling or bounds on a single caller's resource and cost footprint.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1499]
  capec: [CAPEC-125]
  cwe: [CWE-770, CWE-799]
  owasp: ["A04:2021"]
  d3fend: []
pairs_with: [api-unrestricted-resource-consumption]
risk:
  level: info
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# API rate-limit hardening

## Overview

Unrestricted resource consumption is fixed by putting **ceilings** at every layer
so no single caller can exhaust CPU, memory, money, or third-party quota. No one
control is sufficient: a gateway rate limit does not cap a `limit=100000` query,
and a pagination cap does not stop unmetered SMS sends. This skill installs
layered limits — request rate, pagination/size/complexity, and per-caller quotas
on expensive actions — with the right response semantics (`429` + `Retry-After`).

## Authorization & scope

Design/configuration guidance for APIs you operate; it changes no data and needs
no special authorization. Stage limits carefully: set generous ceilings first,
observe real traffic, then tighten — an over-aggressive limit is its own
availability problem. Exempt or separately budget legitimate high-volume clients
(partners, batch jobs) with their own keys and quotas.

## Preconditions

- Access to the API gateway / reverse proxy and the application framework.
- Traffic baselines per endpoint and per caller class to set ceilings from data.
- An inventory of **costly endpoints** (reports/exports, uploads, and any action
  that bills a third party: SMS, email, OTP, LLM tokens).

## Procedure

1. **Gateway rate limiting.** Enforce per-key/per-principal request-rate limits at
   the edge with a token-bucket or sliding window; return `429` with
   `Retry-After` and `RateLimit-Limit/Remaining/Reset` headers. Key on the
   authenticated principal, not just source ip (mobile/NAT share ips).
2. **Pagination caps.** Enforce a maximum `limit`/`page_size` server-side (e.g. 100)
   and clamp — never honour an arbitrary client value; require cursor pagination
   for large collections.
3. **Payload & complexity limits.** Cap request body size, array lengths, and JSON
   nesting depth; for GraphQL enforce **query depth and complexity** limits and
   disable introspection in production.
4. **Per-caller quotas on costly actions.** Meter expensive/paid operations with a
   per-principal budget (per minute/hour/day) independent of the general rate
   limit; queue or reject over-budget calls rather than fanning out cost.
5. **Timeouts & concurrency.** Set request timeouts and per-principal concurrency
   caps so one caller cannot pin workers; apply backpressure and shed load.
6. **Observability.** Emit `429` counts, quota consumption, and per-endpoint
   latency so the paired detection and capacity planning have signal.
7. **Validate the ceilings.** Regression-test with the paired offensive skill in an
   isolated lab: probes must hit `429`/caps well below any damaging level.

## Paired offense / defense

Pairs with **api-unrestricted-resource-consumption**. Run that skill (in an agreed
window / isolated lab) before and after: its rate, pagination, and size probes must
return limits after hardening. Keep it as a regression check so limits are not
silently removed or bypassed by a new endpoint.

## Validation

Reproduce against **OWASP crAPI** (or a staging build of your API) in an isolated
lab:

1. Apply gateway rate limits and a pagination cap to representative endpoints.
2. Run the paired `api-unrestricted-resource-consumption` probes.
3. Confirm the rate probe returns `429` with `Retry-After` and the oversized
   pagination request is clamped.

**Status: reviewed, not yet validated.** As above, validating the ceiling requires applying rate limits to the target (app or a configured proxy in front of it) and re-running the paired `api-unrestricted-resource-consumption` probes to confirm they hit `429`/caps. Validate against a staging build or a rate-limiting proxy you control.

## References

- OWASP API Security Top 10 — API4:2023 Unrestricted Resource Consumption
- OWASP: A04:2021 Insecure Design; Denial of Service Cheat Sheet
- MITRE ATT&CK T1499 Endpoint Denial of Service; CAPEC-125 Flooding
- CWE-770 Allocation of Resources Without Limits; CWE-799
