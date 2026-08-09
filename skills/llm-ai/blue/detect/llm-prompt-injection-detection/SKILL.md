---
name: llm-prompt-injection-detection
description: >-
  Detect direct and indirect prompt-injection attempts and successful policy
  breaks against an LLM application from prompt/response telemetry. Use when
  building detections for injection, triaging a suspected jailbreak, or hunting
  for override activity in model logs and RAG pipelines.
version: 1.0.0
team: blue
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1190]
  capec: [CAPEC-242]
  cwe: [CWE-1427]
  owasp: []
  d3fend: [D3-UBA]
pairs_with: [llm-prompt-injection]
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

# LLM prompt injection detection

## Overview

Detect both *attempts* at and *success* of prompt injection by instrumenting the
three points where it shows up: the **inbound prompt** (override phrases,
delimiter/role tokens in user input or retrieved chunks), the **assembled
context** (untrusted content that was not delimited), and the **model output**
(system-prompt fragments, canary strings, or tool calls that should not follow
from the user's request). Signatures and a triage flow map directly to the
offensive procedure in the paired skill.

## Authorization & scope

Passive analysis of telemetry from systems you operate. Prompts and retrieved
content may contain user PII or secrets — mask before sharing, and store model
logs under the same classification as application logs. No authorization to
attack is required; do not replay captured injection payloads against production.

## Preconditions

- Logging of the user message, the retrieved/tool context, and the model
  response for each turn (with a correlation id).
- A SIEM or log tool. Examples below use a generic Splunk/KQL-like syntax — adapt
  to your platform.

## Procedure

1. **Signature the inbound side.** Alert on override directives in user input or
   retrieved chunks: `ignore (previous|all) instructions`, `disregard the
   (above|system)`, `reveal (your )?(system prompt|instructions|key)`, injected
   `System:`/`Assistant:` turns, and stray closing delimiters.
   ```spl
   index=llm (event=prompt OR event=retrieval)
   | regex text="(?i)(ignore\s+(all|previous).{0,20}instructions|reveal\s+(your\s+)?(system\s+prompt|key)|disregard\s+the\s+(above|system))"
   | stats count by session_id, source
   ```
2. **Detect success, not just attempts.** Flag responses that echo known
   system-prompt fragments or a planted **canary** — the highest-fidelity signal.
   ```spl
   index=llm event=response | search response="*<system-prompt-canary>*" OR response="*Internal key:*"
   ```
3. **Watch for unwarranted actions.** Correlate: a tool call or refusal-flip that
   does not follow from the user's stated intent, especially right after
   untrusted content entered the context.
4. **Attribute the vector.** Join the response alert back to whether the trigger
   text came from the user (direct) or a retrieved document (indirect); indirect
   hits mean a poisoned corpus — pivot to the source document.
5. **Tune.** Maintain an allowlist of legitimate instruction-like phrasing to cut
   false positives; alert on *output* canaries with high severity.

## Paired defense / offense

Pairs with **llm-prompt-injection**. Every step of that skill emits a signal
here: override phrases inbound, delimiter/role tokens, and system-prompt or
canary leakage outbound. Run them together to confirm coverage.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The harness proves the hardened build both **strips inbound directives** and
**redacts system-prompt/secret markers from output** — the same two signals this
skill keys on. Point your detections at the marker `Internal key:` and the
override regexes above and confirm they fire on the `vuln` transcript and stay
quiet on the `hardened` one.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM01:2025 Prompt Injection
- MITRE ATLAS — AML.T0051 LLM Prompt Injection
- MITRE D3FEND D3-UBA — User Behavior Analysis
- CWE-1427 — Improper Neutralization of Input Used for LLM Prompting
