---
name: web-file-upload-hardening
description: Harden application upload validation, generated storage names, size limits, and retrieval boundaries. Use when implementing or reviewing an upload pipeline and testing benign rejection cases.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  cwe:
  - CWE-434
pairs_with:
- web-file-upload-abuse
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

# Web file upload hardening

## Overview

Define an upload policy from the business's required formats, then enforce it
through processing and download. The local fixture deliberately permits only
plain UTF-8 text; other formats need their own parsers and resource limits.

## Authorization & scope

Read-only design review follows the requested scope. Apply configuration changes
only within the authorized system, with a rollback plan. Use synthetic data for
verification and do not log tokens, private model data, or user uploads.

## Preconditions

- Upload/processing/retrieval code and a list of legitimate formats.
- Non-executable storage, object ownership metadata, and a staging rollout path.
- Benign fixtures, limits, deletion controls, and operational logs.

## Procedure

1. Authenticate and authorize uploads and downloads separately. Apply CSRF
   controls for cookie-authenticated state changes and quotas per principal.
2. Decode/normalize according to the framework, then enforce a filename/extension
   allowlist. Treat client MIME values as hints. Validate actual format with an
   appropriate maintained parser; signatures alone cannot prove harmless content.
3. Generate storage IDs server-side and isolate files from executable application
   paths. Preserve an original display name only as escaped metadata. Avoid
   overwrites with exclusive creation or object-store conditional writes.
4. Enforce streaming size limits before buffering and storage; bound processing
   time, decoded size, and archive member paths where archives are required.
5. Quarantine asynchronous processing until checks finish. Serve an explicit
   content type with `nosniff`; choose attachment disposition or isolated origins
   for formats that could become active content. Do not interpolate filenames into
   shell commands or expose internal filesystem paths.
6. Replay benign negative cases and legitimate uploads, including rejection cleanup,
   duplicate names, and owner-only retrieval in the real app. Deploy incrementally
   with reason-coded logs, retention rules, and a reversible configuration change.

## Paired defense / offense

Pair with **`web-file-upload-abuse`**. Compare the same input and positive control before and
after the defense. An unavailable environment is `blocked`; insufficient evidence
is `inconclusive`, not a clean bill of health.

## Validation

From a repository checkout, run:

```bash
python3 _lab/security-controls/validate.py
```

From the installed npm package, run `redblueskills lab security-controls`.
Python 3.10+ is required. The lab uses no network or production credentials.

`UploadControls` verifies the local text-only type/name/content/size gate,
randomized exclusive storage, and preservation of legitimate data. It does not
cover streaming HTTP limits, auth, browser headers, archive processing, or media
parsers. Those remain explicit integration tests on the application.

## References

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [CWE-434: Unrestricted Upload of File with Dangerous Type](https://cwe.mitre.org/data/definitions/434.html)
