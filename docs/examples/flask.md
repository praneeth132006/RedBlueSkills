# Example: assessing a Python / Flask app

A end-to-end walkthrough of running `attack-my-application` against a small
server-rendered Flask app **you run locally**. It shows how the orchestrator maps
the surface, picks techniques, and reports — with the exact prompts you'd type.

> ⚠️ This targets an app on your own machine. Only test what you're authorized to.

---

## The app under test

Assume a typical intranet-style Flask app you're developing:

```python
# app.py (illustrative — the kinds of endpoints the orchestrator will find)
from flask import Flask, request, render_template_string, session, redirect
import sqlite3, requests

app = Flask(__name__)
app.secret_key = "dev"

@app.route("/search")
def search():
    q = request.args.get("q", "")
    # q is interpolated straight into the page → reflected XSS candidate
    return render_template_string(f"<h1>Results for {q}</h1>")

@app.route("/profile")
def profile():
    uid = request.args.get("id")
    # object id straight from the query string → IDOR candidate
    row = sqlite3.connect("app.db").execute(
        f"SELECT name, email FROM users WHERE id = {uid}").fetchone()  # also SQLi
    return {"name": row[0], "email": row[1]}

@app.route("/import")
def import_url():
    url = request.args.get("url")
    # server fetches an attacker-supplied URL → SSRF candidate
    return requests.get(url).text
```

Run it locally on `http://localhost:5000`.

## Step 1 — Install and start the agent

```bash
npx redblueskills init
```

Open Claude Code (or your agent) in the same directory.

## Step 2 — The instruction + authorization gate

> **Attack my application at `http://localhost:5000`. It's my own Flask app running
> locally and I authorize testing it.**

The agent stops and confirms ownership, scope (`localhost:5000` only), window (now,
no rate limit), and data handling (minimal proof). You say yes. *Now* it proceeds.

## Step 3 — Fingerprint & surface map (Stage 1)

```
Server: Werkzeug/2.x Python/3.x  (Flask, server-rendered, no WAF)
Entry points:
  /search?q=      → reflected into HTML
  /profile?id=    → object id → SQL query
  /import?url=     → server-side fetch
Session: cookie `session` (Flask signed), missing Secure/HttpOnly hardening
```

## Step 4 — Technique selection (Stage 2)

| Surface | Selected (red) | Paired (blue) |
|---|---|---|
| `/search?q=` | `web-reflected-xss` | `web-xss-detection` |
| `/profile?id=` | `web-sql-injection`, `web-idor` | `web-sqli-detection`, `web-access-control-monitoring` |
| `/import?url=` | `web-ssrf` | `web-ssrf-hardening` |
| all responses | `web-http-fingerprinting` | `web-security-headers` |
| **skipped** | `web-command-injection`, `web-path-traversal`, `web-xxe` | no shell / file-path / XML sink observed |

## Step 5 — Findings

```
HIGH     SQL injection on /profile?id=
         id=1 OR 1=1  returns extra rows; id is concatenated into the query.
         Fix → web-sqli-detection: parameterize (sqlite3 `?` placeholders).

HIGH     IDOR on /profile?id=
         id=2 returns another user's name+email with no ownership check.
         Fix → web-access-control-monitoring: enforce object-level authz + log denials.

MEDIUM   Reflected XSS on /search?q=
         q=<script>… reflected unencoded via render_template_string.
         Fix → web-xss-detection: use Jinja auto-escaping (render_template, not _string) + CSP.

MEDIUM   SSRF on /import?url=
         url=http://169.254.169.254/ reachable; OOB callback fired.
         Fix → web-ssrf-hardening: allow-list egress, block link-local/loopback.

LOW      Missing security headers / cookie flags
         No CSP, X-Content-Type-Options; session cookie lacks Secure/HttpOnly.
         Fix → web-security-headers.
```

**Per-screen risk:** `/profile` **HIGH** · `/import` **MEDIUM** · `/search` **MEDIUM**

**Detectability (Stage 4):** none of these currently produce a log line — the report
flags the *missing telemetry* as its own action item, pointing at the blue skills.

## Step 6 — Fix and re-run

The classic Flask fixes, straight from the paired blue skills:

```python
# SQLi + IDOR
row = db.execute("SELECT name, email FROM users WHERE id = ? AND owner = ?",
                 (uid, session["uid"])).fetchone()

# XSS — let Jinja escape
return render_template("search.html", q=q)   # not render_template_string(f"...{q}...")

# SSRF — resolve-then-pin + egress allow-list before fetching
```

Re-run `attack-my-application`; confirm each finding now reports **not
reproducible** and the blue skills show the activity would be caught.

---

Want the same flow on a different stack? See
[node-express.md](node-express.md) and [rails.md](rails.md).
