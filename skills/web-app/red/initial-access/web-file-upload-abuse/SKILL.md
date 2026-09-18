---
name: web-file-upload-abuse
description: Assess file upload validation and storage during an authorized application review. Use when users submit files that are stored, processed, or served; demonstrate gaps with inert canaries.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  cwe:
  - CWE-434
pairs_with:
- web-file-upload-hardening
risk:
  level: medium
  reversible: true
  data_touch: read-write
authorization: required
maturity: validated
validation:
  method: lab
  target: security-controls
  last_validated: '2026-09-18'
  validated_by: codex-local-validation
license: Apache-2.0
---

# Web file upload abuse

## Overview

Trace an upload from acceptance through storage and retrieval. Distinguish a
file being accepted from a file executing or being disclosed. Use inert text
canaries; no web shells, malware, parser exploits, or decompression bombs.

## Authorization & scope

Operate only on authorized test identities and assets. Reuse scope already
established in the session. Local fixture execution uses temporary data only;
live actions require an agreed target and impact limit. Stop on unexpected effects.

## Preconditions

- Upload handler, approved test account, and agreed file/size limits.
- Storage and retrieval configuration, plus a way to delete test objects.
- The intended allowed formats and processing requirements.

## Procedure

1. Map filename, MIME header, content validation, storage key, processor, and
   retrieval authorization. In source mode, trace these without uploading.
2. Upload an allowed tiny file as the positive control in the approved environment.
   Record its object ID, owner, served type, and cleanup path.
3. Send inert bytes with a disallowed suffix, double extension, and mismatched
   declared type, one test at a time. For filename/path cases use the local fixture
   or a disposable staging directory; do not attempt to overwrite live files.
4. Test a configured size boundary with tiny limits in a fixture/staging override.
   Do not send huge payloads to production. Check whether rejection occurs before
   persistent storage or expensive processing.
5. Inspect storage/retrieval configuration for generated keys and execution isolation.
   Acceptance alone is not code execution. For cross-account retrieval, use two
   operator-owned accounts and only their canary objects.
6. Record expected versus observed behavior and missing access as inconclusive.
   Remove all created canaries and confirm deletion; pair each gap with hardening.

## Paired defense / offense

Pair with **`web-file-upload-hardening`**. Compare the same input and positive control before and
after the defense. An unavailable environment is `blocked`; insufficient evidence
is `inconclusive`, not a clean bill of health.

## Validation

From a repository checkout, run:

```bash
python3 _lab/security-controls/validate.py
```

From the installed npm package, run `redblueskills lab security-controls`.
Python 3.10+ is required. The lab uses no network or production credentials.

The `UploadControls` tests demonstrate acceptance of inert `canary.txt.php`
by the vulnerable fixture and rejection by the text-only policy. They check
path-like names, null bytes, MIME mismatch, invalid UTF-8, binary controls,
empty/oversize content, unique storage names, and valid 1024-byte uploads.
There is no HTTP server, image decoder, antivirus, or executable handler in this
lab; it does not demonstrate remote code execution or retrieval authorization.

## References

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [CWE-434: Unrestricted Upload of File with Dangerous Type](https://cwe.mitre.org/data/definitions/434.html)
