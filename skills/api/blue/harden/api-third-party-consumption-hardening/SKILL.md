---
name: api-third-party-consumption-hardening
description: >-
  Harden an application against Unsafe Consumption of APIs (API10:2023). Use when
  your service integrates third-party/upstream APIs (identity, payment, enrichment,
  shipping, inbound webhooks) and you need to treat their responses as untrusted:
  validating and sanitizing upstream data, enforcing TLS validation/pinning,
  refusing to blindly follow upstream-supplied redirects, and monitoring
  integrations for anomalous responses.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1195.001, T1190]
  capec: [CAPEC-137]
  cwe: [CWE-20, CWE-1104]
  owasp: ["A08:2021"]
  d3fend: [D3-MA, D3-OTF]
pairs_with: [api-unsafe-consumption]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# API third-party consumption hardening

## Overview

The root cause of API10 is a trust asymmetry: client input is validated, upstream
API responses are not — even though both reach the same sinks. This skill closes
that gap by extending the same "never trust input" discipline to every consumed
API. It treats upstream responses as untrusted data (schema-validate, type-check,
sanitize before any sink), secures the transport (TLS certificate/host validation,
pinning where the provider supports it), refuses to blindly follow
upstream-supplied redirects, bounds response size/time, and instruments each
integration so an upstream returning something abnormal is visible.

## Authorization & scope

Defensive engineering and monitoring of integrations your application operates.
Integration logs may contain third-party data and secrets — handle under your
normal data-handling policy. No active testing of third-party providers.

## Preconditions

- An inventory of consumed upstream APIs and, for each, the response schema and
  which fields flow into which sinks (storage, rendering, redirects, downstream
  calls).
- Ability to change the integration client (validation, TLS options, redirect
  handling, timeouts) and to emit per-integration telemetry.

## Procedure

1. **Schema-validate upstream responses.** For every consumed API, define and
   enforce a strict response schema (types, ranges, allowed values). Reject or
   quarantine responses that don't conform instead of passing them through.
2. **Sanitize before the sink.** Apply the same output-encoding/sanitization you
   apply to client input at the point upstream data enters a sink — escape before
   rendering, parameterize before a query, re-validate before a downstream call.
3. **Secure the transport.** Require TLS with full certificate and hostname
   validation on every integration; pin certificates/public keys where the
   provider supports it; never disable verification "to make it work". Reject
   plaintext integration channels.
4. **Don't follow upstream redirects blindly.** If an upstream can supply a URL
   (`Location`, `next`, callback), do not auto-follow it to arbitrary
   destinations — apply the same allowlist/resolve-then-pin egress controls used
   for SSRF (see `api-ssrf-hardening`).
5. **Bound and isolate.** Set response size and time limits on upstream calls,
   fail closed on malformed/oversized responses, and isolate parsing so a hostile
   response can't crash or hang the consumer.
6. **Vet and maintain integrations.** Track the maintenance/patch status of
   third-party components and SDKs; retire unmaintained ones (CWE-1104). Keep the
   integration inventory current.
7. **Monitor integrations.** Emit per-call telemetry (upstream, schema-validation
   outcome, size, latency, redirect targets). Alert on schema-validation failures,
   first-seen redirect destinations from an upstream, and anomalous response
   sizes/shapes — the footprint of an influenced upstream.

## Detection engineering notes

- The load-bearing control is **schema validation + sanitization at the sink** —
  it neutralizes injected upstream data regardless of how the upstream was
  influenced.
- A spike in **schema-validation failures** for one integration, or a **new
  redirect destination** from an upstream, is a high-fidelity indicator that the
  upstream is returning attacker-influenced data.

## Paired offense / defense

Pairs with **api-unsafe-consumption**. Run that skill against a mock upstream you
control: the injected canary should be caught by schema validation/sanitization
before reaching a sink, the inert upstream redirect should be refused by egress
controls, and the malformed response should be rejected — each visible in
integration telemetry.

## Validation

Reproduce against a lab consumer that calls a mock upstream you control:

1. Enable strict response-schema validation, sink sanitization, TLS validation,
   non-following of upstream redirects, and per-integration telemetry.
2. Run the paired `api-unsafe-consumption` skill from the controlled upstream.
3. Confirm the canary is caught/sanitized (does not surface in the sink), the
   upstream redirect is refused, the malformed response is rejected, and each
   event appears in integration telemetry — while legitimate upstream responses
   still pass.

**Status: reviewed (2026-08-06).** The paired `api-unsafe-consumption` skill is
`validated` against OWASP crAPI (the workshop returned a controlled upstream's
`<script>` payload verbatim in `response_from_mechanic_api`). Schema-validation +
sink sanitization neutralizes that injected data, but crAPI ships no hardened
consumer to prove the fix end-to-end, so this skill stays `reviewed`.

## References

- OWASP API Security Top 10 — API10:2023 Unsafe Consumption of APIs
- OWASP: A08:2021 Software and Data Integrity Failures; Input Validation Cheat Sheet
- MITRE ATT&CK T1195.001, T1190; D3FEND D3-MA (Message Analysis), D3-OTF (Outbound Traffic Filtering)
- CAPEC-137; CWE-20 Improper Input Validation; CWE-1104 Unmaintained Third Party Components
