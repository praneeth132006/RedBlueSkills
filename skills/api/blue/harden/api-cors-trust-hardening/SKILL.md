---
name: api-cors-trust-hardening
description: Configure an explicit browser-origin policy for sensitive APIs and verify
  allowed and denied cross-origin reads. CORS is not a replacement for authentication
  or CSRF protection.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  cwe:
  - CWE-942
pairs_with:
- api-cors-trust-assessment
risk:
  level: medium
  reversible: true
  data_touch: read-write
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Api cors trust hardening

## Overview

Evaluate browser response-sharing trust using the actual origin and credential
model. Distinguish a permissive configuration from demonstrated sensitive response access.

## Authorization & scope

Use owned test origins and a read-only endpoint with synthetic data. Reuse the
established assessment scope. Do not send production data to another origin or
change live CORS policy without authorization. Stop on unexpected state changes.

## Preconditions

- The intended origin allowlist and API/proxy configuration.
- A browser, a dedicated test identity, and two controlled test origins.
- A harmless endpoint and observable response content; no real customer records.

## Procedure

1. Inventory which browser applications need cross-origin response access.
   Default to no CORS grant when none is required. Use a maintained middleware.
2. Compare parsed origins by exact scheme, host, and effective port against trusted
   configuration. Avoid suffix/substring matching and unchecked Origin reflection.
   Reject `null` by default unless the application explicitly requires that context.
3. For credentialed resources, return the specific allowed origin and enable
   credentials only where needed. Use `Vary: Origin` when the response varies by
   origin, preserving other Vary values and the application's private-cache policy.
4. Limit permitted methods and request headers to the integration's requirements.
   Apply policy consistently to preflight, actual responses, errors, and proxy layers.
   A passing preflight does not authenticate or authorize the actual operation.
5. Keep resource authorization and CSRF protections separate. CORS controls browser
   response access; it does not prevent all cross-origin requests or non-browser clients.
6. Use the paired browser test with positive and negative origins after deployment.
   Check cookie/credential behavior and cache isolation; document any public wildcard
   endpoints separately. Roll back configuration only within the approved scope.

## Paired defense / offense

Pair with **`api-cors-trust-assessment`**. Recheck the same allowed and denied origins after changes.
Return confirmed, configuration-only, inconclusive, or blocked with supporting
evidence. Missing credentials or an unavailable browser is not proof of safety.

## Validation

Maturity is **reviewed**, not validated. This update checks the skill schema,
bidirectional pairing, package inclusion, and references; it does not execute a
browser CORS lab. To validate an integration, run the above procedure with both
allowed and denied origins, credentialed and uncredentialed requests, preflight,
actual responses, and proxy/cache behavior. Save redacted browser evidence and
record the actual target/date only after that run succeeds.

## References

- [MDN: CORS, credentials, preflights, and Vary](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [OWASP: HTML5 security, cross-origin resource sharing](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [CWE-942: Permissive Cross-domain Policy with Untrusted Domains](https://cwe.mitre.org/data/definitions/942.html)
