---
name: web-path-traversal
description: >-
  Find and prove path traversal / local file inclusion in a web application
  during an authorized assessment. Use when a parameter influences a file path
  (downloads, template/include, image loaders) and you need to confirm access to
  files outside the intended directory without exfiltrating sensitive data.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1190, T1083]
  capec: [CAPEC-126]
  cwe: [CWE-22, CWE-98]
  owasp: ["A01:2021"]
  d3fend: []
pairs_with: [web-path-traversal-detection]
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

# Web path traversal / LFI

## Overview

Path traversal occurs when user input is used to build a filesystem path without
canonicalization and containment, letting an attacker escape the intended base
directory (`../../etc/passwd`) or, in include contexts, execute server files
(LFI). This skill confirms the flaw with a safe, well-known non-sensitive marker
file and characterizes containment, encoding filters, and read vs execute impact.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Before acting,
confirm the target is in written scope and the testing window is open. Prove the
flaw with a **benign marker** (e.g. `/etc/hostname`, a public banner file, or the
app's own read-only config) rather than dumping credentials, private keys, or
customer files. Read the minimum needed to demonstrate impact, then stop.

## Preconditions

- A parameter that maps to a file: `?file=`, `?page=`, `?template=`,
  `?download=`, `?lang=`, `Content-Disposition` names, or path segments.
- Ability to observe response bodies and status codes.

## Procedure

1. **Baseline.** Request a legitimate value and note the returned content/length.
2. **Escape the directory.** Try traversal sequences and watch for foreign file
   content or path errors:
   ```bash
   curl -s "https://TARGET/download?file=../../../../etc/hostname"
   curl -s "https://TARGET/download?file=....//....//etc/hostname"     # filter bypass
   curl -s "https://TARGET/download?file=%2e%2e%2f%2e%2e%2fetc/hostname" # URL-encoded
   ```
3. **Absolute-path & null/extension tricks** where the app appends a suffix:
   ```bash
   curl -s "https://TARGET/view?page=/etc/hostname%00.html"   # legacy null byte
   curl -s "https://TARGET/view?page=php://filter/convert.base64-encode/resource=index" # LFI source read
   ```
4. **Confirm containment boundary.** Establish how many `../` are needed and which
   encodings pass, to distinguish a true traversal from a benign 404.
5. **Assess execution risk.** In include/render contexts, note whether the sink
   *executes* the file (LFI → potential RCE via log poisoning/wrappers) versus
   only *reads* it — but do not weaponize execution against a real host.
6. **Prove impact minimally** with one non-sensitive file read and the exact
   request, then stop.
7. **Record** the parameter, working payload, encoding needed, read-vs-execute
   assessment, and remediation (canonicalize + verify the resolved path stays
   under an allow-listed base directory; never pass user input to include()).

## Paired defense / offense

Pairs with **web-path-traversal-detection**. The traversal tokens (`../`, encoded
variants, `php://`, `/etc/`), 200s returning off-base file content, and file-open
errors are all detectable. When validating together, confirm the detection rules
match your encoded payloads and the file-access anomaly surfaces.

## Validation

Reproduce against the `_lab/` DVWA target:

1. `cd _lab && docker compose up -d`.
2. On DVWA's *File Inclusion* page, request `?page=../../../../etc/hostname`
   (low security) and confirm the marker file's contents are returned.
3. Confirm an encoded variant (`%2e%2e%2f`) also works where the raw form is
   filtered, characterizing the filter.

## References

- OWASP: Path Traversal; File Inclusion
- MITRE ATT&CK T1083 — File and Directory Discovery; T1190
- CWE-22 — Improper Limitation of a Pathname to a Restricted Directory
- PortSwigger Web Security Academy — Directory traversal
