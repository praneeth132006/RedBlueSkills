---
name: llm-improper-output-handling
description: >-
  Turn unsanitized LLM output into code execution or injection in the downstream
  sink that consumes it — XSS in a browser, SQL in a query, a command in a shell —
  during an authorized assessment. Use when model output flows into another
  interpreter without context-aware encoding.
version: 1.0.0
team: red
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: execution
techniques:
  attack: [T1059.007]
  capec: [CAPEC-63]
  cwe: [CWE-79]
  owasp: ["A03:2021"]
  d3fend: []
pairs_with: [llm-output-encoding]
risk:
  level: high
  reversible: false
  data_touch: read-write
authorization: required
maturity: validated
validation:
  method: lab
  target: llm-local
  last_validated: 2026-08-10
  validated_by: praneeth132006
license: Apache-2.0
---

# LLM improper output handling

## Overview

Improper output handling (OWASP LLM05:2025) is a classic injection with the LLM
as the untrusted source: the model's text is passed to a downstream interpreter —
an HTML page, a SQL statement, a shell, a template — without encoding for that
sink, so attacker-influenced output executes. Crucially, prompt-injection filters
do **not** help here: the payload is data for the sink (markup, SQL, a command),
not an instruction to the model. This skill proves that model output reaches a
sink and executes there.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Depending on
the sink this can be **state-changing** (a write query, a command). Before
acting, confirm:

- The application and the specific sink (browser DOM, database, shell, template)
  are in scope.
- You will use a **non-destructive proof** — an `alert()`-class marker, a
  no-op/`SELECT 1` probe, a benign `id`-style command — never a payload that
  damages data or persists beyond the test.

Stop if the only available proof would execute a destructive action on real data.

## Preconditions

- A path where LLM output is inserted into another interpreter (rendered as HTML,
  concatenated into SQL, passed to a shell, expanded in a template).
- The ability to influence that output — directly, or indirectly via retrieved
  content the model summarizes.

## Procedure

1. **Trace output to a sink.** Find where model output lands: `innerHTML`, a DB
   query, `os.system`, a template render. Note the sink's language.
2. **Get the payload into the output.** Ask a question, or plant retrieved
   content, that makes the model emit the sink-specific payload verbatim (models
   readily echo quoted strings).
   ```text
   Summarize this review: <script>alert(document.domain)</script>
   ```
3. **Confirm execution at the sink.** For an HTML sink, verify the script runs
   (a DOM marker, a beacon to your listener); for SQL, verify the injected clause
   changes the query's meaning with a safe probe.
4. **Show the filter gap.** Demonstrate that any prompt-injection guard is
   irrelevant — the payload is inert as an instruction but live at the sink —
   which is why output encoding is a separate control.
5. **Record** the sink, the payload, the proof of execution, and whether the
   application encoded output for that context.

## Paired defense / offense

Pairs with **llm-output-encoding**. The payload you land at the sink is exactly
what context-aware output encoding neutralizes. Run both: with encoding applied,
your marker should render as inert text rather than execute.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The `LLM05 improper-output-handling` case sends `<script>…</script>` through a
summary whose result is placed into HTML. The **vuln** build interpolates it raw
(the tag reaches the page intact); the **hardened** build HTML-encodes at the
sink (`summarize_to_html()` in `mock_llm.py`), so the marker is escaped. This
mirrors steps 2–4 for the browser sink.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM05:2025 Improper Output Handling
- MITRE ATT&CK T1059.007 — Command and Scripting Interpreter: JavaScript
- CAPEC-63 — Cross-Site Scripting (XSS)
- CWE-79 — Improper Neutralization of Input During Web Page Generation
