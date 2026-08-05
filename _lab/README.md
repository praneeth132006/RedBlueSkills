# Validation lab

Deliberately vulnerable targets used to **validate** skills before they are
marked `validated`. Each skill's `validation` block names the target it was
proven against.

> ⚠️ **These containers are intentionally insecure.** Run them only on an
> isolated host or private network. The compose file binds every port to
> `127.0.0.1` so nothing is exposed by default — keep it that way. Never point
> offensive skills at anything but these targets or systems you are authorized
> to test (see [`../ETHICS.md`](../ETHICS.md)).

## Targets

| Service | Image | URL (local) | Used by |
|---|---|---|---|
| OWASP Juice Shop | `bkimminich/juice-shop` | http://localhost:3000 | all v1 web-app skills |
| DVWA | `vulnerables/web-dvwa` | http://localhost:8080 | additional SQLi/XSS practice |
| Hardening proxy | `nginx` | http://localhost:8443 | `web-security-headers` |
| OWASP crAPI | `crapi/crapi-*` | http://localhost:8888 | all `api` skills |

## Usage

```bash
cd _lab
docker compose up -d juice-shop        # the default web-app validation target
docker compose --profile full up -d    # bring up every web-app target
docker compose down                    # tear down
```

### crAPI — the `api` vertical target

crAPI (Completely Ridiculous API) is a large multi-service stack, so it lives in
its own compose file under [`crapi/`](crapi/) (the official OWASP compose, vendored
so the lab is self-contained). It is the validation target for every `api/**`
skill. The web UI + API gateway is served on `http://localhost:8888`.

```bash
cd _lab/crapi
# core services only — skips the chatbot/chromadb services that need an LLM key
docker compose up -d --pull always \
  crapi-identity crapi-community crapi-workshop crapi-web \
  postgresdb mongodb mailhog api.mypremiumdealership.com
# crAPI emails an OTP/verification link to MailHog; read it at http://localhost:8888/mailhog
docker compose down -v                 # tear down (‑v also drops the seeded DBs)
```

crAPI needs ~4 CPU / 8 GB. On Apple Silicon without Docker Desktop, `colima start
--cpu 4 --memory 8 --disk 60` provides a daemon. First boot seeds demo users and
vehicles; give it 1–2 minutes after the containers report healthy.

Reproduce a skill's validation by following its `## Validation` section against
the URL above, then record the method/target/date/handle in the skill's
`validation` frontmatter.

## Adding a target

Add a service to `docker-compose.yml` (bind ports to `127.0.0.1`, pin the image
tag, and put non-default targets behind the `full` profile), then reference it by
name in the relevant skill's `validation.target`.

## Loot / engagement data

Anything a skill produces during validation goes in `_lab/loot/`, which is
gitignored. **Never commit captured data, credentials, or real target output.**
