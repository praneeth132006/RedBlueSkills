# Example: assessing a Node.js / Express app

Running `attack-my-application` against an Express app that serves both a JSON API
and a couple of server-rendered views — **on your own machine**. Same one
instruction, different stack.

> ⚠️ Target only apps you own or are authorized to test. See [`ETHICS.md`](../../ETHICS.md).

---

## The app under test

```js
// server.js (illustrative)
const express = require("express");
const db = require("./db"); // some SQL client
const app = express();
app.use(express.urlencoded({ extended: true }));

// login posts credentials; no CSRF token, no rate limit
app.post("/login", (req, res) => { /* sets a session cookie */ });

// search interpolates user input into SQL
app.get("/api/products", (req, res) => {
  const q = req.query.q;
  db.query(`SELECT * FROM products WHERE name LIKE '%${q}%'`, (e, rows) => res.json(rows));
});

// transfers money on POST with just a session cookie → CSRF candidate
app.post("/account/transfer", (req, res) => { /* moves funds */ });

app.listen(3000);
```

Run it on `http://localhost:3000`.

## Step 1 — Install

```bash
npx redblueskills init
```

## Step 2 — Instruction + gate

> **Attack my application at `http://localhost:3000`. It's my own Express app,
> local, and I authorize testing.**

Confirm the four gate questions. Proceed.

## Step 3 — Surface map (Stage 1)

```
Server: Express (X-Powered-By: Express — itself a fingerprinting leak)
Entry points:
  /api/products?q=      → interpolated into SQL
  /login (POST)          → auth flow, no CSRF token seen
  /account/transfer (POST) → state-changing, cookie-authenticated
Session: cookie `connect.sid`, SameSite not set
```

## Step 4 — Technique selection (Stage 2)

| Surface | Selected (red) | Paired (blue) |
|---|---|---|
| `/api/products?q=` | `web-sql-injection` | `web-sqli-detection` |
| `/login` | `web-broken-authentication` | `web-authentication-hardening` |
| `/account/transfer` | `web-csrf` | `web-csrf-hardening` |
| all responses | `web-http-fingerprinting` | `web-security-headers` |
| **skipped** | `web-ssrf`, `web-xxe`, `web-path-traversal`, `web-command-injection` | no URL-fetch / XML / file-path / shell sink observed |

## Step 5 — Findings

```
HIGH     SQL injection on /api/products?q=
         q=%' UNION SELECT ...--  alters the query; input concatenated into SQL.
         Fix → web-sqli-detection: parameterized queries / prepared statements.

MEDIUM   CSRF on /account/transfer
         State-changing POST accepts a cross-site form with only the session cookie.
         Fix → web-csrf-hardening: per-request CSRF token + SameSite=Lax/Strict cookie.

MEDIUM   Broken authentication on /login
         No lockout or throttling; 100 attempts accepted without friction.
         Fix → web-authentication-hardening: rate-limit, lockout, generic errors.

LOW      Fingerprinting / missing headers
         X-Powered-By leaks Express; no CSP / HSTS / X-Content-Type-Options.
         Fix → web-security-headers: helmet() with a tuned policy.
```

**Per-screen risk:** `/api/products` **HIGH** · `/account/transfer` **MEDIUM** ·
`/login` **MEDIUM**

## Step 6 — Fix and re-run

```js
// SQLi — parameterize
db.query("SELECT * FROM products WHERE name LIKE ?", [`%${q}%`], cb);

// CSRF — token + SameSite
app.use(require("csurf")());
// cookie: { sameSite: "lax", secure: true, httpOnly: true }

// Headers — helmet
app.use(require("helmet")());

// Auth — express-rate-limit on /login
```

Re-run the orchestrator to confirm each finding is now **not reproducible** and the
paired blue skills would see the activity.

---

See also: [flask.md](flask.md) · [rails.md](rails.md).
