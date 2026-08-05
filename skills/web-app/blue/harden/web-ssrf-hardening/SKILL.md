---
name: web-ssrf-hardening
description: >-
  Harden a web application against server-side request forgery by constraining
  and monitoring server-initiated outbound requests. Use when a feature fetches
  user-supplied URLs and you need to prevent access to internal services and
  cloud metadata, and to detect attempts.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1190]
  capec: [CAPEC-664]
  cwe: [CWE-918]
  owasp: ["A10:2021"]
  d3fend: [D3-OTF, D3-NTA]
pairs_with: [web-ssrf]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web SSRF hardening

## Overview

SSRF is best defended in depth: validate and pin destinations at the application,
constrain what the app tier can reach at the network, and monitor server-initiated
egress. This skill defines a control set that neutralizes the common SSRF impacts
— internal service access and cloud-metadata theft — and the telemetry to detect
attempts.

## Authorization & scope

These are defensive configuration changes to systems you operate. Roll out egress
restrictions carefully (they can break legitimate integrations) — stage, test,
and monitor. No offensive authorization is needed.

## Preconditions

- Knowledge of which features make server-side fetches and their legitimate
  destinations.
- Ability to change application code/config and, ideally, network egress policy.

## Procedure

1. **Allow-list destinations.** Where the set of legitimate targets is known,
   accept only those hosts/URLs; reject everything else. Prefer allow-list over
   deny-list.
2. **Resolve-then-pin.** Resolve the hostname once, validate the resulting IP is
   public and permitted, then connect to *that IP* (defeats DNS-rebinding and
   TOCTOU). Re-validate on redirects; cap or disable redirect following.
3. **Block internal ranges.** Deny loopback, link-local (`169.254.0.0/16`,
   including IMDS), RFC1918, and IPv6 equivalents at the fetch layer.
4. **Disable dangerous schemes.** Permit only `http`/`https`; reject `file`,
   `gopher`, `dict`, `ftp`, etc.
5. **Network egress control.** Put the app tier behind an egress proxy/firewall
   with a destination allow-list; require IMDSv2 (session tokens) or block metadata
   entirely from workloads that don't need it.
6. **Monitor.** Log every server-initiated request with destination; alert on
   attempts to reach loopback/link-local/private ranges or unusual schemes:
   ```
   index=egress src_tier=web
   | where cidrmatch("169.254.0.0/16", dst_ip) OR cidrmatch("127.0.0.0/8", dst_ip)
        OR cidrmatch("10.0.0.0/8", dst_ip) OR cidrmatch("172.16.0.0/12", dst_ip)
   | stats count by src_host, dst_ip, url
   ```
7. **Verify** by re-running the paired offense skill and confirming the probes are
   blocked and logged.

## Paired offense / defense

Pairs with **web-ssrf**. The offensive skill's OOB callback should still fire for
legitimate external URLs (that's expected), but its internal probes
(loopback/link-local/private) and non-http schemes must be blocked and alerted by
the controls above.

## Validation

Reproduce in `_lab/`:

1. Stand up the URL-fetch feature and apply the resolve-then-pin + internal-range
   block.
2. Run the paired `web-ssrf` probes and confirm `http://169.254.169.254/` and
   `http://127.0.0.1/` are rejected while a permitted external URL still works.
3. Confirm each blocked attempt is logged by the egress rule in step 6.

## References

- OWASP: SSRF Prevention Cheat Sheet; A10:2021
- MITRE D3FEND D3-OTF (Outbound Traffic Filtering)
- CWE-918 — Server-Side Request Forgery
- AWS: Use IMDSv2 to defend against SSRF
