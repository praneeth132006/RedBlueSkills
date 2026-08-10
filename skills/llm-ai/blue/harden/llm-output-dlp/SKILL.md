---
name: llm-output-dlp
description: >-
  Harden an LLM application against sensitive-data leakage by filtering and
  redacting model output and constraining what reaches the context. Use when
  securing a chatbot or RAG app so secrets, PII, and system configuration cannot
  leave in a response.
version: 1.0.0
team: blue
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1552]
  capec: [CAPEC-116]
  cwe: [CWE-200]
  owasp: []
  d3fend: [D3-ACH]
pairs_with: [llm-sensitive-info-disclosure]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: llm-local
  last_validated: 2026-08-09
  validated_by: praneeth132006
license: Apache-2.0
---

# LLM output DLP & context minimization

## Overview

Prevent sensitive information disclosure (OWASP LLM02:2025) with defense in depth:
keep secrets out of the model context in the first place, minimise what
retrieval brings in, and put a **DLP filter on the output** so that even if a
secret reaches the model, it cannot leave in a response. This skill specifies the
controls and how to verify them.

## Authorization & scope

Defensive engineering and configuration on systems you operate — no offensive
authorization needed. Redaction rules and canaries here are safe to deploy in
production. Treat model logs as sensitive: they may capture the very data you are
trying to protect.

## Preconditions

- Control over the prompt-assembly / retrieval layer and a place to run a
  post-processing filter on responses before they return to the user.
- An inventory of secret formats and PII types that must never egress.

## Procedure

1. **Keep secrets out of context.** Do not place API keys or credentials in the
   system prompt. Inject them at the tool boundary (server-side), never into text
   the model can quote.
2. **Minimise retrieval.** Scope RAG queries to the requesting user's tenant and
   authorization; strip metadata; retrieve the fewest chunks that answer the
   question. Enforce access control on the retrieval layer, not the prompt.
3. **Filter the output.** Run every response through a DLP pass that redacts:
   - secret patterns (`SK-…`, `AKIA…`, JWTs, private-key headers),
   - known system-prompt fragments and canary strings,
   - PII (emails, card/SSN patterns) unless the user is entitled to it.
   ```python
   import re
   PATTERNS = [r"SK-[A-Za-z0-9-]{8,}", r"AKIA[0-9A-Z]{16}", r"-----BEGIN [A-Z ]*PRIVATE KEY-----"]
   def dlp(text):
       for p in PATTERNS:
           text = re.sub(p, "[REDACTED]", text)
       return text
   ```
4. **Plant canaries.** Seed a unique token into the system prompt and each
   sensitive document; alert (via the paired detection skill) if it ever appears
   in output — a canary hit is a confirmed leak.
5. **Fail closed.** If the filter or authorization check errors, refuse rather
   than return the raw model output.

## Paired defense / offense

Pairs with **llm-sensitive-info-disclosure**. Each elicitation technique there —
direct ask, encoded ask, cross-tenant probe — is answered by a control here:
context minimization, output DLP, and retrieval-layer authorization.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The hardened build applies `_redact()` before returning output; the harness
asserts the `SK-LLMLAB-…` key and the system prompt are stripped from responses
that leak them in the vuln build. Extend `PATTERNS` above to match your own
secret formats and re-run.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM02:2025 Sensitive Information Disclosure
- MITRE D3FEND D3-ACH — Application Configuration Hardening
- CWE-200 — Exposure of Sensitive Information to an Unauthorized Actor
- NIST SP 800-53 Rev 5 — SC-28, AC-3, AU-13
