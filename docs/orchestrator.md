# The `attack-my-application` orchestrator, step by step

This is the deep-dive companion to the [Quickstart](../QUICKSTART.md). It explains
**how** the orchestrator turns one instruction — "attack my application" — into a
methodical, authorized assessment, and what each stage produces. Read it if you
want to understand (or audit) exactly what your agent is doing before you let it
loose on your app.

The orchestrator itself is a single skill file:
[`orchestrators/attack-my-application/SKILL.md`](../orchestrators/attack-my-application/SKILL.md).
It contains **no exploit code of its own** — it is a *conductor* that sequences the
validated red/blue skills in [`skills/`](../skills/) into a coherent flow.

---

## The mental model: a surface × technique matrix

The orchestrator does not blindly fire every payload at every URL. It builds a
**surface map** first — the list of places an attacker can put input and where that
input plausibly ends up — and then it applies techniques **only where a
precondition is satisfied.**

Think of it as a grid: your app's surfaces down the side, the library's techniques
across the top. A cell only lights up when that surface could actually reach that
kind of sink.

```
                         SQLi  XSS   CmdInj  PathTrav  SSRF  XXE   IDOR  Auth  CSRF
  /login (form)           ·     ·      —        —       —     —     —     ✓     ✓
  /search?q= (reflected)  ✓     ✓      —        —       —     —     —     —     —
  /import?url= (fetch)    —     —      —        —       ✓     —     —     —     ✓
  /files?name= (path)     —     —      —        ✓       —     —     —     —     —
  /api/orders/{id}        ✓     —      —        —       —     —     ✓     —     —
  /upload (XML/SVG)       —     —      —        —       —     ✓     —     —     ✓
  ✓ = precondition met, technique selected   · = possible, low signal   — = not applicable
```

Every ✓ becomes one **planned probe**. Every `—` is recorded too — that's your
**coverage transparency**: the report tells you not just what was tested, but what
was skipped and why. "We didn't test XXE because nothing parses XML" is a finding
you can trust.

---

## Stage 0 — Authorization gate (hard stop)

**Nothing active happens until this passes.** The orchestrator asks you, in the
session, to confirm four things:

| Question | Why it matters |
|---|---|
| **Ownership / permission** | You own the target or hold written authorization (SOW, rules of engagement, or an in-scope bug-bounty program). |
| **Scope** | The exact hosts/URLs in play — and anything explicitly out of scope. |
| **Window & intensity** | When testing is allowed, and any rate/impact limits. |
| **Data handling** | You accept that impact is proven *minimally* — no exfiltrating real PII, no destructive payloads. |

If any answer is missing, or the target looks like a third party you don't control,
it **stops and asks.** Passive recon that only reads already-served public responses
may begin once ownership is stated; **every** exploitation step requires the full
gate. This gate is **per-session** — it does not carry over from a previous run.

> This is the single most important line in the whole system. A tool that will
> attack anything on command is a liability. This one won't.

## Stage 1 — Fingerprint & map the surface

The orchestrator loads [`web-http-fingerprinting`](../skills/web-app/red/recon/web-http-fingerprinting/SKILL.md)
and runs it first. It identifies:

- **Stack** — server, framework, language, and any WAF/CDN in front.
- **Entry points** — forms, search, file up/download, URL-fetch features
  (webhooks, importers, link previews), XML/SOAP/SAML/SVG endpoints, auth and
  password-reset flows, and object-id-bearing APIs.
- **Session model** — cookies and their flags, tokens/JWT, SPA vs server-rendered.

The output is the **surface map**: each input mapped to the sink it plausibly
reaches. This is the left-hand column of the matrix above.

## Stage 2 — Select applicable skills

For each surface feature, the orchestrator selects the matching offensive skill and
notes its paired defensive skill for later. The routing is precondition-driven —
[`catalog.json`](../catalog.json) is the authoritative, current list:

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

Skills whose preconditions the surface map doesn't satisfy are **skipped and
recorded** — coverage transparency, not silent omission.

## Stage 3 — Execute in kill-chain order

Selected skills run **one at a time**, in an order chosen so findings build on each
other and noise stays low:

1. **recon** — `web-http-fingerprinting` (always first).
2. **initial-access** — injection & inclusion: SQLi, reflected XSS, command
   injection, path traversal, SSRF, XXE.
3. **privilege-escalation / access control** — IDOR.
4. **credential-access** — broken authentication.
5. **execution (client-driven)** — CSRF.

For each skill the orchestrator follows the skill's own **Procedure**, honours its
**Authorization & scope** and its "prove impact minimally" guidance, and captures
the request, the evidence, and the smallest proof that the flaw is real. It **stops
immediately** if anything indicates it's outside scope or causing unexpected side
effects.

