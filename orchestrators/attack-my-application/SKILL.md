---
name: attack-my-application
description: >-
  Orchestrate a full, authorized security assessment of an application — web,
  API, cloud-native, CI/CD, mobile, network service, or LLM/AI-backed. Use when
  the operator says "attack my application" (or points you at a target and asks
  for a security review). This skill fingerprints the target, detects its
  surface type, confirms authorization and scope, then drives the RedBlueSkills
  library end to end — running each relevant offensive skill, verifying its
  paired detection, and producing a prioritized findings report. Authorized
  testing only.
version: 1.5.0
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
assessment", "pentest this app", "check my code for vulnerabilities", or gives you
a target (a code path **or** a running URL) and asks what's wrong with it. You are
the conductor: detect what the app is, decide which skills apply, run them in
kill-chain order, and report.

## Target modes — code on disk vs. a running app

The operator can point you at **either** of two things, and you must handle both.
Pick the mode from what they gave you:

| The operator gave you… | Mode | What you do |
|---|---|---|
| A **code path** (a directory/repo, or nothing — meaning "this project") | **source review** (default) | Read their actual source: routes, handlers, queries, templates, config, dependencies. Trace each user-controlled input to the dangerous sink it reaches. No live traffic is sent. |
| A **running URL** (`http://…`, a host, `localhost:3000`) | **live assessment** | Probe the deployed surface over HTTP with the minimal proof each skill defines. |

**Default to source review when no running URL is given.** "Attack my application"
with no URL means *"review the code I have right here"* — the app they built, in
this repo. Do not ask for a URL you weren't given; open the code and read it.

Both modes use the **same skills, the same surface × technique matrix, and the same
report**. The only difference is the evidence: in source review a finding is proven
by the vulnerable code path (file:line → sink) and a concrete input that would
reach it; in a live assessment it's proven by the minimal request/response. Where a
running instance is also available, use source review to find candidates fast and
the live probe to confirm exploitability — note which evidence backs each finding.

## Step 0 — Authorization gate (hard stop)

**Do not run any active step until this passes.** Use authorization already
provided in this session; ask only for missing details:

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

