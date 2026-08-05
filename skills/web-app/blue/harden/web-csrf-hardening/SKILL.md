---
name: web-csrf-hardening
description: >-
  Harden a web application against cross-site request forgery with anti-CSRF
  tokens, SameSite cookies, and origin validation, and detect attempts. Use to
  protect state-changing endpoints so a third-party site cannot act on an
  authenticated victim's behalf.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1189]
  capec: [CAPEC-62]
  cwe: [CWE-352]
  owasp: ["A01:2021"]
  d3fend: [D3-ANCI]
pairs_with: [web-csrf]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web CSRF hardening

## Overview

CSRF is defeated by ensuring every state-changing request carries proof it
originated from your own application. This skill layers three independent
controls — anti-CSRF tokens, `SameSite` cookies, and origin/referer validation —
so that a single misconfiguration doesn't reopen the hole, and adds detection for
cross-site attempts.

## Authorization & scope

Defensive configuration of systems you operate. Test token enforcement in staging
to avoid breaking legitimate flows (especially SPAs and third-party embeds). No
offensive authorization needed.

## Preconditions

- Inventory of state-changing endpoints and how the frontend calls them
  (form posts, `fetch`/XHR, SPA).
- Ability to change server framework config and cookie attributes.

## Procedure

1. **Anti-CSRF tokens.** Require a synchronizer token (per session, ideally
   per-request) on every state-changing request, validated server-side. For
   stateless APIs, use the double-submit-cookie pattern with a strict comparison.
2. **SameSite cookies.** Set session cookies `SameSite=Lax` (or `Strict` for the
   most sensitive apps) so browsers don't attach them to cross-site POSTs; keep
   `Secure` and `HttpOnly`.
3. **Origin/Referer validation.** For state-changing requests, verify `Origin`
   (fall back to `Referer`) matches an allow-list of your own origins; reject
   missing/foreign values.
4. **Prefer safe patterns.** Never perform state changes on `GET`; require custom
   headers on JSON APIs (browsers block cross-site custom headers without a CORS
   preflight you control).
5. **Re-authenticate** for the most sensitive actions (password/email change,
   payment) regardless of tokens.
6. **Monitor.** Alert on state-changing requests bearing a foreign or absent
   `Origin`/`Referer`, or a missing/failed token:
   ```
   index=web method IN ("POST","PUT","DELETE") uri_path IN (<state_changing_paths>)
   | where isnull(origin) OR NOT match(origin, "^https://(www\.)?yourapp\.com$")
   | stats count by src_ip, uri_path, origin
   ```
7. **Verify** by re-running the paired offense skill and confirming its PoC is now
   rejected.

## Paired offense / defense

Pairs with **web-csrf**. The offensive skill's token-stripped replay, forged
`Origin`, and self-targeted HTML PoC should all be rejected once these controls
are in place, and the attempts should surface in the monitoring rule.

## Validation

Reproduce in `_lab/`:

1. Apply token + `SameSite=Lax` + origin checks to a state-changing endpoint.
2. Re-run the paired `web-csrf` replay without a token and with a foreign
   `Origin`; confirm both are rejected.
3. Load the self-targeted PoC and confirm the state change no longer occurs.

## References

- OWASP: Cross-Site Request Forgery Prevention Cheat Sheet
- MITRE D3FEND D3-ANCI (Authentication Cache Invalidation) / origin validation
- CWE-352 — Cross-Site Request Forgery
- IETF: Cookies `SameSite` attribute
