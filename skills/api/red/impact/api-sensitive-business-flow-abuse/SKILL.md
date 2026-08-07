---
name: api-sensitive-business-flow-abuse
description: >-
  Prove Unrestricted Access to Sensitive Business Flows (API6:2023) during an
  authorized assessment — automating a business-critical flow (checkout, ticket/
  inventory reservation, referral/reward redemption, signup, comment/booking) at a
  rate or scale the business never intended. Use when an endpoint is technically
  authorized per request but lacks anti-automation controls, so a script can abuse
  the flow to cause business harm.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: impact
techniques:
  attack: [T1499.003, T1583.006]
  capec: [CAPEC-210]
  cwe: [CWE-799, CWE-841]
  owasp: ["A04:2021"]
  d3fend: []
pairs_with: [api-business-flow-hardening]
risk:
  level: medium
  reversible: false
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

# API sensitive business-flow abuse

## Overview

API6 is not a technical-vulnerability class — every request is individually
authorized and well-formed. The flaw is that a **business** flow the designers
assumed a human would perform occasionally can be driven by a script at machine
speed and scale: buying all concert tickets to resell, draining limited-stock
inventory, farming referral/reward credit, mass-creating accounts, or flooding a
booking/comment flow. This skill identifies the sensitive flows, measures whether
anti-automation controls exist, and demonstrates programmatic abuse at a
**controlled, minimal scale** sufficient to prove the gap without causing real
business damage.

## Authorization & scope

**Run only against systems you are explicitly authorized to test, and treat this
skill as high-blast-radius:** abusing a business flow can create irreversible
state (orders, reservations, payments, emails to real users). Before running, get
**explicit written approval for business-flow abuse**, agree a hard cap
(e.g. "no more than N test reservations, all against test SKUs/accounts"), use
**test products/accounts and a test payment path only**, and restore/cancel every
created object afterward. **Never** run this against a flow that charges real money,
emails real customers, or consumes real shared inventory. If any of those can't be
isolated, stop and report the missing control from static analysis instead.

## Preconditions

- A mapped business flow (the sequence of endpoints that completes it) and an
  account provisioned for the engagement.
- Written authorization specifying the flow, the scale cap, and the test
  data/payment isolation.
- The ability to observe whether the flow enforces CAPTCHA, device/identity
  binding, rate/quantity limits, or human-pacing.

## Procedure

1. **Identify sensitive flows.** From the API and product, list flows whose value
   depends on scarcity, cost, or one-per-human assumptions: purchase/checkout,
   inventory/seat reservation, referral/reward redemption, signup, voting,
   booking, comment/review posting.
2. **Map the minimal request sequence.** Capture the exact calls that complete the
   flow once (e.g. `reserve → confirm`), including any tokens/steps that look like
   controls, and determine which are actually enforced server-side.
3. **Probe for anti-automation.** Check whether the flow requires a solved
   CAPTCHA, a bound device/session, a server-enforced quantity/rate cap, or human
   pacing — and whether those can be skipped by calling the API directly rather
   than the UI.
4. **Controlled automation (capped).** Within the approved cap and against test
   data only, script the flow to run faster/more times than a human would, to
   demonstrate the control is absent:
   ```bash
   # capped, test-SKU only — proves the flow accepts scripted repetition
   for i in $(seq 1 "$APPROVED_CAP"); do
     curl -s -X POST "https://TARGET/api/v1/reservations" \
       -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
       -d '{"sku":"TEST-SKU","qty":1}' -o /dev/null -w "%{http_code}\n"
     sleep 0.2
   done
   ```
   Success across the run with no throttle/CAPTCHA/quantity check is the finding.
5. **Quantify the business impact hypothetically.** Extrapolate what the *absence*
   of the control means at attacker scale (inventory exhaustion, reward-budget
   drain) — describe it; do not actually reach that scale.
6. **Restore state.** Cancel/refund/delete every test object created, and confirm
   the flow returns to baseline.
7. **Record** the flow, which anti-automation control is missing, the capped
   evidence, the extrapolated business impact, and the fix (device/human
   verification, server-side quantity/rate caps, and pacing on the specific flow).

## Paired defense / offense

Pairs with **api-business-flow-hardening**. The pattern you produce — one
principal completing a sensitive flow many times in quick succession, bypassing
the UI — is exactly the behaviour that skill rate-limits, CAPTCHA-gates, and
alerts on. Validate that its control blocks your capped run.

## Validation

Reproduce against a lab with a scarce-resource flow (a demo store with limited
stock, or a purpose-built reservation service seeded with **test** SKUs):

1. Provision a test account, test SKUs, and a sandbox payment path.
2. Confirm the flow can be completed once via direct API calls (no UI).
3. Within the approved cap, run the flow repeatedly against test SKUs and confirm
   no anti-automation control intervenes; then cancel every created object.

**Validated 2026-08-06 against OWASP crAPI.** Scripted the account-creation flow
(`POST /identity/api/auth/signup`) 10 times in rapid succession — all 10 returned
HTTP 200 with **no CAPTCHA, no rate limit, and no device/human verification**. Each
fresh account independently claims a coupon for store credit
(`POST /workshop/api/shop/apply_coupon` moved one account's `available_credit`
100.0 → 175.0), so the unthrottled signup flow directly enables reward-farming at
scale. crAPI's per-user coupon-idempotency guard blocks *same-account* reuse, which
is why the abuse pivots to mass account creation — the sensitive flow that lacks
anti-automation.

## References

- OWASP API Security Top 10 — API6:2023 Unrestricted Access to Sensitive Business Flows
- OWASP: A04:2021 Insecure Design; OWASP Automated Threats to Web Applications (OAT)
- MITRE ATT&CK T1499.003, T1583.006; CAPEC-210
- CWE-799 Improper Control of Interaction Frequency; CWE-841
