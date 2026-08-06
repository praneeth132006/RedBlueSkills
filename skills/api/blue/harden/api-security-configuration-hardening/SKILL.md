---
name: api-security-configuration-hardening
description: >-
  Harden a REST or GraphQL API against Security Misconfiguration (API8:2023). Use
  when establishing a secure configuration baseline: strict CORS, a global error
  handler that never leaks internals, a security-header set, removal or
  authentication of debug/management/introspection endpoints, safe HTTP methods,
  and TLS enforcement — plus the config-drift checks that keep it that way.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1595.002, T1592.002]
  capec: [CAPEC-541]
  cwe: [CWE-16, CWE-756, CWE-942]
  owasp: ["A05:2021"]
  d3fend: [D3-PH, D3-ACH]
pairs_with: [api-security-misconfiguration]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# API security-configuration hardening

## Overview

Misconfiguration is prevented by making the secure state the *default* state and
by detecting drift away from it. This skill defines a configuration baseline for
APIs — CORS locked to an allowlist (never a reflected origin with credentials), a
global error handler that returns opaque messages while logging detail
server-side, a standard security-header set, management/debug/introspection
surfaces removed in production or placed behind authentication, a minimal HTTP
method allowlist, and enforced TLS — and the automated checks (CI scans, external
header probes) that flag regressions before an attacker finds them.

## Authorization & scope

Defensive configuration of APIs you operate. Configuration exports and error logs
may contain internal hostnames and secrets — handle under your normal
data-handling policy. No active testing of systems you do not own.

## Preconditions

- Access to the API gateway / framework configuration and deployment manifests.
- An inventory of environments (dev/stage/prod) so debug features can be gated to
  non-prod only.
- A CI pipeline where a configuration/header check can gate merges.

## Procedure

1. **CORS allowlist.** Reflect an origin only if it is in an explicit allowlist;
   never combine a wildcard or reflected origin with
   `Access-Control-Allow-Credentials: true`. Restrict allowed methods/headers to
   what the API actually needs.
2. **Global error handler.** Catch all unhandled exceptions and return a generic,
   structured error (stable code + request id) with **no** stack trace, SQL,
   framework version, or file path. Log the full detail server-side, keyed by the
   request id.
3. **Security-header baseline.** Set (as applicable to an API): `Strict-Transport-
   Security`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` on
   sensitive responses, a restrictive `Content-Security-Policy`/`frame-ancestors`
   for any HTML surface, and remove `Server`/`X-Powered-By` version disclosure.
4. **Gate management surfaces.** Disable or authenticate `/actuator`, `/debug`,
   metrics, heapdump, GraphQL introspection/GraphiQL, and Swagger UI in
   production; bind them to an internal network or require an admin credential.
5. **Method & TLS discipline.** Allowlist HTTP methods per route; disable `TRACE`
   and unintended `PUT`/`DELETE`. Redirect HTTP→HTTPS, require TLS 1.2+, and
   remove default/example credentials from every component.
6. **Prevent drift.** Add a CI check (config lint + an external header/CORS probe
   against preview deployments) that fails the build on a missing header, a
   reflected-credentialed CORS response, or an exposed management endpoint.
7. **Detect at runtime.** Alert on requests to management/debug paths in
   production, on foreign-origin preflights that would have been reflected, and on
   spikes of `5xx` carrying oversized bodies (possible verbose-error probing).

## Detection engineering notes

- Treat the **CI header/CORS probe** as the primary control — it catches
  regressions before deploy, where runtime alerts only catch them after exposure.
- Alert on any production hit to `/actuator`, `/debug`, `/graphql` introspection,
  or `/swagger` — legitimate traffic to these in prod should be near zero once
  gated.

## Paired offense / defense

Pairs with **api-security-misconfiguration**. Run that recon skill against a
preview deployment: every finding it reports (credentialed CORS, verbose error,
exposed console, dangerous method) should be closed by the corresponding control
here, and its probe traffic should trip the runtime alerts.

## Validation

Reproduce against a lab API brought from a misconfigured baseline to the hardened
one (e.g. a Spring Boot app with `/actuator` initially exposed):

1. Confirm the paired recon skill first finds credentialed CORS, a verbose error,
   and an exposed management endpoint.
2. Apply the baseline controls above.
3. Re-run the recon skill and confirm each finding is now closed — CORS not
   reflected, errors opaque, management endpoints authenticated/removed — while
   legitimate API calls still succeed.

**Status: reviewed (2026-08-06).** The paired `api-security-misconfiguration` recon
skill is `validated` against OWASP crAPI, where it found real header-level
misconfigurations (server-version disclosure, missing HSTS/CSP) and confirmed
crAPI's already-correct CORS/nosniff/frame-deny. This baseline closes those gaps,
but proving each control (CORS lockdown, opaque errors, gated management surfaces)
end-to-end needs a from-misconfigured-to-hardened target, so this skill stays
`reviewed`.

## References

- OWASP API Security Top 10 — API8:2023 Security Misconfiguration
- OWASP: A05:2021 Security Misconfiguration; Secure Headers Project; CORS guidance
- MITRE ATT&CK T1595.002, T1592.002; D3FEND D3-PH (Platform Hardening), D3-ACH (Application Configuration Hardening)
- CAPEC-541; CWE-16, CWE-756, CWE-942
