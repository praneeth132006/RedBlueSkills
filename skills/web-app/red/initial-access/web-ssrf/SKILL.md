---
name: web-ssrf
description: >-
  Confirm and characterize server-side request forgery in a web application
  during an authorized assessment. Use when the server fetches a user-supplied
  URL or host (webhooks, importers, image/URL preview, PDF render) and you need
  to prove the server can be coerced into making requests to unintended targets.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1190]
  capec: [CAPEC-664]
  cwe: [CWE-918]
  owasp: ["A10:2021"]
  d3fend: []
pairs_with: [web-ssrf-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web server-side request forgery (SSRF)

## Overview

SSRF lets an attacker make the server issue HTTP (or other-protocol) requests to
targets of the attacker's choosing — internal services, cloud metadata endpoints,
or arbitrary hosts. This skill confirms SSRF with an out-of-band callback, then
characterizes reach (internal ranges, allowed schemes, redirect following) using
non-destructive probes, stopping short of harvesting real cloud credentials.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Confirm the
target and any internal ranges you probe are in written scope. Use an OOB
listener you control for confirmation. **Do not** read live cloud-credential
endpoints (e.g. IMDS credential paths) beyond proving reachability — reaching the
metadata root or a non-secret field is sufficient proof; harvesting keys is a
separate, higher-authorization action.

## Preconditions

- A feature where the server fetches a URL/host you supply: webhook config, "import
  from URL", link unfurl/preview, avatar-by-URL, XML/SVG with external refs, PDF
  generation from HTML.
- An OOB listener (interactsh / Burp Collaborator / a DNS+HTTP log you own).

## Procedure

1. **Baseline.** Provide a legitimate external URL you control and confirm the
   server fetches it (an HTTP hit on your listener). This alone proves SSRF.
   ```bash
   # set your callback to a token you can correlate
   # then submit it to the feature under test
   curl -s -X POST https://TARGET/api/import -d 'url=https://rbsk-$RANDOM.oob.YOURHOST/'
   ```
2. **Confirm blind vs full-response.** Note whether the response body reflects the
   fetched content (full-response SSRF) or only side effects fire (blind).
3. **Test internal reachability** with safe internal targets in scope:
   ```bash
   # loopback / link-local / private ranges — look for banners or timing deltas
   url=http://127.0.0.1:80/         # loopback services
   url=http://169.254.169.254/      # cloud metadata root (reachability only)
   url=http://[::1]/                # IPv6 loopback
   ```
4. **Probe filter bypasses** where a naive allow/deny list is present: alternate
   IP encodings (`http://2130706433/`), DNS names resolving to internal IPs,
   `http://` vs `https://`, and redirect-based bypass (an allowed host that 302s
   to an internal target).
5. **Enumerate schemes** the fetcher accepts (`file://`, `gopher://`, `dict://`)
   — presence greatly increases impact; note them without exploiting.
6. **Prove impact minimally.** One OOB hit + one internal-reachability signal is
   enough. Do not exfiltrate credentials or pivot.
7. **Record** the parameter, working payload, reachable internal targets, accepted
   schemes/bypasses, and remediation (allow-list egress, resolve-then-pin to a
   vetted IP, block link-local/loopback, disable unused schemes, no redirects).

## Paired defense / offense

Pairs with **web-ssrf-hardening**. Outbound requests from the app tier to
loopback/link-local/private ranges, DNS lookups for attacker domains, and fetches
of odd schemes are the detection and prevention surface. When validating together,
confirm egress controls block the internal probes and that attempts are logged.

## Validation

Reproduce in `_lab/`:

1. Bring up a target with a URL-fetch feature (`docker compose up -d`).
2. Submit a callback URL to your OOB listener and confirm the inbound hit,
   proving the server made the request.
3. From the same feature, request `http://127.0.0.1:<lab-internal-port>/` and
   confirm the internal service responds or times out differently than an
   unroutable address — demonstrating internal reach.

## References

- OWASP: Server Side Request Forgery Prevention Cheat Sheet; A10:2021
- MITRE ATT&CK T1190 — Exploit Public-Facing Application
- CWE-918 — Server-Side Request Forgery
- PortSwigger Web Security Academy — SSRF
