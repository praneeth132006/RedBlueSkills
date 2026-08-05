---
name: web-csrf
description: >-
  Find and prove cross-site request forgery in a web application during an
  authorized assessment. Use when a state-changing request relies only on
  ambient session credentials and you need to confirm a third-party site could
  trigger it on a victim's behalf.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: execution
techniques:
  attack: [T1189]
  capec: [CAPEC-62]
  cwe: [CWE-352]
  owasp: ["A01:2021"]
  d3fend: []
pairs_with: [web-csrf-hardening]
risk:
  level: medium
  reversible: true
  data_touch: read-write
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web cross-site request forgery (CSRF)

## Overview

CSRF forces an authenticated victim's browser to send a state-changing request
the victim didn't intend, by relying on cookies being attached automatically. This
skill identifies state-changing endpoints, checks whether they are protected
(anti-CSRF token, `SameSite` cookies, origin/referer checks), and proves the flaw
with a self-targeted proof-of-concept against a test account.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Demonstrate
CSRF against **your own test account** — host the PoC where only you load it and
target a reversible action (change a display name, toggle a benign setting), then
restore it. Never deliver a CSRF PoC to real users.

## Preconditions

- A state-changing request (profile update, email/password change, funds/settings
  change, add-to-cart/checkout) reachable while authenticated.
- Two browsers/profiles or a proxy to compare authenticated behaviour with and
  without CSRF defenses.

## Procedure

1. **Inventory state-changing requests.** For each `POST`/`PUT`/`DELETE` (or
   `GET` that changes state), capture the full request.
2. **Check for tokens.** Determine whether a per-request/-session anti-CSRF token
   is required and *validated*. Remove or alter it and replay:
   ```bash
   # replay without the csrf token — does the server still accept it?
   curl -s -b "session=$SESSION" -d 'email=attacker@evil.test' https://TARGET/account/email
   ```
   Acceptance without a valid token is the core finding.
3. **Check cookie `SameSite`.** `SameSite=Lax`/`Strict` blocks most cross-site
   POSTs; `None` (or unset on older browsers) leaves the endpoint exposed.
4. **Check origin/referer validation.** Strip or forge `Origin`/`Referer` and see
   whether the request is still honoured.
5. **Build a minimal PoC** for a confirmed-unprotected endpoint and load it while
   logged into your **test** account:
   ```html
   <form action="https://TARGET/account/email" method="POST">
     <input name="email" value="rbsk-poc@example.test">
   </form>
   <script>document.forms[0].submit()</script>
   ```
6. **Prove impact minimally** by confirming the test account's state changed via
   the cross-site request, then restore it.
7. **Record** the endpoint, missing control(s), the working PoC, and remediation
   (synchronizer or double-submit token, `SameSite=Lax/Strict`, origin checks,
   re-auth for sensitive actions).

## Paired defense / offense

Pairs with **web-csrf-hardening**. Requests to state-changing endpoints with a
foreign/absent `Origin`/`Referer`, missing/invalid tokens, and cross-site cookie
behaviour are the detection/prevention surface. When validating together, confirm
the hardening controls reject the exact PoC you built.

## Validation

Reproduce in `_lab/`:

1. Bring up a target with cookie-based sessions (`docker compose up -d`).
2. Capture a state-changing request, then replay it without the anti-CSRF token
   and with a foreign `Origin`. If accepted, the endpoint is CSRF-vulnerable.
3. Load the self-targeted HTML PoC while logged into a test account and confirm
   the state change, then restore it.

## References

- OWASP: Cross-Site Request Forgery Prevention Cheat Sheet
- MITRE ATT&CK T1189 — Drive-by Compromise
- CWE-352 — Cross-Site Request Forgery
- PortSwigger Web Security Academy — CSRF
