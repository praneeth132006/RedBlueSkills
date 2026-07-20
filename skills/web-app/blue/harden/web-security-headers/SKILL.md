---
name: web-security-headers
description: >-
  Harden a web application by suppressing stack-leaking response headers and
  deploying the security header set (CSP, HSTS, frame/content-type options,
  referrer and permissions policy). Use when reducing fingerprint surface,
  remediating information disclosure, or establishing a secure response baseline.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1595.002, T1592.002]
  capec: [CAPEC-170]
  cwe: [CWE-200, CWE-693]
  owasp: ["A05:2021"]
  d3fend: [D3-RTSD]
pairs_with: [web-http-fingerprinting]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-20
  validated_by: praneeth132006
license: Apache-2.0
---

# Web security headers & fingerprint reduction

## Overview

Two defensive wins in one baseline: (1) **remove** headers and error output that
leak your stack (`Server`, `X-Powered-By`, framework versions, verbose traces),
shrinking the recon surface; and (2) **add** the security header set that
constrains what browsers will do with your responses. This is the hardening
counterpart to attacker fingerprinting and a foundational control for XSS and
clickjacking defense.

## Authorization & scope

Configuration change to systems you operate. No target authorization needed.
Roll out behind a change window: CSP and HSTS can break functionality if
misconfigured — always stage CSP in `report-only` first and verify HSTS
preconditions before enabling `preload`.

## Preconditions

- Control over the web server, reverse proxy, or application response layer
  (nginx, Apache, Express/Helmet, Django, CDN edge rules).
- A test environment to stage CSP `report-only`.

## Procedure

1. **Suppress stack leakage:**
   - Remove `X-Powered-By` (`app.disable('x-powered-by')` in Express; `expose_php=Off`; `ServerTokens Prod` + `ServerSignature Off` in Apache; `server_tokens off` in nginx).
   - Return generic error pages; never expose stack traces in production.
2. **Deploy the security header baseline** (example, adapt values):
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   Content-Security-Policy: default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: geolocation=(), camera=(), microphone=()
   ```
3. **Stage CSP safely:** ship `Content-Security-Policy-Report-Only` with a
   `report-to` endpoint first (this also feeds the XSS-detection skill), fix
   violations, then switch to the enforcing header.
4. **Prefer nonces/hashes over `unsafe-inline`.** If inline scripts are
   unavoidable, use per-response nonces; treat `unsafe-inline`/`unsafe-eval` as
   temporary debt.
5. **Verify** with an external check:
   ```bash
   curl -sI https://TARGET | grep -iE 'strict-transport|content-security|x-content-type|x-frame|referrer|permissions-policy'
   ```
   Confirm `Server`/`X-Powered-By` no longer reveal versions.
6. **Baseline & monitor** — record the expected header set and alert on drift.

## Paired offense / defense

Pairs with **web-http-fingerprinting**. Run that skill before and after this
hardening: the `Server`/`X-Powered-By` leakage and default paths it harvests
should disappear or generalize, and `X-Frame-Options`/CSP `frame-ancestors`
should now block the framing and injection avenues it flags.

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. `cd _lab && docker compose up -d juice-shop`.
2. Confirm the baseline leaks `X-Powered-By: Express` (`curl -sI localhost:3000`).
3. Front the app with the lab's hardening proxy (nginx config in
   `_lab/hardening/`) applying the header set above; re-run the fingerprinting
   skill and confirm the surface shrinks and framing is blocked.

## References

- OWASP: Secure Headers Project; HTTP Headers Cheat Sheet
- MITRE D3FEND D3-RTSD — real-time service hardening
- CWE-693 — Protection Mechanism Failure; CWE-200 — Information Exposure
- MDN: Content-Security-Policy, Strict-Transport-Security
