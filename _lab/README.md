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

## Usage

```bash
cd _lab
docker compose up -d juice-shop        # the default validation target
docker compose --profile full up -d    # bring up everything
docker compose down                    # tear down
```

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
