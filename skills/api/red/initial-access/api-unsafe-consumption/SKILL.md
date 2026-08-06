---
name: api-unsafe-consumption
description: >-
  Prove Unsafe Consumption of APIs (API10:2023) during an authorized assessment —
  a target application that blindly trusts data from a third-party/upstream API it
  consumes. Use when the target integrates an external or partner API (payment,
  enrichment, OAuth/identity, shipping, webhooks-in) and you can influence that
  upstream's response to inject into the target: unvalidated data, redirects to
  attacker infrastructure, or oversized/malformed payloads.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1195.001, T1190]
  capec: [CAPEC-137]
  cwe: [CWE-20, CWE-1104]
  owasp: ["A08:2021"]
  d3fend: []
pairs_with: [api-third-party-consumption-hardening]
risk:
  level: high
  reversible: true
  data_touch: read-write
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-crapi
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# API unsafe consumption of APIs

## Overview

Developers apply strict validation to direct client input but treat responses from
third-party APIs as trusted — even though that upstream data flows into the same
sinks (databases, templates, redirects, downstream calls). API10 abuses this
misplaced trust: if you can influence what an upstream API returns to the target —
because you control the upstream, can register a partner integration, can respond
to the target's webhook/callback, or can man-in-the-middle a plaintext or
unpinned integration — you inject into the target through a path its input
validation never guards. This skill demonstrates that trust boundary being crossed
via a controlled upstream, with minimal, reversible proof.

## Authorization & scope

**Run only against a target you are explicitly authorized to test, and only via an
upstream you legitimately control** (your own sandbox/partner account, or a
webhook/callback the target invites). **Do not attack the real third-party
provider or other tenants of it**, and do not intercept traffic on networks you
don't own. Prove injection with a **benign marker** (a canary value that surfaces
in the target, an inert redirect to a collaborator host) — never destructive
payloads. If the only way to influence the upstream is to compromise the real
provider, that is out of scope: report the missing validation from design review
instead.

## Preconditions

- A target that consumes an external/upstream API and a legitimate means to
  influence that upstream's response (you operate the upstream sandbox, register a
  partner integration, or the target calls a webhook/redirect you host).
- Knowledge of which fields from the upstream response the target stores, renders,
  redirects to, or forwards downstream.
- A collaborator host for out-of-band proof.

## Procedure

1. **Map consumed integrations.** Identify every upstream the target calls —
   identity/OAuth, payment, enrichment/KYC, shipping, geocoding, inbound webhooks —
   and which response fields reach a sink in the target.
2. **Establish upstream control.** Use the sandbox/partner account or webhook you
   legitimately control as the influenced upstream; confirm the target consumes
   its response.
3. **Transport trust.** Check whether the integration uses TLS with certificate/
   host validation (and pinning where claimed). An unvalidated/plaintext channel
   means a network-position attacker could forge the upstream — note it; do not
   perform an actual interception outside your network.
4. **Redirect trust.** If the target follows a `Location`/`redirect`/`next` value
   taken from the upstream, return an inert redirect to your collaborator and
   confirm the target follows it (an SSRF/open-redirect via upstream trust).
5. **Data injection.** Return upstream fields carrying a benign canary into the
   sink the target uses them in — stored (does it persist unescaped?), rendered
   (does the marker execute/format?), or forwarded (does it reach a downstream
   call unvalidated?). Prove the canary surfaces; stop at proof.
6. **Malformed/oversized handling.** Return oversized, wrong-typed, or malformed
   upstream responses and observe whether the target crashes, hangs, or leaks
   errors — a resilience/validation gap.
7. **Record** the integration, the field, the sink it reached, the transport-trust
   posture, and the fix: validate and sanitize third-party responses exactly like
   client input, enforce TLS validation/pinning, and never blindly follow
   upstream-supplied redirects.

## Paired defense / offense

Pairs with **api-third-party-consumption-hardening**. The canary you inject via a
controlled upstream, and the inert redirect the target follows, are what that
skill's response-validation and egress controls stop — and its integration
telemetry records the anomalous upstream response you sent.

## Validation

Reproduce against a lab target that consumes a mock upstream you control (build a
small service that calls an "enrichment" API, or use a webhook-consuming demo):

1. Stand up the target and a mock upstream/collaborator you fully control.
2. Return a benign canary and an inert redirect from the mock upstream.
3. Confirm the canary surfaces in the target's sink (stored/rendered/forwarded)
   and/or the target follows the upstream-supplied redirect — proving unsafe
   consumption — without any destructive payload.

**Validated 2026-08-06 against OWASP crAPI.** Pointed the `contact_mechanic`
integration's `mechanic_api` field at a canary HTTP server under my control that
returned `{"malicious":"RBS_UNSAFE_CONSUMPTION_CANARY","injected_html":"<script>alert(1)</script>",...}`.
The crAPI workshop service consumed that upstream response and returned it
**verbatim** to the client inside `response_from_mechanic_api` — `<script>` payload
and all — with no schema validation, type-checking, or sanitization. The
application trusts and forwards third-party API data straight into its own
response, which is exactly API10 unsafe consumption.

## References

- OWASP API Security Top 10 — API10:2023 Unsafe Consumption of APIs
- OWASP: A08:2021 Software and Data Integrity Failures
- OWASP Input Validation & SSRF Prevention Cheat Sheets
- MITRE ATT&CK T1195.001, T1190; CAPEC-137
- CWE-20 Improper Input Validation; CWE-1104 Use of Unmaintained Third Party Components
