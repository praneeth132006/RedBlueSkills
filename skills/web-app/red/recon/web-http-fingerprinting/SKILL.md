---
name: web-http-fingerprinting
description: >-
  Fingerprint a web application's stack — server, framework, language, WAF, and
  exposed metadata — during authorized recon. Use at the start of a web
  assessment to map the technology surface and prioritize follow-on testing with
  low-noise, passive-first techniques.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: recon
techniques:
  attack: [T1595.002, T1592.002]
  capec: [CAPEC-170]
  cwe: [CWE-200]
  owasp: ["A05:2021"]
  d3fend: []
pairs_with: [web-security-headers]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-20
  validated_by: praneeth132006
license: Apache-2.0
---

# Web HTTP fingerprinting

## Overview

Before testing a web target, map what it is built on: web server, application
framework, language runtime, reverse proxy / CDN, WAF, and any version or
configuration metadata leaked in responses. This skill favours passive and
low-noise observation so that recon does not itself trip defenses, and turns the
findings into a prioritized surface for later stages.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Confirm the
host is in scope before sending traffic. Fingerprinting is low-risk but not
zero-noise — respect rate limits in the rules of engagement and avoid
aggressive active scanners against production during business hours unless the
SOW permits it.

## Preconditions

- A reachable base URL.
- Tooling: `curl`, `httpx`/`whatweb`/`wappalyzer`, and optionally `nmap` with
  `http-*` scripts for deeper service detection.

## Procedure

1. **Read the response headers** — the richest passive source.
   ```bash
   curl -sI https://TARGET | grep -iE 'server|x-powered-by|via|x-aspnet|set-cookie|x-'
   ```
   Note `Server`, `X-Powered-By`, framework cookies (`JSESSIONID`, `PHPSESSID`,
   `csrftoken`, `connect.sid`), and CDN/WAF markers (`cf-ray`, `x-amz-cf-id`).
2. **Trigger error pages** for stack traces / default templates (a 404 and a
   malformed request often reveal the framework).
3. **Check well-known paths** that leak stack metadata: `/robots.txt`,
   `/.well-known/`, `/sitemap.xml`, `/favicon.ico` hash, `/server-status`.
4. **Passive tech detection:**
   ```bash
   whatweb https://TARGET
   httpx -u https://TARGET -title -tech-detect -server -status-code
   ```
5. **WAF detection** (informs later payload encoding):
   ```bash
   wafw00f https://TARGET
   ```
6. **Correlate** findings into a stack profile (e.g. "Express/Node behind
   Cloudflare, Angular SPA front end") and list the highest-value follow-ups.

## Paired defense / offense

Pairs with **web-security-headers**. Every leaked `Server`/`X-Powered-By`
header, verbose error, and default path this skill harvests is exactly what the
hardening skill removes or suppresses. Validating them together shows the
fingerprint surface shrinking as headers and error handling are hardened.

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. `cd _lab && docker compose up -d juice-shop`.
2. `curl -sI http://localhost:3000` reveals `X-Powered-By: Express` and a
   `Feature-Policy` header, and the app is a detectable Angular SPA.
3. Confirm `whatweb`/`httpx` identify Node/Express + Angular.

## References

- OWASP: Web Security Testing Guide — Information Gathering
- MITRE ATT&CK T1595.002 — Active Scanning: Vulnerability Scanning
- CWE-200 — Exposure of Sensitive Information to an Unauthorized Actor
