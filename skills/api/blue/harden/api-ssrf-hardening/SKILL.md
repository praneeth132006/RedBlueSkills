---
name: api-ssrf-hardening
description: >-
  Harden a REST or GraphQL API against Server-Side Request Forgery (SSRF /
  API7:2023) and detect exploitation attempts. Use when the API fetches
  client-supplied URLs (webhooks, importers, link previews, image/URL fields) and
  you need to constrain outbound destinations, enforce IMDSv2, and alert on
  egress to internal or metadata addresses.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1190]
  capec: [CAPEC-664]
  cwe: [CWE-918]
  owasp: ["A10:2021"]
  d3fend: [D3-OTF, D3-NTF]
pairs_with: [api-ssrf]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# API SSRF hardening

## Overview

SSRF defenses fail when they validate the URL *string* instead of the destination
the server actually connects to — DNS rebinding, redirects, and IP encodings slip
past every blocklist. This skill hardens API URL-fetching features with a
defense-in-depth stack: an explicit destination allowlist, resolve-then-pin so the
socket connects to the same vetted IP that was validated, rejection of
loopback/link-local/private ranges *after* resolution, disabled redirect
following, non-HTTP scheme blocking, and — at the platform — mandatory IMDSv2 plus
egress firewalling. It also specifies the egress telemetry that catches attempts.

## Authorization & scope

Defensive configuration and monitoring of APIs you operate. Egress logs and
outbound-connection telemetry can reveal internal topology — handle under your
normal data-handling policy. No active testing of third-party endpoints.

## Preconditions

- The set of URL-fetching endpoints and the legitimate destinations each needs
  (most webhook/importer features have a small, knowable allowlist of hosts or
  domains).
- Ability to change the HTTP client configuration, add an egress proxy/firewall,
  and set instance-metadata options.

## Procedure

1. **Allowlist destinations.** Prefer an explicit allowlist of schemes (`https`
   only), ports (443), and hosts/domains over any blocklist. For open-ended
   features (arbitrary user webhooks), require pre-registration and verification
   of the destination.
2. **Resolve then pin.** Resolve the hostname once, validate every resolved IP,
   then connect the socket to **that IP** (pin it) so a second, attacker-timed DNS
   answer cannot swap in a link-local address (DNS rebinding). Re-validate on
   every redirect, or disable redirect following entirely.
3. **Reject internal ranges post-resolution.** After DNS resolution, deny
   loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`, `fe80::/10`,
   incl. `169.254.169.254`), private RFC1918/ULA ranges, and cloud metadata
   hostnames — matching on the *resolved IP*, not the string.
4. **Constrain the client.** Disable non-HTTP schemes (`file`, `gopher`, `dict`,
   `ftp`), set aggressive connect/read timeouts and response-size caps, and strip
   the ability to follow redirects to unvetted hosts.
5. **Enforce IMDSv2 / metadata protection.** On AWS require IMDSv2
   (`HttpTokens: required`, hop limit 1); on GCP/Azure the metadata endpoint
   already requires a custom header — ensure the fetch client never forwards
   arbitrary request headers to internal destinations.
6. **Firewall egress.** Put URL-fetching workloads behind an egress proxy or
   network policy that only permits the allowlisted destinations; block
   link-local and RFC1918 at the network layer as a backstop to code checks.
7. **Instrument and alert.** Emit an event per outbound fetch (source endpoint,
   requested host, resolved IP, result). Alert on any egress to link-local/
   loopback/private ranges, IMDS addresses, or a first-seen external host from a
   fetch feature.

## Detection engineering notes

- The highest-fidelity alert is **egress to `169.254.169.254` / metadata
  hostnames** from an application workload — it is almost never legitimate.
- Log the **resolved IP**, not just the requested URL; string-level logs miss
  rebinding and encoded-IP attacks entirely.
- Baseline each fetch feature's normal destination set; a webhook feature suddenly
  resolving to loopback or a new internal subnet is the SSRF signal.

## Paired offense / defense

Pairs with **api-ssrf**. Run that skill in the lab: its collaborator callback,
internal-range requests, and metadata-root probe should be blocked by the
resolve-then-pin allowlist and surface in egress telemetry as denied outbound
connections to link-local/metadata addresses.

## Validation

Reproduce against a lab API with a URL-fetching endpoint plus a mock
`169.254.169.254`:

1. Deploy the endpoint with the allowlist + resolve-then-pin + internal-range
   deny controls enabled.
2. Run the paired `api-ssrf` procedure: confirm the collaborator callback to an
   unlisted host is refused, the internal/loopback and metadata-root requests are
   blocked, and each attempt appears in egress telemetry.
3. Confirm a legitimate allowlisted destination still succeeds (no false-positive
   breakage of the feature).

**Status: reviewed (2026-08-06).** The paired offensive skill `api-ssrf` is
`validated` against OWASP crAPI (the workshop `contact_mechanic` sink reaches an
internal-only service). These controls prevent that exploit, but crAPI ships no
hardened build to prove the fix end-to-end, so this skill stays `reviewed` until
validated against an app instrumented with the resolve-then-pin allowlist; the
control design is verified against the live vulnerability.

## References

- OWASP API Security Top 10 — API7:2023 Server Side Request Forgery
- OWASP SSRF Prevention Cheat Sheet; A10:2021 SSRF
- MITRE ATT&CK T1190; D3FEND D3-OTF (Outbound Traffic Filtering), D3-NTF (Network Traffic Filtering)
- CAPEC-664; CWE-918
- AWS IMDSv2, GCP/Azure metadata header requirements
