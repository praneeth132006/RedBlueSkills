---
name: web-xxe-hardening
description: >-
  Harden a web application against XML external entity (XXE) injection by
  disabling DTD and external-entity processing in every XML parser, and detect
  attempts. Use when endpoints parse user-supplied XML (SOAP, SAML, SVG, Office
  documents, RSS) and you need to prevent file read and SSRF via entities.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1190]
  capec: [CAPEC-201]
  cwe: [CWE-611]
  owasp: ["A05:2021"]
  d3fend: [D3-IVV]
pairs_with: [web-xxe]
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

# Web XXE hardening

## Overview

XXE is eliminated at the parser: if the XML processor never resolves DTDs or
external entities, the class of attack disappears. This skill provides the
per-language parser configuration to disable those features safely, guidance for
formats that embed XML (SVG, Office, SAML), and detection for inbound
entity-bearing payloads.

## Authorization & scope

Defensive configuration of systems you operate. Disabling DTDs can affect XML that
legitimately relies on them (rare) — test parsing paths after applying. No
offensive authorization needed.

## Preconditions

- Inventory of every code path that parses XML, including transitive ones (SAML
  libraries, document/image processors, feed readers).
- Ability to change parser configuration in each language/runtime.

## Procedure

1. **Disable DTDs entirely** wherever possible — the strongest, simplest control.
   Examples:
   ```java
   // Java (DocumentBuilderFactory)
   dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
   dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
   dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
   dbf.setXIncludeAware(false);
   dbf.setExpandEntityReferences(false);
   ```
   ```python
   # Python: use defusedxml instead of the stdlib parser
   from defusedxml.ElementTree import fromstring   # blocks entities/DTD by default
   ```
   ```csharp
   // .NET
   var settings = new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null };
   ```
   ```php
   // PHP: modern libxml disables entity loading by default; do not re-enable it.
   // Never call libxml_disable_entity_loader(false) or LIBXML_NOENT on untrusted input.
   ```
2. **Cover embedded-XML formats.** Apply the same hardening to SAML processing,
   Office-document (OOXML) and SVG parsing, and any RSS/Atom readers.
3. **Constrain uploads.** Validate content types, and process SVG/Office files
   with libraries configured to reject external references.
4. **Defense in depth.** Combine with the SSRF egress controls (blocking
   internal ranges) so that even a missed parser can't reach metadata/internal
   hosts.
5. **Monitor.** Alert on inbound XML containing a DOCTYPE or external `SYSTEM`
   entity:
   ```
   index=web (content_type="*xml*" OR uri_path IN (<xml_endpoints>))
   | where match(request_body, "(?i)<!DOCTYPE|<!ENTITY|SYSTEM\s+\"(file|http|gopher|php)")
   | stats count by src_ip, uri_path
   ```
6. **Verify** by re-running the paired offense skill and confirming the parser
   rejects the DOCTYPE and no callback fires.

## Paired offense / defense

Pairs with **web-xxe**. Once DTD/entity processing is disabled, the offensive
skill's in-band file-read returns an error (not the file), and its OOB payload
produces no callback; both attempts match the detection rule.

## Validation

Reproduce in `_lab/`:

1. Configure the XML endpoint's parser to prohibit DTDs (step 1).
2. Re-run the paired `web-xxe` in-band and OOB payloads.
3. Confirm the file contents are no longer reflected and no OOB hit occurs, while
   legitimate XML still parses.

## References

- OWASP: XML External Entity Prevention Cheat Sheet; A05:2021
- MITRE D3FEND D3-IVV (Input Validation and Verification)
- CWE-611 — Improper Restriction of XML External Entity Reference
- defusedxml / language-specific secure-parser documentation
