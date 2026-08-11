---
name: llm-grounding-verification
description: >-
  Constrain an LLM application to answer only from retrieved, verifiable grounding
  — enforce citations, validate that cited sources support the claim, and abstain
  when grounding is absent. Use when hardening a RAG or Q&A app against confident
  fabrication.
version: 1.0.0
team: blue
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1565.001]
  capec: [CAPEC-148]
  cwe: [CWE-1426]
  owasp: []
  d3fend: [D3-ACH]
pairs_with: [llm-misinformation]
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

# LLM grounding verification

## Overview

Suppress misinformation (OWASP LLM09:2025) by making grounding a hard
precondition for answering: the application answers from retrieved sources or it
abstains — it does not improvise. The controls are structural — require a
retrieved citation, verify the citation actually supports the claim, and return
an explicit "I don't know" when grounding is missing — so a fluent guess can
never masquerade as a fact. This skill specifies grounded-only answering and how
to verify abstention.

## Authorization & scope

Defensive design and configuration on systems you operate. Safe to deploy in
production. Data-handling boundary: the verifier compares generated claims to
retrieved source text; it adds no new data collection.

## Preconditions

- A retrieval layer that returns candidate source documents for a query.
- Control over the answer-composition step and the ability to change the prompt /
  post-generation checks.

## Procedure

1. **Answer only from grounding.** Compose answers strictly from retrieved
   context, and abstain when retrieval returns nothing relevant.
   ```python
   def grounded_answer(q):
       hits = retrieve(q)
       if not hits:
           return "I don't have a source for that."     # abstain, don't invent
       return compose(q, hits) + f" [source: {hits[0].id}]"
   ```
2. **Require and bind citations.** Every factual claim carries a citation to a
   real retrieved document id; strip or flag claims that lack one.
3. **Verify the citation supports the claim.** Post-generation, check that the
   cited source text actually entails the answer (overlap / entailment check);
   reject "citation exists but says something else."
4. **Calibrate confidence.** Surface an explicit uncertainty signal or abstention
   to the user instead of an unqualified assertion when support is weak.
5. **Test the edge.** Ask a question the corpus cannot answer and assert the app
   abstains rather than fabricating; ask a grounded question and assert the
   citation resolves and supports the answer.

## Paired defense / offense

Pairs with **llm-misinformation**. The confident ungrounded answer that skill
elicits is exactly what grounded-only answering blocks. Run both: with this
control deployed, the red skill's unanswerable probe yields an abstention.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The `LLM09 misinformation` case asks an unanswerable question. The **hardened**
build's `grounded_answer()` finds no supporting document and returns an
abstention instead of inventing a warranty claim — enforcing steps 1 and 4.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM09:2025 Misinformation
- MITRE D3FEND — D3-ACH Application Configuration Hardening
- NIST AI RMF — Measure/Manage functions for generative output validity
- CWE-1426 — Improper Validation of Generative AI Output
