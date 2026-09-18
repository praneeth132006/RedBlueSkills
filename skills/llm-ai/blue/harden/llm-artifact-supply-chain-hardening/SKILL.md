---
name: llm-artifact-supply-chain-hardening
description: Harden LLM artifact acquisition with trusted origins, immutable revisions, independently approved hashes, and constrained loading. Use for model/adapter deployment pipelines exposed to supply-chain risk.
version: 1.0.0
team: blue
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  cwe:
  - CWE-494
pairs_with:
- llm-artifact-supply-chain-assessment
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

# Llm artifact supply chain hardening

## Overview

Make artifact admission an explicit deployment gate. OWASP LLM03 includes more
than artifact integrity, so retain supplier review, dependency maintenance, and
model evaluations alongside the deterministic controls below.

## Authorization & scope

Read-only design review follows the requested scope. Apply configuration changes
only within the authorized system, with a rollback plan. Use synthetic data for
verification and do not log tokens, private model data, or user uploads.

## Preconditions

- An owner-controlled approved manifest, deployment pipeline, and inventory.
- Known-good model/adapter revisions and an isolated validation environment.
- Access to acquisition, loader, and cache configuration.

## Procedure

1. Record every model, adapter, tokenizer, loader and dependency with its source,
   immutable revision and license. Vet the supplier and monitor relevant advisories.
2. Pin reviewed revisions and compare downloaded bytes against a digest obtained
   through an independently trusted channel. When signatures/attestations exist,
   verify both the bytes and the expected publisher/workflow identity.
3. Keep the approval manifest outside the artifact's write authority. Verify before
   deserialization or import; a successful hash comparison only proves integrity
   relative to the manifest, not benign model behavior.
4. Disable custom remote code by default. Where it is essential, review a pinned
   code revision and execute with least privilege, bounded egress, and no production
   secrets in the validation environment. Prefer non-executable serialization where
   supported; it does not make surrounding loaders automatically safe.
5. Preserve a known-good revision and define rollback. Reject absent metadata,
   unexpected formats/origins, and changed bytes without silently falling back to
   an unverified download. Log rejection reasons and artifact hashes.
6. Replay the paired substitution tests, followed by legitimate-load and application
   quality tests. Monitor upstream changes and re-review updates before promotion.

## Paired defense / offense

Pair with **`llm-artifact-supply-chain-assessment`**. Compare the same input and positive control before and
after the defense. An unavailable environment is `blocked`; insufficient evidence
is `inconclusive`, not a clean bill of health.

## Validation

From a repository checkout, run:

```bash
python3 _lab/security-controls/validate.py
```

From the installed npm package, run `redblueskills lab security-controls`.
Python 3.10+ is required. The lab uses no network or production credentials.

`ArtifactControls` proves the fixture compares actual SHA-256 bytes with a
separately trusted manifest and rejects metadata substitution before JSON loading.
It does not implement publisher signature verification, model evaluation, or a
production artifact cache. Test those separately; do not copy this teaching
loader into production.

## References

- [OWASP LLM03:2025 Supply Chain](https://genai.owasp.org/llmrisk/llm032025-supply-chain/)
- [Hugging Face Transformers: custom models](https://huggingface.co/docs/transformers/custom_models)
- [CWE-494: Download of Code Without Integrity Check](https://cwe.mitre.org/data/definitions/494.html)
