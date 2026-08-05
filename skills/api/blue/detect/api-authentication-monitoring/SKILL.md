---
name: api-authentication-monitoring
description: >-
  Detect Broken Authentication abuse (API2:2023) against an API from auth-endpoint
  telemetry and token-validation events — invalid-signature spikes, alg:none /
  downgrade tokens, expired/replayed tokens, and credential stuffing or brute
  force. Use when building API authentication detections or triaging suspected
  token forgery or account takeover.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1110, T1078]
  capec: [CAPEC-115]
  cwe: [CWE-287, CWE-347]
  owasp: ["A07:2021"]
  d3fend: [D3-UBA]
pairs_with: [api-broken-authentication]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# API authentication monitoring

## Overview

Authentication attacks against APIs are noisy in the right telemetry: the server
rejects forged tokens and failed logins, and those rejections cluster. This skill
detects token-forgery attempts (invalid signature, `alg:none`, algorithm
downgrade), token misuse (expired/revoked tokens still presented), and volumetric
credential stuffing / brute force against login, token, refresh, and reset
endpoints. It depends on the auth layer logging *why* a token or credential was
rejected — not just that a request 401'd.

## Authorization & scope

Passive analysis of authentication telemetry from APIs you operate. Auth logs
contain principal identifiers and source metadata — treat as sensitive. Never log
raw tokens, passwords, OTPs, or signing secrets; key detections on validation
*outcomes* and metadata.

## Preconditions

- Token-validation events tagged with the failure reason: `bad_signature`,
  `alg_none`, `alg_mismatch`, `expired`, `revoked`, `unknown_kid`.
- Auth-endpoint access logs (login/token/refresh/reset) with principal or
  username-hash, source ip/asn, user-agent, and outcome.
- A SIEM for aggregation and alerting.

## Procedure

1. **Invalid-signature / forgery spike.** Alert on any non-trivial rate of
   `bad_signature`, `alg_none`, or `alg_mismatch` — these should be ~zero in
   normal operation:
   ```
   index=api event=token_validate result IN ("bad_signature","alg_none","alg_mismatch")
   | stats count by result, src_ip, principal_id
   | where count > 3
   ```
2. **Expired/revoked replay.** Flag repeated presentation of `expired` or
   `revoked` tokens from one source — a sign of token theft or missing client-side
   expiry handling worth triaging.
3. **Unknown `kid`.** Requests referencing a signing-key id you never issued
   indicate probing for an accepted verification path.
4. **Credential stuffing.** On login/token endpoints, alert on high failed-auth
   counts with **many usernames from one source** (stuffing) or **many sources for
   one username** (targeted brute force / distributed spray):
   ```
   index=api endpoint="/login" outcome=fail
   | stats dc(user_hash) as users, count as attempts by src_ip
   | where attempts > 50 and users > 20
   ```
5. **Reset/OTP abuse.** Watch for bursts of password-reset or OTP-verify calls per
   account or per source — enumeration and OTP brute force.
6. **Success-after-failures.** A successful auth immediately following a failure
   burst for the same account is a likely takeover; escalate.

## Detection engineering notes

- Distinguishing forgery from client bugs requires the **validation failure
  reason**; a plain 401 count conflates expired sessions with active attacks.
- Baseline failed-auth rates per endpoint and per source class (mobile app vs.
  web vs. partner integration) so legitimate retry storms don't page you.

## Paired offense / defense

Pairs with **api-broken-authentication**. Its `alg:none`/downgrade tokens surface
as forgery events (step 1) and its capped credential-stuffing burst as step 4.

## Validation

Reproduce against **OWASP crAPI** in a lab:

1. Stand up crAPI with token-validation and auth-endpoint logging into your SIEM.
2. Run the paired `api-broken-authentication` procedure (token manipulation +
   capped stuffing).
3. Confirm the invalid-signature spike and the failed-auth fan-out both alert.

Promote to `validated` once both detections fire on the paired run.

## References

- OWASP API Security Top 10 — API2:2023 Broken Authentication
- OWASP: A07:2021 Identification and Authentication Failures
- MITRE ATT&CK T1110 Brute Force; T1078 Valid Accounts; D3FEND D3-UBA
- CWE-287 Improper Authentication; CWE-347 Improper Verification of Signature
