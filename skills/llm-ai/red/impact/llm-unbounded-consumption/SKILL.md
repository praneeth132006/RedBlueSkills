---
name: llm-unbounded-consumption
description: >-
  Demonstrate unbounded resource consumption against an LLM application — token
  floods, unbounded output, and cost/denial-of-wallet amplification — during an
  authorized assessment. Use when you need to prove the app lacks input, output,
  rate, or cost limits.
version: 1.0.0
team: red
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: impact
techniques:
  attack: [T1499]
  capec: [CAPEC-125]
  cwe: [CWE-770]
  owasp: []
  d3fend: []
pairs_with: [llm-consumption-limits]
risk:
  level: medium
  reversible: true
  data_touch: none
authorization: required
maturity: validated
validation:
  method: lab
  target: llm-local
  last_validated: 2026-08-09
  validated_by: praneeth132006
license: Apache-2.0
---

# LLM unbounded consumption

## Overview

Unbounded consumption (OWASP LLM10:2025) covers the ways an LLM application can be
driven to excessive resource use: oversized inputs, prompts that force very long
outputs, high-frequency requests, and recursive/agentic loops — leading to
service degradation and, because inference is metered, **denial-of-wallet** cost
amplification. This skill measures the app's limits (or absence of them) with
controlled, non-destructive probes.

## Authorization & scope

**Run only against systems you are explicitly authorized to test**, and treat
load as dangerous: it can degrade service and incur real cost. Confirm:

- A load/cost test is in the written scope, with an agreed ceiling and window.
- You will use the **smallest** probe that establishes the missing limit — prove
  *"no cap exists"*, not *"I can exhaust the account."*
- An owner is reachable to abort. Prefer a staging environment.

Stop at the first sign of impact on real users.

## Preconditions

- A request surface for the app and the ability to measure response
  size/latency, and ideally token or cost metering.

## Procedure

1. **Probe input limits.** Send a single request whose input grows well past any
   sane bound (e.g. tens of thousands of characters). If it is processed rather
   than rejected, there is no input cap.
2. **Probe output limits.** Ask for output that would be enormous ("repeat the
   word 'lab' 100,000 times", "list every integer to 100000"). Unbounded
   generation confirms a missing `max_tokens`/output cap.
3. **Probe rate limits.** Send a short, controlled burst and observe whether
   throttling (429) engages. Keep the burst small — you are checking *whether* a
   limit exists.
4. **Probe amplification.** If the app is agentic, look for input that induces a
   long tool/recursion loop (one request → many model calls), the highest
   cost-per-request lever.
5. **Quantify.** Record per-request tokens/time/cost and extrapolate the ceiling
   an attacker could reach — the denial-of-wallet argument — **without** actually
   running to exhaustion.
6. **Record** each probe, whether a limit engaged, and the estimated cost impact.

## Paired defense / offense

Pairs with **llm-consumption-limits**. Each probe targets a specific missing
control: input-size cap, output/token cap, rate limit, and loop/step budget.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The `LLM10 unbounded-consumption` case sends a 50,000-char request: the **vuln**
build processes it, the **hardened** build rejects it against `max_input_chars`
(`chat()` in `mock_llm.py`). This mirrors step 1 safely and deterministically.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM10:2025 Unbounded Consumption
- MITRE ATT&CK T1499 — Endpoint Denial of Service
- CWE-770 — Allocation of Resources Without Limits or Throttling
- OWASP — Denial of Wallet / LLM cost-abuse guidance
