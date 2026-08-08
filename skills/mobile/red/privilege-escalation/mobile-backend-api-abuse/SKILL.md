---
name: mobile-backend-api-abuse
description: >-
  Abuse the trust a backend places in its mobile client during an authorized
  assessment. Use when an app enforces limits, roles, pricing, or workflow steps on
  the client and you need to prove that the backend accepts requests that bypass
  them — replaying the app's API directly to escalate privileges, access other
  users' objects, skip payment/verification steps, or forge client-supplied trust
  signals. Maps to OWASP Mobile Top 10 M3 Insecure Authentication/Authorization and
  the OWASP API Top 10 (BOLA/BFLA) reached through the mobile channel.
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1190]
  capec: [CAPEC-115]
  cwe: [CWE-602, CWE-639]
  owasp: []
  d3fend: []
pairs_with: [mobile-backend-abuse-detection]
risk:
  level: high
  reversible: true
  data_touch: read-write
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile backend API abuse

## Overview

A mobile app is just a client for a backend API, and the backend is the only place
security can actually be enforced — yet apps routinely enforce authorization,
quotas, pricing, feature gates, and multi-step workflows in the UI and *trust the
client to have done so*. An attacker who proxies or replays the app's own API calls
skips the UI entirely: changing an object id to reach another user's data (BOLA),
calling an admin/privileged endpoint the UI hides (BFLA), forging a client-supplied
role/price/flag the server trusts, or jumping straight to the final step of a paid or
verified flow. This skill replays the app's authenticated API to prove which of these
controls exist only on the client — demonstrating that the backend must enforce them.

## Authorization & scope

**Run only against an app and backend you are explicitly authorized to assess**, with
seeded test accounts (ideally two, to prove cross-user access). This touches the
backend read-write: keep actions minimal and reversible, act only on your own test
objects and a single, clearly-authorized cross-user proof, and never modify or read
real users' data. The finding is "control X is enforced only on the client; the
backend accepts the bypass" — capture the request/response as redacted evidence and
stop at proof, not exploitation.

## Preconditions

- The app on a test device routed through an intercepting proxy (or captured API
  traffic) and a valid session for a low-privileged test account.
- Understanding of the app's object ids, roles/tiers, and multi-step flows from
  exercising it normally.
- Where possible, a second test account to demonstrate cross-user (BOLA) access
  cleanly.

## Procedure

1. **Capture the app's API.** Proxy the app and record the authenticated requests
   behind sensitive UI actions (viewing an object, an admin-only screen, a purchase,
   a verification step). These, replayed directly, are the attack surface.
2. **Test object-level authorization (BOLA).** Take a request that references an
   object id you own and substitute another account's id; if the backend returns it,
   authorization is enforced only by the UI:
   ```bash
   curl -s https://api.example.com/v1/accounts/1002/statements \
     -H "Authorization: Bearer $LOW_PRIV_TEST_TOKEN"   # 1002 is the other test account
   ```
3. **Test function-level authorization (BFLA).** Call privileged endpoints the UI
   hides from your role (admin actions, other HTTP methods) with your low-privileged
   token and see whether the server checks the role or trusts that the app wouldn't
   have shown the button.
4. **Test client-enforced trust signals.** Look for values the client sends that the
   server should never trust — `role`, `isPremium`, `price`, `discount`, `verified`,
   `deviceTrusted` — and alter them to see whether the backend re-derives them or
   accepts the client's word.
5. **Test business-flow shortcuts.** Skip client-side steps of a paid/verified
   workflow (jump to "confirm" without "pay", replay a one-time step, reorder steps)
   to see whether the server enforces the sequence and idempotency.
6. **Record** each finding as (endpoint, control bypassed, client-only vs.
   server-enforced, cross-user proof if any), plus the fix: enforce object- and
   function-level authorization server-side, never trust client-supplied
   role/price/flags, and validate workflow state and idempotency on the backend.

## Paired defense / offense

Pairs with **mobile-backend-abuse-detection**. The direct API replays this skill
issues — an id swap, a privileged call from a low-priv token, a forged trust field, a
skipped payment step — are exactly the request patterns that skill teaches the
backend to reject and to alert on (authorization failures, client/UI-inconsistent
sequences, off-device or out-of-order calls). This mobile offense also feeds directly
into the `api` surface: server-side, the same flaws are `api-bola` and `api-bfla`.

## Validation

Reproduce against a test app + backend you own:

1. Build a demo where the app hides an admin action and references user objects by
   id, with weak server-side checks.
2. Proxy the app, replay the request with another test account's id and call the
   hidden endpoint with a low-priv token; confirm the backend serves them.
3. Add server-side object/function authorization and confirm the same replays now
   return 403 while the app's normal use still works.

_Not yet lab-validated end-to-end (no shipped mobile lab target); the server-side
equivalents are validated on the `api` surface (crAPI). Authored and reviewed against
OWASP MASVS-AUTH and OWASP API Top 10._

## References

- OWASP Mobile Top 10 M3 Insecure Authentication/Authorization; OWASP MASVS-AUTH
- OWASP API Security Top 10: API1 BOLA, API5 BFLA (server-side equivalents)
- MITRE ATT&CK T1190 Exploit Public-Facing Application; CAPEC-115 Authentication Bypass
- CWE-602 Client-Side Enforcement of Server-Side Security; CWE-639 Authorization Bypass Through User-Controlled Key
