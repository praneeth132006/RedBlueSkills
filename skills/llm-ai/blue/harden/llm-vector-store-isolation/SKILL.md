---
name: llm-vector-store-isolation
description: >-
  Enforce tenant and user isolation in a shared vector store by filtering
  retrieval on an access boundary before ranking, using per-namespace indexes and
  metadata authorization. Use when hardening a multi-tenant RAG application so
  similarity search cannot return another principal's documents.
version: 1.0.0
team: blue
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1213]
  capec: [CAPEC-116]
  cwe: [CWE-284]
  owasp: []
  d3fend: [D3-ACH, D3-EAL]
pairs_with: [llm-vector-store-leakage]
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

# LLM vector-store isolation

## Overview

Close the vector-embedding leak (OWASP LLM08:2025) by making the access boundary
part of retrieval itself, not an afterthought. Similarity ranking must operate
only over the set of documents the caller is entitled to see, so the boundary is
applied **before** ranking — or enforced physically with a separate index per
tenant. This skill specifies the isolation controls and how to verify that a
cross-tenant query returns nothing.

## Authorization & scope

Defensive design and configuration on systems you operate. Safe to deploy in
production. Data-handling boundary: the filter reads tenant/principal metadata to
scope retrieval; it does not inspect document contents.

## Preconditions

- Control over the retrieval layer and the store's metadata / namespace model.
- A reliable caller identity (tenant / user id) available at query time.

## Procedure

1. **Pre-ranking access filter.** Restrict the candidate set to the caller's
   tenant *before* similarity ranking, never after — post-filtering still leaks
   via scores, counts, and timing.
   ```python
   def retrieve(query, tenant, k):
       pool = [d for d in store if d.tenant == tenant]   # boundary first
       return rank_by_similarity(query, pool)[:k]
   ```
2. **Prefer physical partitioning.** Where the platform supports it, give each
   tenant its own index/namespace so a query cannot address another tenant's
   vectors at all.
3. **Authorize metadata, don't trust it.** Derive the tenant filter from the
   authenticated session, not from a client-supplied parameter.
4. **Scope ingestion symmetrically.** Tag every stored vector with its owner at
   write time so the read filter has something trustworthy to match.
5. **Test the boundary.** Add a canary document under tenant B and assert that no
   query issued as tenant A can retrieve or cite it.

## Paired defense / offense

Pairs with **llm-vector-store-leakage**. The cross-tenant similarity query that
skill uses is exactly what the pre-ranking filter defeats. Run both: with
isolation deployed, the red skill's probe returns only same-tenant results.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The `LLM08 vector-embedding-weakness` case queries as `acme` for a `globex`
document. The **hardened** build's `retrieve()` filters `pool` by tenant before
ranking, so the `globex` document is never a candidate and nothing leaks —
enforcing step 1.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM08:2025 Vector and Embedding Weaknesses
- MITRE D3FEND — D3-ACH Application Configuration Hardening, D3-EAL Executable Allowlisting
- MITRE ATT&CK T1213 — Data from Information Repositories
- CWE-284 — Improper Access Control
