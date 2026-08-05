---
name: web-authentication-hardening
description: >-
  Harden a web application's authentication and session management against
  takeover — rate limiting and lockout, MFA, credential-stuffing resistance,
  uniform responses, and strong session handling. Use to establish or remediate a
  secure login, session, and password-reset baseline.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1110, T1078]
  capec: [CAPEC-49, CAPEC-600]
  cwe: [CWE-287, CWE-307, CWE-620]
  owasp: ["A07:2021"]
  d3fend: [D3-MFA, D3-ANCI]
pairs_with: [web-broken-authentication]
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

# Web authentication hardening

## Overview

Account takeover is prevented by layering controls: make guessing expensive
(throttling, lockout, MFA), remove oracles (uniform responses, no username
enumeration), and make sessions and resets robust. This skill defines the control
baseline that neutralizes the weaknesses the paired offensive skill probes for,
plus the telemetry to detect attacks in progress.

## Authorization & scope

Defensive configuration of systems you operate. Tune lockout/throttling to avoid
self-inflicted denial of service against legitimate users. No offensive
authorization needed.

## Preconditions

- Control over the authentication service / IdP configuration and session
  framework.
- Access to authentication logs for monitoring.

## Procedure

1. **Throttle & lock out.** Apply per-account and per-IP rate limits with
   exponential backoff; lock or step-up (CAPTCHA/MFA) after a small number of
   failures. Prefer temporary account throttling over permanent lockout to avoid
   DoS.
2. **Require MFA** for privileged accounts and offer it to all; this is the single
   most effective control against credential stuffing.
3. **Uniform responses.** Return identical messages, status codes, and *timing*
   for valid vs invalid usernames on login, registration, and reset — eliminate
   enumeration oracles.
4. **Credential hygiene.** Enforce screening against known-breached password lists,
   sane minimum length, and no composition rules that reduce entropy; support
   password managers (no paste-blocking).
5. **Session management.** Set cookies `Secure`, `HttpOnly`, `SameSite=Lax/Strict`;
   use high-entropy tokens; rotate on privilege change/login; invalidate
   server-side on logout and after reset; set sensible idle/absolute timeouts.
6. **Reset flow.** Single-use, time-boxed, unguessable reset tokens delivered
   out-of-band; never reveal whether an account exists; require re-auth for
   email/password changes.
7. **Monitor.** Alert on failed-login spikes, distributed low-and-slow attempts,
   and reset abuse:
   ```
   index=auth action=login result=failure
   | bin _time span=5m | stats count by user, _time
   | where count > 10
   ```
8. **Verify** by re-running the paired offense skill and confirming lockout/MFA
   engage and enumeration signals are gone.

## Paired offense / defense

Pairs with **web-broken-authentication**. Each weakness that skill measures maps
to a control here: enumeration → uniform responses; no lockout → throttling;
stuffing → MFA; weak sessions → the cookie/rotation baseline.

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. `cd _lab && docker compose up -d juice-shop` and front login with your
   throttling/lockout control.
2. Re-run the paired `web-broken-authentication` failed-login burst and confirm
   throttling/lockout now engages.
3. Confirm valid vs invalid username responses are now indistinguishable in body
   and timing.

## References

- OWASP: Authentication Cheat Sheet; Session Management Cheat Sheet; A07:2021
- MITRE D3FEND D3-MFA (Multi-factor Authentication)
- CWE-307 — Improper Restriction of Excessive Authentication Attempts
- NIST SP 800-63B — Digital Identity Guidelines
