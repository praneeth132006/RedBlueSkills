# Real-world examples

Walkthroughs of running RedBlueSkills against real stacks. Each one assumes you
own the app (or are running the sample locally) and starts from the same place: you
install the library, point your agent at the app, and pass the authorization gate.

> ⚠️ Every example targets **an app you run locally / own**. Do not point these at
> anything you're not authorized to test. See [`ETHICS.md`](../../ETHICS.md).

| Stack | Walkthrough | What it highlights |
|---|---|---|
| **Python / Flask** | [flask.md](flask.md) | Reflected XSS, IDOR, SSRF on a server-rendered app |
| **Node.js / Express** | [node-express.md](node-express.md) | SQL injection, missing security headers, CSRF on an API + views |
| **Ruby on Rails** | [rails.md](rails.md) | Mass-assignment-style IDOR, auth hardening, path traversal on file downloads |

New to all this? Read the [Quickstart](../../QUICKSTART.md) first, then the
[orchestrator walkthrough](../orchestrator.md) to understand what each stage does.

## The shape every example follows

1. **Install** — `npx redblueskills init` in the project root.
2. **Describe the target** to your agent and pass the [authorization gate](../orchestrator.md#stage-0--authorization-gate-hard-stop).
3. **Let it map the surface** (Stage 1) and **select techniques** (Stage 2).
4. **Read the findings**, each paired with the detection/hardening that closes it.
5. **Fix**, then re-run to confirm the finding is gone.

The point isn't the specific bugs — it's that the same one instruction produces a
grounded, per-surface report on any of these stacks.
