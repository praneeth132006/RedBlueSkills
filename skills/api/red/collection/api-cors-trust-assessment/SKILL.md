---
name: api-cors-trust-assessment
description: Assess whether a browser can read sensitive API responses from an untrusted
  origin. Use for CORS trust reviews, not generic CSRF or server-to-server authentication.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: collection
techniques:
  cwe:
  - CWE-942
pairs_with:
- api-cors-trust-hardening
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Api cors trust assessment

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

1. Identify a read-only endpoint containing synthetic account-specific data and
   its intended browser origins. Review headers at both application and proxy.
2. Establish an allowed-origin control in a browser with a dedicated test account.
   Confirm that the expected body is readable, not just that the request returns 200.
3. From a separate authorized test origin, attempt the same browser fetch. Test
   exact-origin mismatches: scheme, port, untrusted subdomain, suffix lookalike,
   and `null` origin only if that context is relevant and isolated.
4. Capture whether script can read sensitive content and whether credentials were
   actually sent. Cookie SameSite and third-party-cookie policies may block them.
   A reflected header seen in curl alone does not demonstrate browser exposure.
5. Inspect preflight and actual responses independently. A wildcard origin with
   credentials is blocked by browsers; do not report it as successful data theft.
   Public intentionally readable resources are not automatically vulnerabilities.
6. Record the origin, credential mode, relevant headers, and minimal synthetic
   response evidence. If only configuration evidence exists, label it as a review
   finding, not reproduced exploitation. Hand remediation to the paired skill.

## Paired defense / offense

Pair with **`api-cors-trust-hardening`**. Recheck the same allowed and denied origins after changes.
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
