---
name: web-broken-authentication
description: >-
  Assess authentication weaknesses in a web application during an authorized
  test — credential stuffing/brute-force exposure, weak lockout and rate limits,
  username enumeration, weak password/session policy, and flawed reset flows. Use
  to characterize how resilient login and session management are to takeover.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: credential-access
techniques:
  attack: [T1110, T1110.004, T1078]
  capec: [CAPEC-49, CAPEC-600]
  cwe: [CWE-287, CWE-307, CWE-620]
  owasp: ["A07:2021"]
  d3fend: []
pairs_with: [web-authentication-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web broken authentication

## Overview

Authentication is broken when the login, session, or recovery mechanisms let an
attacker guess, replay, or bypass credentials. This skill characterizes the
controls that stop account takeover — rate limiting and lockout, username
enumeration, credential-stuffing resistance, session token strength/handling, and
the password-reset flow — using bounded, non-destructive probes against test
accounts.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Use accounts
provisioned for the engagement and **your own** credentials for guessing tests.
Do **not** run large-scale brute-force or stuffing against real user accounts —
demonstrate the *absence of controls* with a small, bounded number of attempts,
then stop. Never test reset flows against real users' email/phone.

## Preconditions

- At least one test account you control and, ideally, a known-valid + known-invalid
  username to compare responses.
- A proxy or scripting for controlled, low-volume request replay.

## Procedure

1. **Username enumeration.** Compare responses for a valid vs invalid username on
   login, registration, and reset — differences in message text, status, or
   *timing* leak account existence.
   ```bash
   # compare body + timing for valid vs invalid user, fixed wrong password
   curl -s -o /dev/null -w '%{size_download} %{time_total}\n' -d 'user=valid&pass=x' https://TARGET/login
   curl -s -o /dev/null -w '%{size_download} %{time_total}\n' -d 'user=nobody&pass=x' https://TARGET/login
   ```
2. **Rate limit / lockout.** Send a small, bounded burst of failed logins for a
   *test* account and observe whether lockout, CAPTCHA, or throttling engages.
   Record the threshold (or its absence) — do not lock out real users.
3. **Credential-stuffing surface.** Note whether login lacks MFA, allows unlimited
   IPs, and returns distinguishable success/failure — the conditions stuffing
   relies on.
4. **Session management.** Inspect the session cookie/token: `Secure`, `HttpOnly`,
   `SameSite`; entropy/predictability; whether it rotates on login and is
   invalidated on logout; JWT `alg`/expiry if applicable.
5. **Password policy & reset.** Check minimum strength, whether reset tokens are
   long-lived/guessable/reusable, and whether the flow leaks or lets you set a
   password without proving control of the account.
6. **Prove impact minimally.** e.g. "login has no lockout after N failed test
   attempts and enumerates usernames by timing" — with the evidence, not a full
   compromise of a real account.
7. **Record** each weakness, evidence, and remediation (uniform responses,
   lockout+throttling, MFA, strong session flags and rotation, single-use
   time-boxed reset tokens).

## Paired defense / offense

Pairs with **web-authentication-hardening**. Failed-login spikes, distributed
low-and-slow attempts, and reset-flow abuse are the detection/prevention surface;
lockout, MFA, and uniform responses are the controls. When validating together,
confirm the hardening controls change the outcomes you measured here.

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. `cd _lab && docker compose up -d juice-shop`.
2. Submit a small burst of failed logins for a test account and confirm whether
   any throttling/lockout engages.
3. Inspect the issued session token flags and compare valid vs invalid login
   responses for enumeration signals.

## References

- OWASP: Authentication Cheat Sheet; A07:2021 Identification and Authentication Failures
- MITRE ATT&CK T1110 — Brute Force; T1078 — Valid Accounts
- CWE-287 — Improper Authentication; CWE-307 — Improper Restriction of Excessive Auth Attempts
- PortSwigger Web Security Academy — Authentication
