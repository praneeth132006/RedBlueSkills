---
name: api-inventory-monitoring
description: >-
  Detect and close Improper Inventory Management (API9:2023) for a REST or GraphQL
  API. Use when building an authoritative API inventory and reconciling live
  traffic against it to surface shadow endpoints, zombie hosts, and deprecated
  versions still receiving requests — and to catch access to undocumented or
  non-production surfaces.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1595.003, T1590.005]
  capec: [CAPEC-169]
  cwe: [CWE-1059, CWE-1002]
  owasp: ["A05:2021"]
  d3fend: [D3-NM, D3-ANAA]
pairs_with: [api-improper-inventory]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-crapi
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# API inventory monitoring

## Overview

You cannot protect an endpoint you don't know exists. This skill builds an
authoritative, machine-readable API inventory (host × version × route × auth
posture) and continuously reconciles it against what the gateway actually serves.
The reconciliation surfaces the three failure modes of API9: **shadow** endpoints
(served but not in the inventory/spec), **zombie** hosts and **deprecated**
versions (in the inventory but supposed to be retired, still receiving traffic),
and non-production environments reachable from the internet. It also alerts on the
reconnaissance pattern — version walking and undocumented-path probing — that
precedes exploitation of a forgotten surface.

## Authorization & scope

Passive analysis of gateway/DNS/certificate telemetry from infrastructure you
operate. Inventory data reveals internal topology and hostnames — treat as
sensitive. No scanning of third-party hosts.

## Preconditions

- The authoritative spec(s): OpenAPI/GraphQL definitions per version, plus the
  intended list of live hosts, versions, and environments.
- Gateway/access logs carrying host, route template, version, method, status, and
  auth outcome; ideally DNS records and certificate-transparency feeds for host
  discovery.
- A store/SIEM to hold the inventory and run the reconciliation.

## Procedure

1. **Build the authoritative inventory.** Parse each version's OpenAPI/GraphQL
   spec into a canonical `{host, version, route, methods, auth_required}` set;
   record the intended lifecycle state (active / deprecated / retired) per entry.
2. **Reconcile traffic → inventory (shadow).** From gateway logs, extract the set
   of `{host, version, route}` actually served and diff against the inventory.
   Any served route absent from the spec is a **shadow** endpoint — alert and
   route it to review.
   ```
   index=api | stats count by host, api_version, route
   | lookup api_inventory host api_version route OUTPUT status as inventory_status
   | where isnull(inventory_status)          /* served but not inventoried */
   ```
3. **Reconcile inventory → traffic (zombie/deprecated).** Flag inventory entries
   marked `retired`/`deprecated` that still receive requests — the copies that
   should be gone but aren't.
4. **Host discovery.** Ingest certificate-transparency and DNS data; alert on new
   or non-production hostnames (`staging`, `dev`, `internal`, `legacy`) that
   resolve publicly and answer API traffic.
5. **Auth-posture drift.** For each live version, track whether it enforces the
   current auth/rate-limit baseline; alert when a deprecated version serves with
   weaker controls than the active one.
6. **Recon detection.** Alert on a single source walking version prefixes
   (`/v1/`,`/v2/`,`/v3/` in sequence) or probing many undocumented paths — the
   footprint of the paired offensive skill.
7. **Drive remediation.** For each finding, decommission the zombie host, retire
   the deprecated version behind a sunset, or bring the shadow endpoint into the
   spec and the standard control baseline. Feed the corrected state back into the
   inventory.

## Detection engineering notes

- The reconciliation is only as good as the **spec ingestion** — automate spec
  parsing in CI so the inventory updates when the API does, or shadow detection
  drowns in false positives.
- Version-walk detection keys on **sequential prefix access from one source in a
  short window**; a browser hitting one version looks nothing like this.

## Paired offense / defense

Pairs with **api-improper-inventory**. Run that skill in the lab: its version
walking and undocumented-path probing should appear as recon alerts, and the
legacy version / staging host it finds should be the same entries this skill flags
as deprecated-still-live and publicly-reachable-non-prod.

## Validation

Reproduce against a lab exposing a current API plus a leftover `/api/v1/` and a
`staging.` host:

1. Ingest the current spec as the authoritative inventory; log gateway traffic to
   your SIEM.
2. Run the paired `api-improper-inventory` procedure.
3. Confirm reconciliation flags the deprecated version as still-live, the shadow
   endpoint as served-but-uninventoried, and the version-walk as a recon alert.

**Validated 2026-08-06 against OWASP crAPI.** Took the authoritative inventory as
the documented `v2` identity surface and the observed served set from the paired
`api-improper-inventory` version-walk, then ran the reconciliation
(`served − inventoried`). It flagged **`/identity/api/auth/v3/check-otp`** — served
(HTTP 500 on a real body, i.e. present) but absent from the inventory — as an
undocumented deprecated (v3) shadow endpoint, while the `v3` paths that returned
`404` were correctly *not* flagged. The served-but-uninventoried heuristic fired on
the real traffic.

## References

- OWASP API Security Top 10 — API9:2023 Improper Inventory Management
- OWASP: A05:2021 Security Misconfiguration; API lifecycle/sunset guidance
- MITRE ATT&CK T1595.003, T1590.005; D3FEND D3-NM (Network Mapping), D3-ANAA (Administrative Network Activity Analysis)
- CAPEC-169; CWE-1059, CWE-1002