**Source-review mode is lighter-weight, but not gate-free.** Reading source code the
operator hands you (their own repo) sends no traffic and needs only ownership
established by their request to review the supplied project — question 1. You
still must not act on secrets you find in the code
(don't use discovered credentials against live systems), and if the repo is clearly
not the operator's, stop and ask. Questions 2–4 (scope, window, data handling) apply
in full the moment you touch a *running* instance.

## Step 1 — Fingerprint & map the surface

**First, classify the target's surface type** — it determines which part of the
library applies. One assessment may span several. Read `catalog.json` for the
authoritative per-surface skill list.

| Surface (`app_type`) | You're looking at… |
|---|---|
| `web-app` | A browser-facing web application (forms, HTML, cookies/JWT). |
| `api` | A REST/GraphQL API (JSON, object-id endpoints, tokens, no UI). |
| `cloud-native` | Cloud/container infra (IMDS, object storage, k8s, containers). |
| `ci-cd` | A build/deploy pipeline (runners, workflow files, artifacts, secrets). |
| `mobile` | A mobile app + its backend (APK/IPA, local storage, deep links). |
| `network` | Exposed network services (ports, TLS, lateral movement). |
| `llm-ai` | An LLM/GenAI-backed app or agent (chat box, RAG, tools, prompts). |

**In live mode**, for a classic web target load **`web-http-fingerprinting`** and
run it first. Identify:

- Server, framework, language, and any WAF/CDN.
- Entry points: forms, search, file up/download, URL-fetch features, XML/SOAP/SAML
  endpoints, auth and password-reset flows, object-id-bearing APIs.
- Session model: cookies (flags), tokens/JWT, SPA vs server-rendered.

**In source-review mode**, read the repository to build the same picture from the
code itself:

- **Detect the stack** — manifest/lockfile (`package.json`, `requirements.txt`,
  `go.mod`, `pom.xml`, `Gemfile`, …), framework, language, and the server entry
  point. Verify suspected vulnerable versions against an authoritative advisory
  and the resolved lockfile; report unverified matches as candidates.
- **Enumerate entry points** — every route/controller/handler and the request
  inputs it reads (query, body, headers, path params, uploaded files, message-queue
  or webhook payloads).
- **Find the sinks** — SQL/ORM calls, shell/`exec`/`system`, filesystem paths,
  outbound HTTP/URL fetches, XML/deserialization parsers, template rendering, auth
  and session logic, access-control checks.
- **Read the config** — session/cookie flags, security headers, CORS, secrets
  handling, framework security settings.

Record a **surface map**: each input → the sink it plausibly reaches, annotated
with the `file:line` where they connect. This map drives skill selection in Step 2
and becomes the evidence trail for source-review findings.

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
| Uploaded files entering storage or processors | `web-file-upload-abuse` | `web-file-upload-hardening` |
| JWT bearer-token middleware | `api-jwt-validation-abuse` | `api-jwt-validation-hardening` |
| State-changing requests | `web-csrf` | `web-csrf-hardening` |

If the target is an **LLM/AI-backed app or agent** (`llm-ai` surface), first build
an **AI threat model** — AI systems have assets and attack surfaces that don't
exist in traditional apps, so don't jump straight to the routing table. The threat
model is what makes the selection below complete instead of ad-hoc. Work through it
concretely for this target:

- **Identify AI-specific assets and attack surfaces that don't exist in traditional
  applications** — the model/weights, the system prompt, training/fine-tuning data,
  the RAG corpus and its ingestion path, embeddings/vector store, tool and function
  bindings, the context window itself, and per-request cost/quota.
- **Apply STRIDE to the AI/ML components with appropriate context** — e.g. Spoofing
  (impersonated tool output), Tampering (data/RAG poisoning), Repudiation (unlogged
  prompts/tool calls), Information disclosure (system-prompt or training-data leak),
  Denial of service (unbounded token/cost consumption), Elevation of privilege
  (prompt injection driving an over-privileged agent).
- **Use MITRE ATLAS to enumerate the adversarial techniques targeting AI systems**
  (its ML-specific tactics/techniques), alongside ATT&CK for the surrounding infra.
- **Map the OWASP LLM Top 10 risks to the architectural components** you found, so
  each risk lands on a concrete component — this is what tells you where the threats
  live and how to prioritise them.
- **Produce a structured threat assessment for the AI deployment** — assets → the
  STRIDE/ATLAS/OWASP-LLM threats against each → the components they live on →
  priority. That assessment drives which rows below you light up, and feeds the
  Step 5 report.

Then use this routing table instead of (or alongside) the web one — each row is one
OWASP-LLM risk mapped to its red/blue pair:

| If the LLM app has… | Run (red) | Verify (blue) |
|---|---|---|
| Untrusted text reaching the model (user input, RAG, tool output) | `llm-prompt-injection` | `llm-prompt-injection-detection` |
| Secrets/PII reachable through responses | `llm-sensitive-info-disclosure` | `llm-output-dlp` |
| A hidden system prompt (esp. with embedded secrets/rules) | `llm-system-prompt-leakage` | `llm-system-prompt-hardening` |
| An agent that can call tools/functions | `llm-excessive-agency` | `llm-agency-confinement` |
| No apparent input/output/rate/cost limits | `llm-unbounded-consumption` | `llm-consumption-limits` |
| Model output reaching HTML, SQL, a shell, or another interpreter | `llm-improper-output-handling` | `llm-output-encoding` |
| Retrieval over documents from multiple tenants or access levels | `llm-vector-store-leakage` | `llm-vector-store-isolation` |
| Answers used for factual decisions or policy advice | `llm-misinformation` | `llm-grounding-verification` |
| Third-party model/adapter artifacts or custom loaders | `llm-artifact-supply-chain-assessment` | `llm-artifact-supply-chain-hardening` |
| A training/fine-tuning or RAG ingestion path you can influence | `llm-data-poisoning` | `llm-training-data-provenance` |

For the other surfaces (`api`, `cloud-native`, `ci-cd`, `mobile`, `network`),
select from their skills in `catalog.json` by the same precondition logic: match
each observed feature to the offensive skill whose preconditions it satisfies,
and note the paired blue skill for Step 4.

Skip skills whose preconditions the surface map does not satisfy, and say why in
the report (coverage transparency matters).

## Step 3 — Execute in kill-chain order

Run only the selected skills, one at a time. Use the stage metadata from the
catalog to order applicable work: recon, initial-access, execution, persistence,
privilege-escalation, defense-evasion, credential-access, lateral-movement,
collection, exfiltration, impact. Dependencies and the agreed impact limits take
precedence; selecting a stage does not authorize its side effects. For HTTP live
assessments, use `web-http-fingerprinting` first when applicable. Do not send HTTP
probes during source review or force web skills onto unrelated surfaces.

Load each selected skill's Procedure, Preconditions, Authorization & scope, and
Validation sections. Adapt live commands to source tracing in source-review
mode. Record missing tools, accounts, telemetry, or lab access as `blocked`;
never substitute an assumed result. Check maturity and the named validation
target: a mock or different product demonstrates only that fixture's behavior.
A `reviewed` skill has no end-to-end validation claim, and stale evidence needs
rechecking before relying on it.

- **Live mode** — capture the request, the response, and the minimal proof. **Stop
  the moment anything indicates you are outside scope or causing unexpected side
  effects**, and report.
- **Source-review mode** — for each lit cell, locate the vulnerable code path and
  prove the finding by tracing input → sink at `file:line`, plus one concrete input
  that would reach it. You are reading, not running; there is no live side effect to
  stop for, but do not execute discovered payloads or credentials against any live
  system. If a running instance is available, you may confirm a candidate with the
  skill's minimal live probe — under the full Step 0 gate.

## Step 4 — Verify detectability (purple)

For every confirmed finding, load the paired **blue** skill and state whether the
activity *would be detected or prevented* by that control (and whether the operator
currently has the telemetry to see it). In live mode, judge against the activity you
generated; in source-review mode, judge against the code — is the logging,
input validation, or hardening the blue skill expects actually present in the
repo? Distinguish an observed detection/control failure from unavailable telemetry.
Missing access to logs means `not verified`, not that detection is absent. This is the
repo's core discipline: every offensive result carries its detection/hardening
counterpart.

## Step 5 — Report

Produce a single report with:

- **Executive summary** — what was tested, what was found, overall risk.
- **Scope & authorization** — what was confirmed in Step 0, and the test window.
- **Findings**, each with: title, affected endpoint **or `file:line`**, severity
  (based on demonstrated exploitability, affected privileges, and data sensitivity;
  the skill's `risk.level` describes execution risk, not finding severity),
  reproduction (the minimal request in live mode, or the
  input → sink code path in source-review mode), the paired detection/hardening from
  Step 4, and remediation. State which evidence backs each finding (code path,
  live proof, or both).
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
  for this run: `confirmed` / `tested-clean` / `inconclusive` / `blocked (reason)` / `skipped (reason)`.
  `tested-clean` applies only to the tested inputs and controls, not the entire
  application. Separate source-review candidates from live-confirmed findings. Nothing is
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

- The per-technique procedures live in `skills/<surface>/**` (e.g.
  `skills/web-app/**`, `skills/llm-ai/**`) — this orchestrator only sequences them.
- `catalog.json` — the authoritative, machine-readable list of available skills,
  their risk levels, and their pairings.
