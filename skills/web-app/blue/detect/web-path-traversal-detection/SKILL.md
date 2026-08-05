---
name: web-path-traversal-detection
description: >-
  Detect path traversal and local file inclusion attempts and success against a
  web application from request logs and file-access telemetry. Use when tuning
  traversal/LFI detections, triaging a suspected file-disclosure alert, or
  hunting for directory-escape activity.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1190, T1083]
  capec: [CAPEC-126]
  cwe: [CWE-22, CWE-98]
  owasp: ["A01:2021"]
  d3fend: [D3-FA, D3-NTA]
pairs_with: [web-path-traversal]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web path traversal / LFI detection

## Overview

Detect directory-escape attacks by matching traversal tokens and known-file
targets in request parameters, then confirming impact via file-access telemetry —
the web service account opening files outside its document root. Attackers use
many encodings, so normalize aggressively before matching and lean on host-side
file-access signals for confirmation.

## Authorization & scope

Passive analysis of telemetry from systems you operate. Logged paths may reveal
sensitive filenames — handle per policy. Do not replay payloads against
production.

## Preconditions

- Web/WAF access logs and, ideally, host file-access auditing (auditd/EDR/FIM) on
  the app servers.
- A SIEM for querying.

## Procedure

1. **Traversal-token signatures.** Decode (URL, double-URL, UTF-8) then match:
   ```
   index=web sourcetype=access
   | eval p=urldecode(urldecode(uri))
   | where match(p, "(\.\./|\.\.\\\\|%2e%2e|\.\.%2f|/etc/(passwd|hostname|shadow)|boot\.ini|win\.ini|php://|file://)")
   | stats count, values(uri) by src_ip
   ```
2. **Encoding-bypass variants.** Include `....//`, overlong UTF-8 (`%c0%ae`), and
   null-byte (`%00`) forms — attackers rotate encodings to dodge naive rules.
3. **File-access confirmation (host).** Alert when the web service account reads
   files outside the app root:
   ```
   index=edr event=file_open user=www-data OR user=nginx
   | where NOT match(path, "^/var/www/|^/app/")
   | stats count by host, path
   ```
4. **Response signals.** A `200` returning content that matches OS-file shapes
   (e.g. `root:x:0:0:` for passwd) indicates successful disclosure.
5. **Correlate** traversal request → off-root file open on the same host/time to
   distinguish an attempt from a successful read.
6. **Triage & escalate.** Identify which files were exposed, rotate any secrets in
   them, and patch the parameter.

## Detection engineering notes

- Match on *decoded parameter values*, not raw URLs, to cut false positives from
  legitimate paths, and normalize repeatedly to defeat multi-layer encoding.
- File-access auditing turns a noisy request signature into a high-confidence
  "data actually left the box" signal.

## Paired offense / defense

Pairs with **web-path-traversal**. Run that skill in the lab: the `../etc/hostname`
request matches step 1, the `%2e%2e%2f` variant exercises step 2, and the
off-root file open (if host auditing is on) confirms via step 3.

## Validation

Reproduce in `_lab/`:

1. `cd _lab && docker compose up -d` with access logging (and file auditing if
   available).
2. Run the paired `web-path-traversal` procedure against DVWA's file-inclusion
   page.
3. Confirm both the raw and URL-encoded traversal requests match your rules.

## References

- MITRE ATT&CK T1083 — File and Directory Discovery; D3FEND D3-FA (File Analysis)
- OWASP: Path Traversal; File Inclusion
- Sigma project — web path traversal rules
