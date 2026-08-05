---
name: attack-my-application
description: >-
  Orchestrate a full, authorized security assessment of a web application. Use
  when the operator says "attack my application" (or points you at a target URL
  and asks for a security review). This skill fingerprints the target, confirms
  authorization and scope, then drives the RedBlueSkills library end to end —
  running each relevant offensive skill, verifying its paired detection, and
  producing a prioritized findings report. Authorized testing only.
version: 1.1.0
kind: orchestrator
app_type: web-app
license: Apache-2.0
---

# attack-my-application

> **This is the top-level orchestrator.** It does not itself contain exploit
> mechanics — it *sequences* the validated skills in this repository into a
> coherent assessment. Load the individual `SKILL.md` files it selects to get the
> actual procedures.

## When to use

Trigger this when the operator asks to "attack my application", "run a security
assessment", "pentest this app", or gives a target URL and asks what's wrong with
it. You are the conductor: detect what the app is, decide which skills apply, run
them in kill-chain order, and report.

## Step 0 — Authorization gate (hard stop)

**Do not run any active step until this passes.** Ask the operator to confirm, in
this session:

1. **Ownership / permission** — they own the target or hold written authorization
   (SOW, rules of engagement, or an in-scope bug-bounty program).
2. **Scope** — the exact hosts/URLs, and anything explicitly out of scope.
3. **Window & intensity** — when testing is allowed and any rate/impact limits.
4. **Data handling** — that you will prove impact minimally and not exfiltrate real
   PII or run destructive payloads.

If any answer is missing or the target looks like a third party the operator does
not control, **stop and ask** — do not proceed. Recon that only reads public,
already-served responses may begin once ownership is stated; every
initial-access/exploitation step requires the full gate above.

## Step 1 — Fingerprint & map the surface

Load **`web-http-fingerprinting`** and run it first. Identify:

- Server, framework, language, and any WAF/CDN.
- Entry points: forms, search, file up/download, URL-fetch features, XML/SOAP/SAML
  endpoints, auth and password-reset flows, object-id-bearing APIs.
- Session model: cookies (flags), tokens/JWT, SPA vs server-rendered.

Record a **surface map**: each input → the sink it plausibly reaches. This map
drives skill selection in Step 2.

**Think of the assessment as a surface × technique matrix** — surfaces down the
side, techniques across the top. A cell only lights up when that surface could
actually reach that kind of sink; run one probe per lit cell, and record every
un-lit cell as deliberate (skipped-with-reason) coverage.

```
                         SQLi  XSS   CmdInj  PathTrav  SSRF  XXE   IDOR  Auth  CSRF
  /login (form)           ·     ·      —        —       —     —     —     ✓     ✓
  /search?q= (reflected)  ✓     ✓      —        —       —     —     —     —     —
  /import?url= (fetch)    —     —      —        —       ✓     —     —     —     ✓
  /files?name= (path)     —     —      —        ✓       —     —     —     —     —
  /api/orders/{id}        ✓     —      —        —       —     —     ✓     —     —
  ✓ selected   · possible/low-signal   — not applicable
```

## Step 2 — Select applicable skills

For each observed surface feature, select the matching offensive skill (and note
its paired defensive skill for Step 4). Use this routing table — read
`catalog.json` for the authoritative, current list:

| If the surface has… | Run (red) | Verify (blue) |
|---|---|---|
| Any HTTP response / headers | `web-http-fingerprinting` | `web-security-headers` |
| A parameter reaching a SQL query | `web-sql-injection` | `web-sqli-detection` |
| Input reflected into HTML/JS | `web-reflected-xss` | `web-xss-detection` |
| Input reaching a shell/process | `web-command-injection` | `web-command-injection-detection` |
| A parameter selecting a file path | `web-path-traversal` | `web-path-traversal-detection` |
| A server-side URL/host fetch | `web-ssrf` | `web-ssrf-hardening` |
| An XML/SOAP/SAML/SVG parser | `web-xxe` | `web-xxe-hardening` |
| Object ids selecting records | `web-idor` | `web-access-control-monitoring` |
| Login / session / reset flows | `web-broken-authentication` | `web-authentication-hardening` |
| State-changing requests | `web-csrf` | `web-csrf-hardening` |

Skip skills whose preconditions the surface map does not satisfy, and say why in
the report (coverage transparency matters).

## Step 3 — Execute in kill-chain order

Run the selected skills one at a time, in this order, so findings build on each
other and noise is minimized:

1. **recon** — `web-http-fingerprinting` (always first).
2. **initial-access** — injection & inclusion: `web-sql-injection`,
   `web-reflected-xss`, `web-command-injection`, `web-path-traversal`, `web-ssrf`,
   `web-xxe`.
3. **privilege-escalation / access control** — `web-idor`.
4. **credential-access** — `web-broken-authentication`.
5. **execution (client-driven)** — `web-csrf`.

For each skill: follow its Procedure exactly, honour its Authorization & scope and
its "prove impact minimally" guidance, and capture the request, the evidence, and
the minimal proof. **Stop the moment anything indicates you are outside scope or
causing unexpected side effects**, and report.

## Step 4 — Verify detectability (purple)

For every confirmed finding, load the paired **blue** skill and state whether the
activity you generated *would be detected or prevented* by that control (and
whether the operator currently has the telemetry to see it). Offense the defender
can't see is itself a finding — call it out. This is the repo's core discipline:
every offensive result carries its detection/hardening counterpart.

## Step 5 — Report

Produce a single report with:

- **Executive summary** — what was tested, what was found, overall risk.
- **Scope & authorization** — what was confirmed in Step 0, and the test window.
- **Findings**, each with: title, affected endpoint, severity (use the skill's
  `risk.level` as a starting point, adjusted for exploitability and data
  sensitivity), reproduction (the minimal request/evidence), the paired
  detection/hardening from Step 4, and remediation.
- **Per-screen risk roll-up** — a table of each surface/screen from the Step 1 map
  against its worst confirmed finding, so the operator can see which page to fix
  first. Example:

  | Screen / endpoint | Worst finding | Severity | Fix (blue skill) |
  |---|---|---|---|
  | `/profile?id=` | IDOR | HIGH | `web-access-control-monitoring` |
  | `/search?q=` | Reflected XSS | MEDIUM | `web-xss-detection` |
  | `/import?url=` | SSRF | MEDIUM | `web-ssrf-hardening` |
  | `/login` | No rate-limit | LOW | `web-authentication-hardening` |
- **Technique coverage roll-up** — every technique in the library and its outcome
  for this run: `confirmed` / `tested-clean` / `skipped (reason)`. Nothing is
  silently omitted.
- **Coverage** — which skills ran, which were skipped and why (from Step 2).
- **Prioritized remediation plan** — highest-impact, lowest-effort fixes first,
  each linked to its blue skill.

Order findings by severity, then by ease of exploitation. Prefer one clear proof
per finding over exhaustive exploitation.

## Guardrails (always)

- Authorization gate (Step 0) is non-negotiable and per-session.
- Minimal proof over maximal exploitation; read over write; reversible over
  destructive.
- Never dump real PII, harvest live credentials, run DoS/expansion payloads, or
  persist access.
- If the target is not clearly the operator's or in written scope, stop and ask.
- Everything you do should be something the paired blue skill can catch — if it
  can't, that's a reportable gap, not a reason to hide the activity.

## References

- The per-technique procedures live in `skills/web-app/**` — this orchestrator
  only sequences them.
- `catalog.json` — the authoritative, machine-readable list of available skills,
  their risk levels, and their pairings.
