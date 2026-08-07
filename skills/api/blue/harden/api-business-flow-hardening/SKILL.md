---
name: api-business-flow-hardening
description: >-
  Harden sensitive business flows against Unrestricted Access (API6:2023) and
  detect automated abuse. Use when a business-critical flow (checkout, inventory/
  seat reservation, referral/reward redemption, signup, booking, voting) must be
  protected from scripted abuse — adding device/human verification, server-side
  quantity and rate caps, and behavioural detection of machine-speed completion.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1499.003, T1583.006]
  capec: [CAPEC-210]
  cwe: [CWE-799, CWE-841]
  owasp: ["A04:2021"]
  d3fend: [D3-NTA, D3-RA]
pairs_with: [api-sensitive-business-flow-abuse]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# API business-flow hardening

## Overview

Because every request in an abused business flow is individually legitimate,
per-request authorization can't stop it — the defense is to model the flow's
intended human usage and enforce it. This skill hardens sensitive flows with
layered anti-automation: identify the flows worth protecting, add device/human
verification proportionate to their value, enforce **server-side** quantity and
rate caps (never trust the UI or client), and detect the behavioural signature of
scripted completion — many completions per identity/device in a short window,
API-direct traffic that skips UI steps, and identity/device farming.

## Authorization & scope

Defensive design and monitoring of flows you operate. Behavioural logs bind users
to actions and may include device/payment metadata — handle under your normal
data-handling and privacy policy. No active testing of third-party systems.

## Preconditions

- An inventory of sensitive flows and, for each, the intended human usage (how
  often/how many a legitimate user performs).
- Ability to add verification challenges, enforce server-side limits at the
  gateway/service, and emit per-flow completion telemetry.

## Procedure

1. **Rank the flows.** Score each business flow by abuse value (scarcity, cost,
   reward, reputation). Apply the strongest controls to the highest-value flows;
   don't blanket-CAPTCHA everything.
2. **Human/device verification.** For high-value flows, require a proof-of-human
   or bound-device signal (CAPTCHA/attestation/step-up) at the flow's decisive
   step — enforced server-side so calling the API directly cannot skip it.
3. **Server-side quantity & rate caps.** Enforce per-identity, per-device, and
   per-payment-instrument limits on the flow (e.g. max reservations per account
   per window, max quantity per order) in the service, independent of any UI
   control. Return a clear throttle response rather than silently accepting.
4. **Flow-integrity checks.** Require the flow's steps to occur in order with
   server-issued, single-use tokens between them, so the decisive step can't be
   replayed or reached out of sequence.
5. **Identity/device-farming resistance.** Rate-limit account creation, detect
   many "distinct" accounts sharing a device/payment/IP fingerprint, and cap
   reward/referral accrual per real entity.
6. **Behavioural detection.** Alert on the abuse signature — a single identity/
   device completing the flow far above the human baseline, bursts of API-direct
   completions that skipped UI-only steps, and coordinated fingerprints:
   ```
   index=api flow="reservation.confirm" status=200
   | bucket _time span=1m | stats count by identity_id, device_id, _time
   | where count > <human_baseline_per_min>
   ```
7. **Tune to the baseline.** Set thresholds from measured legitimate per-flow
   behaviour per user segment, and give support/service accounts explicit
   allowances so caps don't break legitimate bulk usage.

## Detection engineering notes

- The strongest single control is a **server-side per-identity/per-device cap on
  the decisive step** — client-side and UI-only limits are trivially bypassed by
  calling the API directly, which is exactly how the paired skill abuses the flow.
- Behavioural alerting must baseline **per flow and per user segment**; a
  wholesale buyer and a consumer have very different legitimate rates.

## Paired offense / defense

Pairs with **api-sensitive-business-flow-abuse**. Run that skill's capped
automation in the lab: the server-side caps and verification should block or
throttle it, and its rapid repeated completions should cross the behavioural
threshold here.

## Validation

Reproduce against a lab reservation/checkout flow seeded with test SKUs:

1. Instrument per-flow completion telemetry and enable server-side quantity/rate
   caps plus a verification step on the decisive call.
2. Run the paired abuse skill's capped, test-SKU automation.
3. Confirm the caps throttle/deny the scripted run, the verification can't be
   skipped via direct API calls, and the behavioural alert fires — while a single
   legitimate completion still succeeds.

**Status: reviewed (2026-08-06).** The paired `api-sensitive-business-flow-abuse`
skill is `validated` against OWASP crAPI (10/10 scripted signups accepted with no
anti-automation; each account claims coupon credit). These controls — server-side
caps, human/device verification, behavioural detection — stop that abuse, but crAPI
ships no anti-automation build to prove the fix end-to-end, so this skill stays
`reviewed`.

## References

- OWASP API Security Top 10 — API6:2023 Unrestricted Access to Sensitive Business Flows
- OWASP: A04:2021 Insecure Design; OWASP Automated Threats to Web Applications (OAT)
- MITRE ATT&CK T1499.003, T1583.006; D3FEND D3-NTA (Network Traffic Analysis), D3-RA (Resource Access Pattern Analysis)
- CAPEC-210; CWE-799, CWE-841
