---
name: web-reflected-xss
description: >-
  Find and prove reflected cross-site scripting in a web application during an
  authorized assessment. Use when user-controlled input is echoed into an HTML,
  attribute, JavaScript, or URL context and you need to confirm script execution
  and demonstrate impact safely.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1189, T1059.007]
  capec: [CAPEC-591]
  cwe: [CWE-79]
  owasp: ["A03:2021"]
  d3fend: []
pairs_with: [web-xss-detection]
risk:
  level: medium
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

# Web reflected XSS

## Overview

Reflected cross-site scripting occurs when input from a request is returned in
the immediate response without proper output encoding, so an attacker-supplied
string is parsed as active content by the victim's browser. This skill locates a
reflection, identifies its output context, and crafts a context-appropriate,
**benign** proof of execution.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Before acting,
confirm the target is in scope and authorization is on file. Use a harmless
marker payload (e.g. a unique `alert`/`console.log` or DOM write) as proof —
never deliver a working credential-stealer, keylogger, or a payload aimed at
real third-party users. Do not send exploit links to anyone outside the
engagement team.

## Preconditions

- An input whose value appears somewhere in the response body (query param,
  fragment, form field, header reflected into an error page).
- Ability to view the raw response and, ideally, render it in a browser to
  confirm execution.

## Procedure

1. **Find the reflection.** Submit a unique, inert marker and grep the response
   for it.
   ```bash
   curl -s "https://TARGET/search?q=zzmarker123" | grep -n "zzmarker123"
   ```
2. **Identify the context** where the marker lands — each needs a different
   breakout:
   - HTML body: `<h1>zzmarker123</h1>` → inject a tag.
   - Attribute: `value="zzmarker123"` → break out with `">`.
   - JS string: `var x = "zzmarker123"` → break out with `";`.
   - URL/`href`: consider `javascript:` scheme.
3. **Test which characters survive** encoding: `<`, `>`, `"`, `'`, `/`, backtick.
   Whatever is *not* encoded defines the viable payload.
4. **Craft a minimal, benign proof** for the context, e.g. in HTML context:
   ```html
   <img src=x onerror="console.log('xss-proof-<engagement-id>')">
   ```
5. **Confirm execution** by rendering the URL in a controlled browser and
   observing the marker fire (console/DOM), not just its presence in source.
6. **Assess impact** conceptually: what a real payload could reach (session
   cookie without `HttpOnly`, CSRF token, DOM actions) — document it; do not
   weaponize it against real users.
7. **Record** the exact URL/request, the output context, the surviving
   characters, and remediation (context-aware output encoding + CSP).

## Paired defense / offense

Pairs with **web-xss-detection**. The reflection probes, angle brackets and
event-handler attributes in parameters, and any Content-Security-Policy
violation reports are the exact signals the detection skill keys on. Validate
both together: your benign payload should trip the WAF signature and/or generate
a `report-to` CSP violation.

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. `cd _lab && docker compose up -d juice-shop`.
2. The search bar reflects the `q` parameter into the DOM. An `<iframe src=...>`
   or image-onerror marker executes, confirming reflected/DOM XSS.
3. Confirm the same input is neutralized once a strict CSP (from the paired
   hardening skill) is applied.

## References

- OWASP: Cross Site Scripting Prevention Cheat Sheet
- MITRE ATT&CK T1189 — Drive-by Compromise; T1059.007 — JavaScript
- CWE-79 — Improper Neutralization of Input During Web Page Generation
- PortSwigger Web Security Academy — Cross-site scripting
