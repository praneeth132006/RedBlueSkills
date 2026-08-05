# Example: assessing a Ruby on Rails app

Running `attack-my-application` against a Rails app **you own**. Rails gives you a
lot of defaults for free (CSRF tokens, escaped ERB), so the interesting findings
tend to be *authorization* and *file-handling* — exactly what this run surfaces.

> ⚠️ Only test apps you own or are authorized to test. See [`ETHICS.md`](../../ETHICS.md).

---

## The app under test

```ruby
# app/controllers/documents_controller.rb (illustrative)
class DocumentsController < ApplicationController
  # object id straight from params, no ownership scope → IDOR
  def show
    @doc = Document.find(params[:id])
    render json: @doc
  end

  # builds a file path from user input → path traversal candidate
  def download
    send_file Rails.root.join("storage", params[:name])
  end
end

# config: no lockout on Devise sign-in; sessions never expire
```

Run it on `http://localhost:3000`.

## Step 1 — Install

```bash
npx redblueskills init
```

## Step 2 — Instruction + gate

> **Attack my application at `http://localhost:3000`. It's my own Rails app, local,
> and I authorize testing it.**

Pass the four gate questions. Proceed.

## Step 3 — Surface map (Stage 1)

```
Server: Puma / Rails (X-Runtime, Set-Cookie _app_session)
Entry points:
  GET /documents/:id       → Document.find(params[:id])   (object id)
  GET /documents/download?name= → send_file with user path
  POST /users/sign_in       → Devise auth
Session: _app_session cookie, HttpOnly set, SameSite=Lax (Rails default) ✓
CSRF: authenticity_token present on forms (Rails default) ✓
```

Note the orchestrator **credits** the defaults it finds — CSRF tokens and escaped
output are already in place, so `web-csrf` and `web-reflected-xss` are noted as
*low-signal* rather than run hard.

## Step 4 — Technique selection (Stage 2)

| Surface | Selected (red) | Paired (blue) |
|---|---|---|
| `GET /documents/:id` | `web-idor` | `web-access-control-monitoring` |
| `GET /documents/download?name=` | `web-path-traversal` | `web-path-traversal-detection` |
| `POST /users/sign_in` | `web-broken-authentication` | `web-authentication-hardening` |
| all responses | `web-http-fingerprinting` | `web-security-headers` |
| **skipped/low** | `web-csrf`, `web-xss` (Rails defaults present), `web-sql-injection` (ActiveRecord params used), `web-ssrf`, `web-xxe` | preconditions not met / mitigated by framework |

## Step 5 — Findings

```
HIGH     IDOR on GET /documents/:id
         /documents/2 returns a document owned by another user; Document.find
         has no ownership scope.
         Fix → web-access-control-monitoring: scope to current_user
         (current_user.documents.find), log authorization denials.

HIGH     Path traversal on /documents/download?name=
         name=../../config/master.key escapes the storage dir via send_file.
         Fix → web-path-traversal-detection: validate against an allow-list,
         reject `..`, resolve + confirm the path stays under storage/.

MEDIUM   Broken authentication on /users/sign_in
         No lockout; unlimited attempts. Sessions don't expire.
         Fix → web-authentication-hardening: Devise :lockable, session timeout.

INFO     Fingerprinting
         X-Runtime / Server headers reveal Rails/Puma. Low impact.
         Fix → web-security-headers: strip identifying headers, add CSP/HSTS.
```

**Per-screen risk:** `/documents/download` **HIGH** · `/documents/:id` **HIGH** ·
`/users/sign_in` **MEDIUM**

## Step 6 — Fix and re-run

```ruby
# IDOR — scope to the current user
@doc = current_user.documents.find(params[:id])

# Path traversal — never trust params in a path
name = params[:name]
raise ActiveRecord::RecordNotFound unless ALLOWED_FILES.include?(name)
send_file Rails.root.join("storage", name)

# Auth — Devise lockable + timeoutable
devise :database_authenticatable, :lockable, :timeoutable
```

Re-run the orchestrator; both HIGH findings should now report **not reproducible**,
and `web-access-control-monitoring` / `web-path-traversal-detection` confirm the
attempts would be logged.

---

See also: [flask.md](flask.md) · [node-express.md](node-express.md).
