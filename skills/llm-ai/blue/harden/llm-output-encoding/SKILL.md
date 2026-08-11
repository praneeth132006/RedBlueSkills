---
name: llm-output-encoding
description: >-
  Treat LLM output as untrusted and encode it for the specific sink that consumes
  it — HTML/JS context encoding, parameterized queries, argument-vector exec — so
  model text cannot execute downstream. Use when hardening any path where LLM
  output flows into another interpreter.
version: 1.0.0
team: blue
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1059.007]
  capec: [CAPEC-63]
  cwe: [CWE-79]
  owasp: ["A03:2021"]
  d3fend: [D3-ACH]
pairs_with: [llm-improper-output-handling]
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

# LLM output encoding

## Overview

Neutralize improper output handling (OWASP LLM05:2025) by treating model output
exactly like any other untrusted input to the downstream sink. The fix is not to
make the model "safer" — it is to encode output for the context it enters:
HTML-encode before the DOM, parameterize before SQL, pass an argument vector
instead of a shell string, escape before a template. This skill specifies
per-sink encoding and how to verify a payload renders inert.

## Authorization & scope

Defensive design and configuration on systems you operate. Safe to deploy in
production. Data-handling boundary: encoding is applied at the sink boundary and
does not alter the meaning of legitimate output, only its representation.

## Preconditions

- Knowledge of every sink model output can reach and the interpreter each uses.
- Control over the code at each sink boundary.

## Procedure

1. **Encode for the exact context.** Apply the encoding the sink requires, at the
   sink, not upstream:
   ```python
   # HTML sink — context-encode before insertion
   page = f"<div>{html.escape(model_output)}</div>"
   # SQL sink — parameterize, never concatenate
   cur.execute("INSERT INTO notes(body) VALUES (%s)", (model_output,))
   # Shell sink — argument vector, no shell string
   subprocess.run(["convert", model_output, "out.png"])
   ```
2. **Never dual-purpose output.** Do not render model output as HTML/Markdown
   *and* rely on a filter to strip tags — encode it, or render as plain text.
3. **Constrain the shape.** Where output should be structured (JSON, an enum,
   an id), validate it against a schema before use and reject non-conforming
   output rather than sanitizing it.
4. **Isolate rich rendering.** If model output must render as HTML, run it
   through an allowlist sanitizer and/or a sandboxed frame with a strict CSP.
5. **Test each sink.** Send a sink-specific payload (`<script>`, `' OR 1=1`,
   `; id`) through and assert it appears inert (escaped / parameter-bound /
   argument-quoted), not executed.

## Paired defense / offense

Pairs with **llm-improper-output-handling**. The payload that skill lands at a
sink is exactly what context encoding renders inert. Run both: with encoding
applied, the red skill's marker shows up as visible text instead of executing.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The `LLM05 improper-output-handling` case pushes a `<script>` payload through the
HTML summary path. The **hardened** build's `summarize_to_html()` HTML-encodes at
the sink, so the output contains `&lt;script&gt;` and nothing executes —
enforcing step 1 for the browser context.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM05:2025 Improper Output Handling
- OWASP Cheat Sheet — Cross Site Scripting Prevention (output encoding)
- MITRE D3FEND — D3-ACH Application Configuration Hardening
- CWE-79 — Improper Neutralization of Input During Web Page Generation
