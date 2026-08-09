---
name: llm-consumption-limits
description: >-
  Harden an LLM application against unbounded consumption with input/output
  caps, token budgets, rate limiting, and cost controls. Use when protecting a
  model-backed service from resource exhaustion and denial-of-wallet abuse.
version: 1.0.0
team: blue
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1499]
  capec: [CAPEC-125]
  cwe: [CWE-770]
  owasp: []
  d3fend: [D3-ACH]
pairs_with: [llm-unbounded-consumption]
risk:
  level: info
  reversible: true
  data_touch: none
authorization: not-required
maturity: validated
validation:
  method: lab
  target: llm-local
  last_validated: 2026-08-09
  validated_by: praneeth132006
license: Apache-2.0
---

# LLM consumption limits

## Overview

Protect an LLM application from unbounded consumption (OWASP LLM10:2025) by
bounding every dimension an attacker can inflate: input size, output length,
request rate, and total spend. Because inference is metered, these are cost
controls as much as availability controls — they cap denial-of-wallet exposure.
This skill specifies the limits and how to verify them.

## Authorization & scope

Defensive configuration on systems you operate. All controls here are safe for
production. Set limits from real usage percentiles so legitimate traffic is
unaffected while abuse is capped.

## Preconditions

- Control over the request-handling path (gateway/middleware), the model call
  parameters, and per-user identity for quotas.

## Procedure

1. **Cap input.** Reject requests whose input exceeds a policy size *before*
   calling the model. Fail fast with a clear error.
   ```python
   if len(user_msg) + len(retrieved) > MAX_INPUT_CHARS:
       return error(413, "request exceeds size policy")
   ```
2. **Cap output.** Always set `max_tokens` (and stop sequences) on the model call;
   never allow open-ended generation driven by user text.
3. **Rate-limit per identity.** Apply per-user/per-key request and token quotas
   (sliding window) at the gateway; return `429` past the threshold.
4. **Budget agentic loops.** Cap tool calls / reasoning steps per request and set
   a wall-clock timeout so a single request cannot fan out indefinitely.
5. **Enforce spend controls.** Track tokens→cost per tenant, alert on anomalies,
   and hard-stop at a daily/monthly ceiling. Prefer provider-side spend limits as
   a backstop.
6. **Fail closed.** On limiter or metering failure, throttle rather than allow
   unbounded use.

## Paired defense / offense

Pairs with **llm-unbounded-consumption**. Each probe there is answered by one
control here: the input cap stops oversized inputs, `max_tokens` stops output
floods, rate limits stop bursts, and step budgets stop amplification loops.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The hardened build enforces `max_input_chars`; the harness asserts the
50,000-char request is rejected (`ERROR: request exceeds size policy`) while the
vuln build processes it. Tune `MAX_INPUT_CHARS` and add `max_tokens`/rate limits
to match your service.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM10:2025 Unbounded Consumption
- MITRE D3FEND D3-ACH — Application Configuration Hardening
- CWE-770 — Allocation of Resources Without Limits or Throttling
- NIST SP 800-53 Rev 5 — SC-5 (Denial-of-Service Protection)
