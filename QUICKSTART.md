# Quickstart — from zero to a security report in 5 minutes

**New here? Start on this page.** RedBlueSkills turns your AI coding agent (Claude
Code and friends) into an authorized security tester *and* a defender. You install
the library once, point it at an app **you own or are allowed to test**, and say
**"attack my application."** The agent probes the app, proves what it finds with a
minimal example, checks whether your own logging would have caught it, and writes
you a prioritized report.

No security background required. If you can run one `npx` command, you can do this.

> ⚠️ **One rule before anything else.** Only run these skills against systems you
> own or have **written permission** to test, and only to defend systems you
> operate. That's not boilerplate — the orchestrator will stop and ask you to
> confirm it. Read [`ETHICS.md`](ETHICS.md) once; it takes two minutes.

---

## What you need

- **Node.js 16+** (for the one-line installer). Check with `node -v`.
- **An AI coding agent** that can read files and run commands — e.g. [Claude Code](https://docs.claude.com/en/docs/claude-code).
- **A target you're allowed to test.** If you don't have one, spin up the practice
  lab in [`_lab/`](_lab/) (an intentionally-vulnerable app) — it's built exactly
  for this and needs no permission.

---

## Step 1 — Install the library into your agent (30 seconds)

From the root of the project you want to test:

```bash
npx redblueskills init
```

That copies every skill **and** the `attack-my-application` orchestrator into
`./.claude/skills/redblueskills/`, plus a generated `README.md` that tells your
agent when to load each one. No repo to clone, no submodules.

Only want one technique? Grab it — its paired defense comes along automatically:

```bash
npx redblueskills add web-sql-injection
```

Browse what's available anytime:

```bash
npx redblueskills list          # everything
npx redblueskills list red      # just offense
npx redblueskills list blue     # just defense
npx redblueskills list ssrf     # free-text search
```

## Step 2 — Point your agent at a target and give the instruction

Open your coding agent **in the same project** and say, in plain English:

> **Attack my application at `http://localhost:3000`. It's my own app running
> locally and I authorize testing it.**

Or, to see the exact instruction and playbook without guessing:

```bash
npx redblueskills attack http://localhost:3000     # prints the instruction to paste
npx redblueskills attack --print                   # prints the full orchestrator playbook
```

## Step 3 — Answer the authorization questions

Before it touches the app, the orchestrator **stops** and asks you to confirm four
things in the chat:

1. **Ownership / permission** — you own it or hold written authorization.
2. **Scope** — the exact URLs in scope, and anything off-limits.
3. **Window & intensity** — when it may test and any rate limits.
4. **Data handling** — it will prove impact *minimally* and never exfiltrate real data.

Answer them. If anything is missing, it won't proceed — that's the safety gate
working as designed.

## Step 4 — Let it run, then read the report

The agent then works through your app in kill-chain order — recon first, then
injection, access control, authentication, and client-side issues — proving each
finding with the smallest possible example and stopping the moment anything looks
out of scope. When it's done you get a single report:

- **Executive summary** — what was tested and the overall risk.
- **Findings** — each with the affected page/endpoint, severity, a one-line
  reproduction, **whether your own logs would have caught it**, and the fix.
- **Coverage** — which techniques ran, which were skipped, and why.
- **Prioritized fixes** — highest-impact, lowest-effort first, each linked to the
  matching **defense** skill so you can close it, not just find it.

That's the whole loop: **find → prove → check you'd detect it → fix.**

---

## Don't have a target? Use the practice lab

```bash
cd _lab
docker compose up -d
```

This brings up an intentionally-vulnerable app you're free to attack. Point the
orchestrator at it (`http://localhost:3000` by default — see [`_lab/README.md`](_lab/README.md))
and run the exact same flow. It's the best way to see what a real report looks like
before you run against your own staging environment.

---

## Fix, don't just find

Every offensive skill is **paired** with a defensive one. When the report says you
have SQL injection, it also points you at `web-sqli-detection` (would your logging
have seen it?) and the hardening steps to close it. You can also run the blue side
directly — no attacking required:

> **Review my app's defenses. Load `web-security-headers` and
> `web-authentication-hardening` and tell me what's missing.**

Blue skills are **passive** — they read configuration and logs, don't touch the
target offensively, and don't need the authorization gate.

---

## Where to go next

| You want to… | Go to |
|---|---|
| Understand exactly how the orchestrator thinks | [`docs/orchestrator.md`](docs/orchestrator.md) |
| See a full run against a real stack | [`docs/examples/`](docs/examples/) — Flask · Node/Express · Rails |
| Browse every skill | [`INDEX.md`](INDEX.md) or the [website](site/) |
| Write your own skill | [`docs/adding-a-skill.md`](docs/adding-a-skill.md) |
| Understand the rules of the road | [`ETHICS.md`](ETHICS.md) |

Questions or something unclear? Open an issue — the quickstart is meant to *just
work*, and if it didn't for you, that's a bug worth fixing.
