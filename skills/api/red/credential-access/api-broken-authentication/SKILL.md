---
name: api-broken-authentication
description: >-
  Assess Broken Authentication (API2:2023) in an API during an authorized test —
  JWT verification flaws, weak or missing token expiry, credential stuffing and
  brute force against token/login endpoints, and reset/OTP abuse. Use when you
  need to confirm an API's authentication can be bypassed, forged, or overwhelmed.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: credential-access
techniques:
  attack: [T1110, T1078]
  capec: [CAPEC-115]
  cwe: [CWE-287, CWE-345, CWE-347]
  owasp: ["A07:2021"]
  d3fend: []
pairs_with: [api-authentication-monitoring]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-crapi
  last_validated: 2026-08-05
  validated_by: praneeth132006
license: Apache-2.0
---

# API Broken Authentication

## Overview

APIs authenticate every request, usually with a bearer token, so a single
authentication weakness compromises the whole surface. This skill checks the
mechanism itself: whether the server actually verifies the token's signature and
claims, whether tokens expire and can be revoked, and whether token-issuing
endpoints resist stuffing and brute force. Proof is obtained with **your own test
tokens and accounts**, favouring signature/claim manipulation over volume.

## Authorization & scope

**Run only against APIs you are explicitly authorized to test.** Forge and tamper
only with tokens issued to **your** test accounts. Keep any brute-force or
credential-stuffing demonstration to a **capped, low rate against test accounts
you control** and coordinate with the operator — never run a real password spray
against real users. Do not exfiltrate other users' data if a bypass succeeds;
capture one non-sensitive field as proof and stop.

## Preconditions

- A valid token for a test account, plus the token format (inspect the JWT header)
  and the login / token / refresh endpoints.
- A JWT tool (`jwt` CLI, `jwt_tool`, or a small script) and a request replayer.

## Procedure

1. **Decode the token.** Read the JWT header and claims. Note `alg`, `kid`,
   `exp`, `iat`, `sub`, `aud`, and any role/tenant claims.
2. **Signature verification test.** Prove the server checks the signature:
   ```bash
   # tamper one claim byte and replay; a 200 means the signature isn't verified
   curl -s -H "Authorization: Bearer $TAMPERED_JWT" \
        https://TARGET/api/v2/user/profile -o /dev/null -w "%{http_code}\n"
   ```
3. **`alg` confusion.** Try `alg: none` (strip the signature) and, where an RS256
   public key is discoverable, an RS256→HS256 downgrade signing with that public
   key as the HMAC secret. A `200` confirms broken verification.
4. **Weak secret.** For HS256, attempt an offline dictionary crack of the signing
   secret against the captured token; a hit means you can mint arbitrary tokens.
5. **Expiry & revocation.** Replay an old/`exp`-past token; use a token after
   logout. Acceptance means no expiry enforcement or no server-side revocation.
6. **Claim trust.** Change a role/tenant/`sub` claim (only meaningful if 2–4
   found a forge path) to test whether authorization trusts unverified claims.
7. **Endpoint resilience (capped).** Against a **test account**, send a small,
   rate-limited series of bad credentials / OTP guesses to check for lockout and
   throttling on login, token, refresh, and reset endpoints.
8. **Record** each finding with the exact token/claim manipulation and the fix:
   verify signatures with a pinned algorithm, enforce `exp`, revoke on logout, and
   rate-limit + lock out auth endpoints.

## Paired defense / offense

Pairs with **api-authentication-monitoring**. Forgery attempts, `alg:none` /
downgrade tokens, and bursts of failed auth are the detection surface. When
validating together, confirm the monitoring flags the invalid-signature spike and
the capped credential-stuffing burst you generate.

## Validation

Reproduce against **OWASP crAPI** in a lab:

1. Stand up crAPI and authenticate a test user to obtain a JWT.
2. Inspect the JWT; attempt an `alg`/signature manipulation against a
   profile endpoint and observe whether the tampered token is accepted.
3. Against a test account, run a small capped credential-stuffing burst on the
   login endpoint and note whether lockout/throttling engages.

**Validated 2026-08-05 against OWASP crAPI.** Against `GET /identity/api/v2/user/dashboard`, a token with its `role` claim tampered to `admin` (original signature retained) **and** an `alg:none` unsigned token were **both accepted (HTTP 200)** — the identity service does not verify the JWT signature. Additionally, 40 rapid failed logins produced no lockout (see `api-unrestricted-resource-consumption`).

## References

- OWASP API Security Top 10 — API2:2023 Broken Authentication
- OWASP: A07:2021 Identification and Authentication Failures; JWT Cheat Sheet
- MITRE ATT&CK T1110 Brute Force; T1078 Valid Accounts
- CWE-287 Improper Authentication; CWE-345; CWE-347 Improper Verification of
  Cryptographic Signature
