---
name: api-ssrf
description: >-
  Find and prove Server-Side Request Forgery (SSRF / API7:2023) in a REST or
  GraphQL API during an authorized assessment. Use when the API fetches a
  client-supplied URL, hostname, or resource reference — webhooks, url/image/
  callback parameters, document importers, link previews, PDF renderers — and you
  need to confirm the server can be coerced into requesting attacker-chosen
  internal or cloud-metadata endpoints.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1190]
  capec: [CAPEC-664]
  cwe: [CWE-918]
  owasp: ["A10:2021"]
  d3fend: []
pairs_with: [api-ssrf-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-crapi
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# API Server-Side Request Forgery (SSRF)

## Overview

APIs are unusually rich in SSRF sinks because so much of their job is fetching
things on a client's behalf: webhook registrations, `url`/`image_url`/`callback`
fields, document and avatar importers, link-preview and PDF/HTML renderers, and
GraphQL resolvers that dereference remote ids. When the server issues that request
without validating the destination, a caller can redirect it inward — at cloud
providers most damagingly to the instance metadata service (IMDS), and elsewhere
to internal admin panels, databases, and `localhost`-only endpoints. This skill
confirms the sink, proves the server (not the client) makes the request, and
demonstrates minimal internal reach without exfiltrating secrets.

## Authorization & scope

**Run only against APIs you are explicitly authorized to test**, using accounts
provisioned for the engagement. Prove SSRF with a **callback to a collaborator
host you control** and, at most, a single benign internal read (e.g. an
unauthenticated internal health page). **Do not read or exfiltrate cloud
credentials** from IMDS — demonstrating that the metadata root is reachable
(a `200` from `/latest/meta-data/`) is sufficient proof; harvesting live keys
is destructive and out of scope unless the rules of engagement explicitly permit
it. Never pivot from an SSRF into other internal systems without written
authorization for those systems.

## Preconditions

- One or more endpoints that accept a URL, hostname, IP, or resource reference the
  server subsequently fetches.
- An out-of-band collaborator/canary host you control (Burp Collaborator,
  `interactsh`, or a logging endpoint) to observe server-originated requests.
- Knowledge of the target's hosting (cloud provider dictates the IMDS address and
  format) so proof is precise and minimal.

## Procedure

1. **Enumerate fetch sinks.** From the OpenAPI/GraphQL schema and traffic, list
   every field whose value the server dereferences: webhook `url`, `image_url`,
   `avatar`, `callback_url`, `source`/`import_from`, SSML/`xmlns` includes,
   GraphQL remote-id resolvers.
2. **Prove server origin.** Point the sink at your collaborator host and confirm
   the inbound request comes from the **server's** egress IP, not yours:
   ```bash
   curl -s -X POST "https://TARGET/api/v1/webhooks" \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"url":"https://<canary>.oast.site/ssrf-proof"}'
   # then check the collaborator log for a hit from the API's egress IP
   ```
3. **Reach internal scope.** Swap the destination for loopback / link-local /
   private ranges and note which return content or differ in timing/status:
   `http://127.0.0.1:PORT/`, `http://169.254.169.254/`, `http://[::1]/`,
   `http://internal-host.svc.cluster.local/`.
4. **Cloud metadata (proof only).** Request the IMDS **root** for the provider and
   stop at reachability:
   ```
   AWS:   http://169.254.169.254/latest/meta-data/
   GCP:   http://metadata.google.internal/computeMetadata/v1/   (needs Metadata-Flavor: Google)
   Azure: http://169.254.169.254/metadata/instance?api-version=2021-02-01  (needs Metadata: true)
   ```
   A `200` from the metadata **index** proves exploitable SSRF. Do **not** walk to
   the credentials path.
5. **Defeat weak filters (only to characterize the flaw).** If naive blocklists
   are present, note which bypasses work — decimal/octal/hex IP encodings,
   `[::ffff:169.254.169.254]`, DNS names that resolve to link-local, and
   open-redirect chaining — so the fix can be specified correctly.
6. **Protocol smuggling.** Where the client library follows non-HTTP schemes,
   test whether `file://`, `gopher://`, or `dict://` are reachable — these turn
   SSRF into local file read or raw TCP to internal services.
7. **Record** the sink, the exact request that crossed the trust boundary, the
   internal reach achieved, filter bypasses observed, and the fix: allowlist
   destinations, resolve-then-pin the IP, block link-local/loopback/private
   ranges post-resolution, and require IMDSv2.

## Paired defense / offense

Pairs with **api-ssrf-hardening**. The traffic you generate — the API's egress
making requests to link-local/loopback addresses, IMDS hits, and outbound
connections to a novel external host from a webhook field — is exactly the egress
and destination-validation signal that skill instruments and blocks.

## Validation

Reproduce against a lab API with a URL-fetching endpoint (**OWASP crAPI**'s
mechanic/webhook flow, or a purpose-built webhook/link-preview service) plus a
mock metadata endpoint on `169.254.169.254`:

1. Stand up the target and an out-of-band collaborator host.
2. Register a webhook / submit an import URL pointing at the collaborator; confirm
   the inbound request originates from the server.
3. Repoint at `http://169.254.169.254/latest/meta-data/` (or the mock) and confirm
   the server returns / times out distinctly on the metadata root — SSRF proven —
   without reading any credentials path.

**Validated 2026-08-06 against OWASP crAPI.** Authenticated as a normal user and
called `POST /workshop/api/merchant/contact_mechanic` with
`mechanic_api` set to `http://crapi-identity:8080/identity/api/v2/user/dashboard`
— an **internal-only** service the client has no route to. The workshop service
made the request server-side and returned the internal service's JSON body verbatim
in `response_from_mechanic_api` (HTTP 200), while the same field pointed at a bogus
internal host returned `"Could not connect to mechanic api."` (HTTP 400) — proving
the server, not the client, performs the fetch and reaches internal scope.

## References

- OWASP API Security Top 10 — API7:2023 Server Side Request Forgery
- OWASP: A10:2021 Server-Side Request Forgery (SSRF)
- OWASP SSRF Prevention Cheat Sheet
- MITRE ATT&CK T1190; CAPEC-664; CWE-918
- Cloud IMDS hardening: AWS IMDSv2, GCP metadata `Metadata-Flavor`, Azure IMDS header
