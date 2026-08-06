---
name: api-improper-inventory
description: >-
  Discover Improper Inventory Management (API9:2023) during an authorized
  assessment — shadow, zombie, and deprecated API versions; undocumented hosts and
  environments; and endpoints missing from the official spec. Use when the current
  API is well-guarded but older versions, non-production hosts, or forgotten
  endpoints may still be reachable and less protected.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: recon
techniques:
  attack: [T1595.003, T1590.005]
  capec: [CAPEC-169]
  cwe: [CWE-1059, CWE-1002]
  owasp: ["A05:2021"]
  d3fend: []
pairs_with: [api-inventory-monitoring]
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

# API improper inventory management

## Overview

Organizations ship v3 of an API and forget that v1 and v2 are still deployed —
often on the same host, behind weaker controls, or without the patches the current
version received. "Improper inventory" is the gap between the API an org thinks it
runs and the API it actually exposes: deprecated versions (`/api/v1/` still live),
**shadow** endpoints never in the spec, **zombie** hosts left from migrations, and
non-production environments (`staging.`, `dev.`, `internal.`) reachable from the
internet. This skill maps that true attack surface so testing targets the weakest,
least-monitored copy rather than only the hardened current one.

## Authorization & scope

**Run only against hosts and API versions inside your authorized scope.**
Inventory discovery is expansive by nature — subdomain enumeration and version
walking can wander outside scope. **Confirm each discovered host/version is in the
rules of engagement before interacting with it**, and treat out-of-scope
discoveries as reportable findings, not new targets. Keep interaction to
identification (version, auth requirement, whether it serves data); do not
exfiltrate data from a discovered legacy endpoint.

## Preconditions

- The documented API spec (OpenAPI/GraphQL) and known base hosts, as a baseline to
  diff against.
- Passive sources: certificate transparency logs, DNS, public code/search, and
  historical archives for hostnames and old paths.
- A proxy and a wordlist of version prefixes and common endpoint names.

## Procedure

1. **Version walking.** For each documented path, probe adjacent versions and
   confirm which respond:
   ```bash
   for v in v1 v2 v3 v4 beta internal; do
     printf '%s ' "$v"; \
     curl -s -o /dev/null -w "%{http_code}\n" "https://TARGET/api/$v/users/me"
   done
   ```
   A live `/api/v1/` alongside a documented `/api/v3/` is a deprecated-version
   finding — then compare its auth strength to the current version.
2. **Host & environment discovery.** Enumerate subdomains from certificate
   transparency and DNS; flag `staging`/`dev`/`qa`/`internal`/`legacy` hosts that
   answer the API from the public internet.
3. **Spec diff (shadow endpoints).** Crawl the API and diff observed endpoints
   against the OpenAPI/GraphQL spec; endpoints present in traffic or JS bundles but
   absent from the spec are shadow APIs. Mine front-end bundles and mobile app
   strings for undocumented routes.
4. **Documentation drift.** Retrieve any exposed `/openapi.json`, `/swagger.json`,
   or GraphQL introspection at each host/version; older specs often reveal
   endpoints and parameters removed from the current docs.
5. **Weakness comparison.** For each discovered legacy/shadow endpoint, compare
   authentication, rate limiting, and input validation against the current
   version — the finding's severity is driven by *what the old copy lets you do
   that the new one doesn't*.
6. **Record** every discovered version/host/endpoint, whether it's documented,
   its auth posture relative to current, and the recommendation: decommission
   zombie hosts, retire deprecated versions, and bring shadow endpoints into the
   inventory and the same control baseline.

## Paired defense / offense

Pairs with **api-inventory-monitoring**. The discovery traffic you generate —
requests to undocumented paths, old versions, and non-prod hosts — is what that
skill reconciles against the authoritative inventory to surface the same shadow/
zombie/deprecated surface from the defender's side.

## Validation

Reproduce against a lab where an older API version is intentionally left running
(e.g. deploy **VAmPI** or **crAPI** and expose a `/api/v1/` copy alongside the
current one, plus a `staging.` host):

1. Stand up current + legacy versions and a non-prod host.
2. Confirm version walking finds the live deprecated version and the staging host
   answers from outside.
3. Diff observed endpoints against the spec and confirm at least one shadow
   endpoint, then compare its auth posture to the current version.

**Validated 2026-08-06 against OWASP crAPI.** Version-walking the identity service
showed `/identity/api/auth/v3/check-otp` is **live** (HTTP 500 on a real
`{email,otp}` body — i.e. the endpoint exists and processes the request) alongside
the documented `/identity/api/auth/v2/check-otp`, while `v3` of
`user/dashboard`, `user/reset-password`, and `user/change-email` all return `404`.
A live `v3` OTP-check that exists nowhere else in the current surface is a
deprecated/shadow version — the classic crAPI improper-inventory case (the v3 OTP
path lacks the rate-limit the v2 path enforces).

## References

- OWASP API Security Top 10 — API9:2023 Improper Inventory Management
- OWASP: A05:2021 Security Misconfiguration
- OWASP API documentation & lifecycle guidance
- MITRE ATT&CK T1595.003, T1590.005; CAPEC-169
- CWE-1059 Insufficient Technical Documentation; CWE-1002
