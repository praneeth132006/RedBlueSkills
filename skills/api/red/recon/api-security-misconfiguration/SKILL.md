---
name: api-security-misconfiguration
description: >-
  Discover and characterize API Security Misconfiguration (API8:2023) during an
  authorized assessment — permissive CORS, verbose error/stack-trace leakage,
  missing security headers, unauthenticated debug/actuator endpoints, default
  credentials, dangerous HTTP methods, and unpatched framework defaults. Use when
  fingerprinting an API's configuration hygiene and turning misconfigurations into
  concrete, demonstrable weaknesses.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: recon
techniques:
  attack: [T1595.002, T1592.002]
  capec: [CAPEC-541]
  cwe: [CWE-16, CWE-756, CWE-942]
  owasp: ["A05:2021"]
  d3fend: []
pairs_with: [api-security-configuration-hardening]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-crapi
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# API security misconfiguration

## Overview

Security misconfiguration is the broadest API category: the endpoints are coded
correctly but the surrounding configuration leaks information or grants access it
shouldn't. Typical findings are permissive CORS (`Access-Control-Allow-Origin`
reflected with credentials), verbose errors that return stack traces and internal
paths, missing transport/security headers, unauthenticated debug consoles
(`/actuator`, `/debug`, `/__debug__`, GraphQL introspection/GraphiQL in prod),
default or example credentials, and dangerous HTTP methods (`TRACE`, `PUT`,
`PATCH` where unintended). This skill fingerprints those conditions and
demonstrates the concrete risk each one creates, without weaponizing them beyond
proof.

## Authorization & scope

**Run only against APIs you are explicitly authorized to test.** This is largely
low-touch reconnaissance — header inspection, error triggering, option probing —
but it can reach non-production consoles: **do not execute state-changing actions
through an exposed debug/admin endpoint** to "prove" it; a screenshot/`200` of the
unauthenticated console is sufficient. Never use discovered default credentials to
pivot beyond a single authentication confirmation, and never trigger errors that
could corrupt data.

## Preconditions

- The API base URL(s) and any discovered hostnames/subdomains.
- A proxy to inspect full response headers and bodies.
- The tech stack (from fingerprinting) so probes target the right defaults
  (Spring `/actuator`, Django debug, Rails, Express `x-powered-by`, etc.).

## Procedure

1. **Header hygiene.** Inspect responses for missing/weak security headers and
   information leakage:
   ```bash
   curl -sI "https://TARGET/api/v1/health"   # Server, X-Powered-By, HSTS, CORS, cache
   ```
   Note `Server`/`X-Powered-By` version disclosure, absent HSTS, and permissive
   `Access-Control-Allow-Origin`.
2. **CORS misconfiguration.** Reflect a foreign origin and check whether it is
   echoed with credentials allowed:
   ```bash
   curl -s -I -H "Origin: https://evil.example" "https://TARGET/api/v1/me" \
     | grep -i 'access-control-allow-'
   ```
   `Access-Control-Allow-Origin: https://evil.example` **with**
   `Access-Control-Allow-Credentials: true` is a credentialed-CORS finding.
3. **Verbose errors.** Send malformed input (bad JSON, wrong types, oversized
   ids) and capture whether responses leak stack traces, SQL, framework versions,
   or internal file paths.
4. **Exposed management/debug surfaces.** Probe common consoles and metadata:
   `/actuator/{env,health,heapdump,mappings}`, `/debug`, `/swagger.json`,
   `/openapi.json`, `/graphql` introspection, `/.git/`, `/metrics`. Record any
   that respond unauthenticated.
5. **HTTP method surface.** `OPTIONS` for the allowed set; test whether `TRACE`,
   `PUT`, or `DELETE` are enabled where they shouldn't be.
6. **Defaults & TLS.** Check for default/example credentials on any admin surface
   (single confirming login only) and weak TLS/redirect configuration
   (HTTP not redirected to HTTPS, TLS 1.0/1.1 accepted).
7. **Record** each misconfiguration with the exact evidence, the concrete risk it
   enables (e.g. credentialed CORS → cross-site data theft; heapdump → secret
   exposure), and the corresponding fix.

## Paired defense / offense

Pairs with **api-security-configuration-hardening**. Each item you find maps
directly to one control in that skill — a strict CORS policy, a global error
handler, a security-header baseline, and authenticated/removed management
endpoints. The probes you send (foreign-origin preflights, hits to
`/actuator`/introspection) are also the signals its detections watch for.

## Validation

Reproduce against a deliberately misconfigured lab API (**OWASP crAPI**, a
default-config Spring Boot app with `/actuator` exposed, or **VAmPI**):

1. Stand up the target with development defaults left on.
2. Confirm at least three classes of finding: a permissive/credentialed CORS
   header, a verbose error leaking a stack trace, and an unauthenticated
   management or introspection endpoint.
3. Record evidence for each without performing any state-changing action through
   the exposed surfaces.

**Validated 2026-08-06 against OWASP crAPI.** The recon procedure ran cleanly and
discriminated correctly on a live target: it found **technology/version disclosure**
(`Server: gunicorn` on the workshop service) and **missing transport-security
headers** (no `Strict-Transport-Security`, no `Content-Security-Policy`) across API
responses, while correctly confirming crAPI's identity service is *hardened* on the
classes it does cover — a foreign `Origin` is rejected (`403`, not reflected with
credentials), `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` are
present, `TRACE` returns `405`, malformed input yields an opaque `400` (no stack
trace), and `/actuator`/`/v3/api-docs` are auth-gated (`401`). crAPI is deliberately
well-configured here, so the higher-impact classes (permissive/credentialed CORS,
verbose stack-trace errors, an unauthenticated management console) should be
reproduced against a default-config Spring Boot instance with `/actuator` exposed or
against **VAmPI**; the procedure itself is proven end-to-end.

## References

- OWASP API Security Top 10 — API8:2023 Security Misconfiguration
- OWASP: A05:2021 Security Misconfiguration
- OWASP REST Security & CORS guidance
- MITRE ATT&CK T1595.002, T1592.002; CAPEC-541
- CWE-16 Configuration; CWE-756 Missing Custom Error Page; CWE-942 Permissive CORS