The guiding principle throughout: **minimal proof over maximal exploitation; read
over write; reversible over destructive.** One clean proof per finding beats ten
payloads.

## Stage 4 — Verify detectability (the purple step)

This is the discipline that makes the project different. For **every** confirmed
finding, the orchestrator loads the paired **blue** skill and asks: *would the
defender's own controls have caught or prevented this, and do they even have the
telemetry to see it?*

Offense the defender can't see is itself a finding. If your SQL injection sailed
through with nothing in your logs, the report says so — that missing detection is
often more important than the bug.

## Stage 5 — Report

You get one report:

- **Executive summary** — what was tested, what was found, overall risk.
- **Scope & authorization** — what you confirmed in Stage 0, and the test window.
- **Findings**, each with: title, affected endpoint, severity (starting from the
  skill's `risk.level`, adjusted for exploitability and data sensitivity),
  reproduction (the minimal request/evidence), the paired detection/hardening from
  Stage 4, and remediation.
- **Per-screen risk roll-up** — a table of each surface and its worst finding, so
  you can see which page needs attention first.
- **Coverage** — which skills ran, which were skipped and why (from Stage 2).
- **Prioritized remediation plan** — highest-impact, lowest-effort fixes first,
  each linked to its blue skill.

Findings are ordered by severity, then by ease of exploitation.

---

## What a run looks like (abbreviated transcript)

```
You:   Attack my application at http://localhost:3000. It's my own app,
       running locally, and I authorize testing it.

Agent: Before I run anything active, I need to confirm the authorization gate:
        1. Ownership/permission — you've said you own it and authorize testing. ✓
        2. Scope — is http://localhost:3000 the only in-scope host? Anything off-limits?
        3. Window & intensity — OK to run now? Any rate limits?
        4. Data handling — I'll prove impact minimally and won't exfiltrate data. OK?

You:   Yes to all. Only localhost:3000, no rate limit, go ahead.

Agent: [Stage 1] Fingerprinting…
        - Server: Werkzeug/Python (Flask). No WAF.
        - Entry points: /login (form), /search?q= (reflected), /profile?id= (object id),
          /import?url= (server fetch). Session: cookie `session`, no HttpOnly flag.

       [Stage 2] Surface → technique selection:
        - /search?q=  → web-reflected-xss, web-sql-injection
        - /profile?id= → web-idor, web-sql-injection
        - /import?url= → web-ssrf
        - /login       → web-broken-authentication, web-csrf
        - Skipped: web-command-injection (no shell sink), web-path-traversal
          (no file-path param), web-xxe (no XML parser seen).

       [Stage 3] Running in kill-chain order…
        - web-reflected-xss on /search?q= → CONFIRMED. Payload reflected unencoded.
        - web-idor on /profile?id= → CONFIRMED. id=2 returns another user's record.
        - web-ssrf on /import?url= → CONFIRMED. Callback hit my OOB listener.
        - web-broken-authentication → no lockout after 20 attempts (weak, not critical).

       [Stage 4] Detectability:
        - XSS: no CSP; a report-only CSP would have surfaced it. Not currently logged.
        - IDOR: no per-object authorization log. web-access-control-monitoring would catch it.

       [Stage 5] Report ↓
```

```
FINDINGS (worst first)
  HIGH    IDOR on /profile?id=      — sequential ids expose other users. Fix: object-level authz.
  MEDIUM  Reflected XSS on /search  — q reflected unencoded. Fix: contextual output encoding + CSP.
  MEDIUM  SSRF on /import?url=       — server fetches arbitrary hosts. Fix: egress allow-list.
  LOW     No auth rate-limiting     — brute-force feasible. Fix: lockout + throttling.

PER-SCREEN RISK
  /profile   HIGH     /search   MEDIUM     /import   MEDIUM     /login   LOW

COVERAGE
  Ran: recon, xss, idor, ssrf, auth, csrf(no state-change found)
  Skipped: cmd-injection, path-traversal, xxe (preconditions not met)
```

Every "Fix:" links back to the paired blue skill, so the report is a to-do list,
not just a verdict.

---

## Running it yourself

```bash
node bin/cli.js attack http://localhost:3000   # prints the instruction to paste
node bin/cli.js attack --print                 # prints the full playbook
```

Or open your agent in the project and just say **"attack my application at
`<url>`."** See the [Quickstart](../QUICKSTART.md) for the 5-minute version, and
[`docs/examples/`](examples/) for full runs against Flask, Node, and Rails apps.
