---
name: llm-agency-confinement
description: >-
  Confine an LLM agent's actions with tool allowlists, least-privilege
  credentials, parameter validation, and human-in-the-loop gates. Use when
  hardening an agent so injected or crafted input cannot trigger unintended,
  high-impact tool calls.
version: 1.0.0
team: blue
app_type: llm-ai
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1059]
  capec: [CAPEC-233]
  cwe: [CWE-269]
  owasp: []
  d3fend: [D3-ACH]
pairs_with: [llm-excessive-agency]
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

# LLM agency confinement

## Overview

Contain the blast radius of an LLM agent (OWASP LLM06:2025) so that even a
successful prompt injection cannot cause an out-of-scope action. The controls are
structural, not model-dependent: restrict *what* tools exist, *what* they can do,
and *when* they run without a human. This skill specifies the confinement layers
and how to verify each.

## Authorization & scope

Defensive design and configuration on systems you operate. These controls are
safe to deploy in production and are the primary mitigation for excessive agency;
do not rely on the model "deciding" to refuse.

## Preconditions

- Control over the agent's tool registry, the credentials each tool uses, and the
  execution wrapper that dispatches tool calls.

## Procedure

1. **Tool allowlist.** Register only the tools the use case needs; dispatch
   through a wrapper that rejects any tool not on the allowlist. Deny by default.
   ```python
   ALLOWLIST = {"search_catalog", "get_order_status"}
   def dispatch(tool, args):
       if tool not in ALLOWLIST:
           raise PermissionError(f"tool '{tool}' not permitted")
       return TOOLS[tool](**validate(tool, args))
   ```
2. **Least privilege.** Give each tool the narrowest backend credential — read
   scope where writes are not required, per-tenant keys, no broad admin tokens.
   Excess *permission* is as dangerous as excess *tools*.
3. **Validate parameters.** Constrain tool arguments (types, ranges, id
   ownership) server-side; never pass model-authored ids straight to a
   privileged call. Enforce that the acting user owns the referenced resource.
4. **Human-in-the-loop for high impact.** Require explicit user/operator
   confirmation for irreversible or high-value actions (delete, transfer, send).
   The model may *propose*; a person *approves*.
5. **Isolate and rate-limit.** Run tools with minimal ambient authority; cap the
   number and rate of actions per session to blunt automated abuse.
6. **Log every call.** Emit the tool, args, initiating turn, and outcome so the
   paired detection can spot hijacks.

## Paired defense / offense

Pairs with **llm-excessive-agency**. Each confinement layer answers an attack
step: the allowlist blocks unlisted-tool hijacks, least privilege caps damage,
parameter validation stops id tampering, and the human gate stops silent
high-impact actions.

## Validation

Reproduce against the **`llm-local`** lab:

```bash
python3 _lab/llm-local/validate.py
```

The hardened build in `mock_llm.py` enforces `TOOL_ALLOWLIST`; the harness
asserts the injected `delete_all_orders` call is refused (`ran=[]`) while the
vuln build runs it. Add your real tools to `ALLOWLIST` and re-run against your
own dispatcher.

## References

- OWASP Top 10 for LLM Applications 2025 — LLM06:2025 Excessive Agency
- MITRE D3FEND D3-ACH — Application Configuration Hardening
- CWE-269 — Improper Privilege Management
- NIST SP 800-53 Rev 5 — AC-6 (Least Privilege), AC-3 (Access Enforcement)
