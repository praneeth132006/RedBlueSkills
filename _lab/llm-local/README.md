# `llm-local` — a dependency-free lab for OWASP-LLM skills

A tiny, deterministic **mock LLM application** used to validate the `llm-ai`
red/blue skills end-to-end — no GPU, no API key, no network, no Docker. Python
3 stdlib only (works on the system `python3`).

## What's here

| File | Role |
|---|---|
| `mock_llm.py` | The app under test. `MockLLMApp(mode=...)` simulates an LLM-backed storefront assistant in a **`vuln`** build (naive) and a **`hardened`** build (blue-skill control applied). |
| `validate.py` | Runs each control in both modes and asserts the attack succeeds against `vuln` and is blocked by `hardened`. |

The mock is not a real model — it is a small state machine that *follows
instructions deterministically*. That is exactly the property prompt injection
abuses, so the vulnerable/hardened contrast is faithful to the real failure mode
while staying 100% reproducible.

## Run it

```bash
python3 _lab/llm-local/validate.py
```

Exit `0` means every control passed both halves (attack works on `vuln`, is
blocked on `hardened`).

## Controls ↔ skills

| OWASP LLM 2025 | red skill | blue skill |
|---|---|---|
| LLM01 Prompt Injection | `llm-prompt-injection` | `llm-prompt-injection-detection` |
| LLM02 Sensitive Info Disclosure | `llm-sensitive-info-disclosure` | `llm-output-dlp` |
| LLM06 Excessive Agency | `llm-excessive-agency` | `llm-agency-confinement` |
| LLM07 System Prompt Leakage | `llm-system-prompt-leakage` | `llm-system-prompt-hardening` |
| LLM10 Unbounded Consumption | `llm-unbounded-consumption` | `llm-consumption-limits` |

Validation target name used in skill frontmatter: **`llm-local`**.
