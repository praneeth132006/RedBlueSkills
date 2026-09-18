---
name: llm-artifact-supply-chain-assessment
description: Assess LLM model, adapter, and loader artifact provenance for OWASP LLM03:2025. Use when an application imports third-party model artifacts or custom loader code; use inert fixture substitutions.
version: 1.0.0
team: red
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  cwe:
  - CWE-494
pairs_with:
- llm-artifact-supply-chain-hardening
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

# Llm artifact supply chain assessment

## Overview

Examine what is trusted before a model artifact is loaded. This covers acquired
weights, adapters and loader dependencies, while `llm-data-poisoning` covers
changes entering a training or retrieval corpus. Inventory both where relevant.

## Authorization & scope

Operate only on authorized test identities and assets. Reuse scope already
established in the session. Local fixture execution uses temporary data only;
live actions require an agreed target and impact limit. Stop on unexpected effects.

## Preconditions

- Build/runtime artifact manifest and the actual loader configuration.
- A trusted inventory of approved origins, immutable revisions, and digests.
- A disposable local cache or staging fixture; no production model replacement.

## Procedure

1. Inventory the source, revision, format, digest, dependency lockfile, and any
   custom-code permission for each model and adapter. Mark floating revisions and
   missing verification as candidates until the load path is traced.
2. Determine where the expected digest and publisher identity originate. A checksum
   supplied beside an untrusted artifact is not an independent trust anchor.
3. In the local lab, load the approved JSON artifact as a control. Change its inert
   answer marker without changing the approved digest and observe the load gate.
4. Change both bytes and the attacker-supplied checksum; the trusted manifest must
   still reject the substitution. Also test an unapproved source, floating revision,
   unsupported format, and remote-code request without executing that code.
5. In source review, establish whether validation happens before deserialization,
   custom-code import, or activation. Do not download or execute suspicious models
   to prove this. Inspect documented settings and bound network/key trust.
6. Report which control was observed, its trusted inputs, and test limitations.
   Restore the disposable cache and retain only hashes and reason-coded evidence.

## Paired defense / offense

Pair with **`llm-artifact-supply-chain-hardening`**. Compare the same input and positive control before and
after the defense. An unavailable environment is `blocked`; insufficient evidence
is `inconclusive`, not a clean bill of health.

## Validation

From a repository checkout, run:

```bash
python3 _lab/security-controls/validate.py
```

From the installed npm package, run `redblueskills lab security-controls`.
Python 3.10+ is required. The lab uses no network or production credentials.

`ArtifactControls` checks approved loading and rejects changed bytes, replacement
checksums, unapproved origins, floating revisions, unsafe format flags, missing
metadata, oversize bytes, and custom-code requests. It uses JSON marker bytes,
not an actual model or unsafe deserializer. Publisher signatures, dependency
advisories, model behavior, and a production registry are outside this fixture.

## References

- [OWASP LLM03:2025 Supply Chain](https://genai.owasp.org/llmrisk/llm032025-supply-chain/)
- [Hugging Face Transformers: custom models](https://huggingface.co/docs/transformers/custom_models)
- [CWE-494: Download of Code Without Integrity Check](https://cwe.mitre.org/data/definitions/494.html)
