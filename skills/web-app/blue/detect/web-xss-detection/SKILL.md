---
name: web-xss-detection
description: >-
  Detect cross-site scripting attempts and successful injection against a web
  application using request telemetry, Content-Security-Policy violation reports,
  and output-context analysis. Use when tuning XSS detections, triaging a
  suspected XSS alert, or hunting for injection into reflected or stored sinks.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1189, T1059.007]
  capec: [CAPEC-591]
  cwe: [CWE-79]
  owasp: ["A03:2021"]
  d3fend: [D3-NTA]
pairs_with: [web-reflected-xss]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-20
  validated_by: praneeth132006
license: Apache-2.0
---

# Web XSS detection

## Overview

Detect cross-site scripting by combining server-side request telemetry (payload
patterns in parameters, headers, and stored fields) with a browser-side signal
most defenders under-use: **Content-Security-Policy violation reports**. A strict
CSP with a `report-to` endpoint turns every blocked inline script into a
high-fidelity alert, complementing noisier request-pattern matching.

## Authorization & scope

Passive analysis of telemetry from systems you operate. CSP reports and request
logs may include attacker payloads and, for stored XSS, user content — handle
per your data-classification policy and sanitize before sharing.

## Preconditions

- Web/WAF request logs.
- A CSP deployed in at least `report-only` mode with a collection endpoint
  (`report-to` / `report-uri`).
- For stored XSS: access to the datastore or app logs where user content lands.

## Procedure

1. **Request-pattern detection** — search parameter *values* for markup and
   handlers (normalize case and URL/HTML-entity decode first):
   - `<script`, `</script`, `onerror=`, `onload=`, `onmouseover=`, `javascript:`
   - `<img`, `<svg`, `<iframe`, `document.cookie`, `eval(`, `fromCharCode`
   ```
   index=web sourcetype=access
   | eval v=urldecode(uri_query)
   | where match(lower(v), "(<script|onerror\s*=|onload\s*=|javascript:|<svg|<iframe|document\.cookie)")
   | stats count by src_ip, uri_path, v
   ```
2. **CSP violation reports** — the highest-fidelity signal. Ingest the report
   endpoint and alert on `blocked-uri`/`script-sample` for inline or off-origin
   scripts. A cluster of violations for one page + one user session is a strong
   exploitation indicator.
3. **Stored-XSS hunt** — scan user-controlled stored fields (profile names,
   comments, filenames) for the same markup patterns; stored XSS won't always
   appear in fresh request logs.
4. **Context awareness** — reduce false positives by correlating the reflected
   parameter with whether the app echoes it (a `<script>` in a field the app
   HTML-encodes is noise; the same in a field written raw to the DOM is a finding).
5. **Triage:** determine reflected vs stored, which output context, whether CSP
   blocked execution, and whether any session/cookie theft indicators followed.
6. **Escalate** on confirmed execution: invalidate affected sessions, remove the
   stored payload, patch the output-encoding gap, tighten CSP from report-only to
   enforcing.

## Detection engineering notes

- Deploy CSP `report-only` first to gather violations without breaking the app,
  then move to enforcing — this both hardens *and* generates detections.
- Pair request-pattern rules with the response: an attack that the app reflected
  *unencoded* is far higher priority than one that was neutralized.

## Paired offense / defense

Pairs with **web-reflected-xss**. Run that skill against the lab: its
character-probing and image-`onerror` marker should match rule step 1 and, once
a CSP is deployed, generate a violation report in step 2.

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. `cd _lab && docker compose up -d juice-shop`.
2. Run the paired `web-reflected-xss` procedure against the search field.
3. Confirm the payload matches the request-pattern rule, and (with a
   `report-only` CSP fronting the app) that a violation report is emitted.

## References

- MITRE ATT&CK T1059.007 — JavaScript
- OWASP: Cross Site Scripting Prevention & CSP Cheat Sheets
- W3C Content Security Policy Level 3 — reporting
