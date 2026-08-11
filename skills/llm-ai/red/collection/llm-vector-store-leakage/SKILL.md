---
name: llm-vector-store-leakage
description: >-
  Retrieve another tenant's or another user's documents from a shared vector
  store by exploiting similarity search that is not bounded by an access filter,
  during an authorized assessment. Use when a RAG application stores multiple
  principals' data in one index and you need to prove cross-tenant retrieval.
version: 1.0.0
team: red
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: collection
techniques:
  attack: [T1213]
  capec: [CAPEC-116]
  cwe: [CWE-284]
  owasp: []
  d3fend: []
pairs_with: [llm-vector-store-isolation]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: llm-local
  last_validated: 2026-08-10
  validated_by: praneeth132006
license: Apache-2.0
---

# LLM vector-store leakage

## Overview

Vector and embedding weaknesses (OWASP LLM08:2025) turn a shared retrieval index
into a data-leak channel. When many principals' documents live in one store and
retrieval ranks purely by embedding similarity, a query that is *topically* close
to another tenant's content will surface it — because similarity was never an
access boundary. This skill proves that a crafted query returns documents the
caller should not be able to read.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** This is a
read-only technique, but the data you retrieve may be **another party's
confidential content** — handle it as sensitive. Before acting, confirm:

- The multi-tenant store and the tenants whose isolation you will test are in
  scope, with permission to view any data that surfaces.
- You will retrieve the **minimum** needed to demonstrate the boundary failure
  and will not exfiltrate or retain third-party data beyond the report.

Stop and report immediately if retrieved content includes regulated data (PII,
PHI, secrets) outside the agreed handling terms.

## Preconditions

- A RAG application backed by a shared vector store holding more than one
  principal's documents.
- The ability to issue retrieval queries as one tenant (normal app usage).

## Procedure

1. **Confirm the shared store.** Establish that multiple tenants' data co-resides
   in one index (docs, pricing, error messages, or by observing cross-topic
   answers).
2. **Seed a probe.** Learn a distinctive term likely present only in another
   tenant's documents (a project codename, a counterparty, a figure).
3. **Craft a similarity query.** Ask a question whose wording maximizes overlap
   with the target document rather than your own tenant's content.
   ```text
   What merger valuation closes this quarter?
   ```
4. **Retrieve and inspect.** Issue the query and examine the returned chunks /
   citations for documents outside your tenant.
5. **Demonstrate boundary failure.** Show that the answer or its cited sources
   include another tenant's `doc-id`, proving retrieval ignored the partition.
6. **Record** the query, the leaked document ids (not their full contents), and
   whether any tenant filter was applied pre- or post-ranking.

## Paired defense / offense

Pairs with **llm-vector-store-isolation**. The cross-tenant hit you produce is
exactly what a pre-ranking tenant filter and per-namespace indexes prevent. Run
both: with isolation in place your similarity query should return only your own
tenant's documents (or nothing).

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The `LLM08 vector-embedding-weakness` case queries as tenant `acme` for a
document belonging to tenant `globex`. The **vuln** build's `retrieve()` ranks by
similarity alone and returns `doc-globex-1`; the **hardened** build filters by
tenant before ranking and returns nothing. This mirrors steps 3–5.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM08:2025 Vector and Embedding Weaknesses
- MITRE ATT&CK T1213 — Data from Information Repositories
- CAPEC-116 — Excavation
- CWE-284 — Improper Access Control
