---
name: api-jwt-validation-hardening
description: Harden JWT authentication with a server-chosen algorithm/key policy and required issuer, audience, type, and time checks. Use when configuring API token verification, not general login or password storage.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  cwe:
  - CWE-347
pairs_with:
- api-jwt-validation-abuse
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

# Api jwt validation hardening

## Overview

Make authentication fail closed before claims influence authorization. Match the
application's documented token profile; the fixture's HS256 choice is a teaching
constraint, not a recommendation to replace an existing asymmetric issuer.

## Authorization & scope

Read-only design review follows the requested scope. Apply configuration changes
only within the authorized system, with a rollback plan. Use synthetic data for
verification and do not log tokens, private model data, or user uploads.

## Preconditions

- A maintained JWT library and the issuer's documented access-token profile.
- Expected issuer/audience, approved algorithms, key distribution and rotation plan.
- Test tokens and a clock that can be controlled in automated tests.

## Procedure

1. Configure the verifier from trusted application settings. Do not select
   algorithms or fetch arbitrary keys from untrusted token headers. Bind keys to
   the expected issuer and algorithm; reject unknown key IDs without unsafe fallback.
2. Use the maintained library's verify API, not decode-only APIs. Require the
   profile's signature and claims; reject `none` for this signed access-token use.
3. Check exact issuer, intended audience, expiration and not-before with a bounded
   documented clock allowance. Enforce the subject and token-purpose rules your
   profile requires; ID tokens are not interchangeable with API access tokens.
4. Authenticate first, then authorize the verified principal for each resource.
   Return controlled authentication failures and log reason codes without tokens.
5. Build negative tests where each claim error has an otherwise valid signature,
   plus signature/header failures and a successful legitimate token. Verify old/new
   keys during the intended rotation interval in a staging environment.
6. Roll out with rejection metrics and rollback configuration. Do not restore
   decode-only acceptance if the new policy exposes an issuer/configuration mismatch.

## Paired defense / offense

Pair with **`api-jwt-validation-abuse`**. Compare the same input and positive control before and
after the defense. An unavailable environment is `blocked`; insufficient evidence
is `inconclusive`, not a clean bill of health.

## Validation

From a repository checkout, run:

```bash
python3 _lab/security-controls/validate.py
```

From the installed npm package, run `redblueskills lab security-controls`.
Python 3.10+ is required. The lab uses no network or production credentials.

Run `JWTControls` for a passing valid-token control and failing unsigned,
wrong-signature, issuer/audience, missing-claim, timing, and header cases. This
is a narrow stdlib fixture, not production JWT code. Verify the equivalent tests
against the actual library and issuer before claiming deployment coverage.

## References

- [RFC 8725: JWT Best Current Practices, sections 3.1, 3.8–3.12](https://www.rfc-editor.org/rfc/rfc8725.html)
- [RFC 7519: registered claims and validation](https://www.rfc-editor.org/rfc/rfc7519.html)
- [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
