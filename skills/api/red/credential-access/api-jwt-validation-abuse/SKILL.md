---
name: api-jwt-validation-abuse
description: Assess JWT signature and claim validation during an authorized API review. Use for bearer-token middleware that must reject unsigned, incorrectly signed, expired, or wrong-audience access tokens.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: credential-access
techniques:
  cwe:
  - CWE-347
pairs_with:
- api-jwt-validation-hardening
risk:
  level: medium
  reversible: true
  data_touch: read-write
authorization: required
maturity: validated
validation:
  method: lab
  target: security-controls
  last_validated: '2026-09-18'
  validated_by: codex-local-validation
license: Apache-2.0
---

# Api jwt validation abuse

## Overview

Check whether the API authenticates a token before trusting its claims. This is
JWT-specific verification; use `api-broken-authentication` for broader login,
reset, and session weaknesses. A decoded payload alone is not authenticated.

## Authorization & scope

Operate only on authorized test identities and assets. Reuse scope already
established in the session. Local fixture execution uses temporary data only;
live actions require an agreed target and impact limit. Stop on unexpected effects.

## Preconditions

- The API's token verifier and expected issuer, audience, algorithm, and token type.
- A test user and a valid token from a dedicated test issuer for live checks.
- A read-only endpoint that demonstrates authentication without changing records.

## Procedure

1. Locate the verifier, key source, and authorization checks. Record the token
   profile separately from token-supplied headers. In source review, trace the
   exact middleware path and stop at code evidence.
2. Establish a valid-token baseline on the read-only test endpoint and an absent-token
   rejection. If either fails unexpectedly, mark the test inconclusive.
3. In the fixture or approved test environment, change one property per case:
   unsigned token, wrong signature, wrong issuer/audience, expired token,
   future `nbf`, or missing required claims. Use synthetic identities only.
4. For issuer/audience and clock checks, mint correctly signed test tokens so a
   signature failure does not mask missing claim validation. Never use production
   signing keys to generate negative tests. Do not brute-force secrets.
5. Capture verifier outcome and reached handler, not just HTTP status. A public
   route returning 200 is not proof of bypass. Record each rejected or accepted
   case and the valid-token control. Redact bearer values from evidence.
6. Return the minimal confirmed gap to the paired hardening skill. Delete test
   tokens and temporary artifacts after recording non-sensitive results.

## Paired defense / offense

Pair with **`api-jwt-validation-hardening`**. Compare the same input and positive control before and
after the defense. An unavailable environment is `blocked`; insufficient evidence
is `inconclusive`, not a clean bill of health.

## Validation

From a repository checkout, run:

```bash
python3 _lab/security-controls/validate.py
```

From the installed npm package, run `redblueskills lab security-controls`.
Python 3.10+ is required. The lab uses no network or production credentials.

The `JWTControls` tests show the vulnerable decoder accepting an unsigned
synthetic token and the strict fixture refusing it. They also exercise real
HMAC signature comparison, claim binding, missing claims, clock boundaries,
malformed inputs, and an allowed-token control. The fixture supports only one
HS256 access-token profile; it does not validate your provider, JWKS rotation,
asymmetric algorithms, OAuth flows, or production middleware.

## References

- [RFC 8725: JWT Best Current Practices, sections 3.1, 3.8–3.12](https://www.rfc-editor.org/rfc/rfc8725.html)
- [RFC 7519: registered claims and validation](https://www.rfc-editor.org/rfc/rfc7519.html)
- [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
