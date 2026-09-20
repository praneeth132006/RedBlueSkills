# Quickstart — install and run a scoped assessment

RedBlueSkills provides playbooks for compatible coding agents. The CLI installs
instructions and prints assessment prompts; the agent needs the tools, permissions,
and target access to execute them. A report is not guaranteed within a fixed time.

As checked on 2026-09-19, npm publication is pending. Use the source checkout below.

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

## Step 1 — Install from source

The current website reflects PR #24. From a working directory:

```bash
git clone --branch codex/clean-site-unscoped-package https://github.com/praneeth132006/RedBlueSkills.git
cd RedBlueSkills
node bin/cli.js init --dest /path/to/your/project/.claude/skills/redblueskills
```

Replace `/path/to/your/project` with the project you want to assess. Run the
remaining CLI examples from the cloned repository, using an explicit target path
for source assessments in another project.

That copies every skill **and** the `attack-my-application` orchestrator into
`./.claude/skills/redblueskills/`, plus a generated `README.md` that tells your
agent when to load each one. No runtime npm dependencies are installed.

Only want one technique? Grab it — its paired defense comes along automatically:

```bash
node bin/cli.js add web-sql-injection
```

Browse what's available anytime:

```bash
node bin/cli.js list          # everything
node bin/cli.js list red      # just offense
node bin/cli.js list blue     # just defense
node bin/cli.js list ssrf     # free-text search
```

## Step 2 — Point your agent at a target and give the instruction

You don't need a link or a deployed server. There are two ways to point the
orchestrator at your app — pick whichever you have.

**A) Review the code you built (default).** Open your coding agent **in your
project** and say, in plain English:

> **Attack my application. It's my own code in this project and I authorize testing
> it.**

The agent reads your actual source — routes, queries, templates, config, and
dependencies — traces each user input to the risky sink it reaches, and proves each
finding with the exact `file:line`. Nothing is sent over the network. Want a
specific folder instead of the whole project? Say *"…review the code at `./src`."*

**B) Probe a running app.** If you have the app running, give it the URL instead:

> **Attack my application at `http://localhost:3000`. It's my own app running
> locally and I authorize testing it.**

Or, to see the exact instruction and playbook without guessing:

```bash
node bin/cli.js attack                          # review the code in this project
node bin/cli.js attack ./src                     # review a specific code path
node bin/cli.js attack http://localhost:3000     # probe a running app
node bin/cli.js attack --print                   # the full orchestrator playbook
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
