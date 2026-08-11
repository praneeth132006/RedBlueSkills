---
name: llm-training-data-provenance
description: >-
  Gate every document that enters an LLM application's knowledge base or
  fine-tuning corpus behind source allowlisting, provenance signing, and content
  review, so poisoned data cannot reach production answers. Use when hardening a
  RAG or fine-tuning ingestion pipeline against data poisoning.
version: 1.0.0
team: blue
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1195.001]
  capec: [CAPEC-624]
  cwe: [CWE-345]
  owasp: []
  d3fend: [D3-ACH, D3-DAM]
pairs_with: [llm-data-poisoning]
risk:
  level: info
  reversible: true
  data_touch: none
authorization: not-required
maturity: validated
validation:
  method: lab
  target: llm-local
  last_validated: 2026-08-10
  validated_by: praneeth132006
license: Apache-2.0
---

# LLM training-data provenance

## Overview

Stop data poisoning (OWASP LLM04:2025) at the door: every document that becomes
grounding truth — for RAG retrieval or for fine-tuning — must have a known,
trusted origin before it is admitted. The control is provenance, not content
cleverness: you cannot reliably detect a "misleading" document by reading it, but
you can refuse any document whose source is not on an allowlist and whose
integrity is not attested. This skill specifies the ingestion gate and how to
verify it.

## Authorization & scope

Defensive design and configuration on systems you operate. These controls are
safe to deploy in production and are the primary mitigation for corpus poisoning.
Data-handling boundary: the gate inspects source metadata and signatures, not the
content of user conversations.

## Preconditions

- Control over the ingestion pipeline that writes into the vector store or
  fine-tuning set.
- An enumerable set of legitimate sources and a way to attest each document's
  origin (signing key, authenticated connector, or reviewed queue).

## Procedure

1. **Source allowlist.** Enumerate the systems permitted to contribute grounding
   data (`catalog-db`, `policy-repo`) and deny by default. Dispatch ingestion
   through a wrapper that rejects any document whose `source` is not allowlisted.
   ```python
   TRUSTED_SOURCES = {"catalog-db", "policy-repo"}
   def ingest(doc):
       if doc.source not in TRUSTED_SOURCES:
           raise IngestRejected(doc.source)   # provenance gate
       store.add(doc)
   ```
2. **Attest integrity.** Require a signature or checksum from the source so a
   document cannot be altered in transit; record the signer with the document.
3. **Review untrusted contributions.** Route anything from a lower-trust source
   (uploads, crawled pages, tickets) to a human/allowlisted-reviewer queue
   instead of straight into the corpus.
4. **Tag and trace.** Store `source`, signer, and ingest time as immutable
   metadata so a poisoned answer can be traced to the document and purged.
5. **Monitor drift.** Alert when a single new document suddenly dominates answers
   for a high-value query, or when ingestion volume from one source spikes.

## Paired defense / offense

Pairs with **llm-data-poisoning**. The canary document that skill injects is
exactly what the source allowlist rejects. Run both: the red skill should fail to
change the target answer once this gate is in place.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The `LLM04 data-poisoning` case attempts to ingest a document from `user-upload`.
The **hardened** build's `ingest()` refuses it (source not in `TRUSTED_SOURCES`),
so `policy_answer()` still returns the authentic policy — the poisoned answer
never appears. Steps 1 and 4 are the enforced controls.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM04:2025 Data and Model Poisoning
- MITRE D3FEND — D3-ACH Application Configuration Hardening, D3-DAM Domain Account Monitoring
- MITRE ATLAS — AML.M0007 Sanitize Training Data
- CWE-345 — Insufficient Verification of Data Authenticity
