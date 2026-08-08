---
name: mobile-backend-abuse-detection
description: >-
  Enforce and detect server-side the authorization and workflow rules a mobile
  client cannot be trusted to keep. Use when protecting the backend behind a mobile
  app: enforcing object- and function-level authorization on every request, never
  trusting client-supplied roles/prices/flags, validating workflow state and
  idempotency, and alerting on direct-API-replay patterns (id enumeration, privileged
  calls from low-privileged tokens, out-of-order or off-device flows). Pairs with the
  M3 mobile backend API-abuse offense.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1190]
  capec: [CAPEC-115]
  cwe: [CWE-602, CWE-639]
  owasp: []
  d3fend: [D3-IAA, D3-UBA]
pairs_with: [mobile-backend-api-abuse]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile backend abuse detection

## Overview

The client is not a trust boundary, so the backend behind a mobile app must enforce
every security decision itself and watch for the traffic that only appears when
someone bypasses the app. This skill has two halves: **enforce** — object- and
function-level authorization on every request, server-side re-derivation of any value
the client shouldn't own (role, price, entitlement, verification), and validated
workflow state so steps can't be skipped or replayed — and **detect** — alerting on
the request patterns that reveal direct API replay: id enumeration, privileged
endpoints hit by low-privileged tokens, and sequences no legitimate app UI would
produce. It closes the loop on the paired mobile offense and shares its logic with
the `api` surface's BOLA/BFLA monitoring.

## Authorization & scope

Defensive enforcement and monitoring of a backend your team operates. Request logs
and API telemetry may contain user identifiers and object ids — handle under your
normal data-handling and retention policy. No active testing of third-party systems.

## Preconditions

- Access to the backend authorization code and to API access logs / telemetry with
  per-request identity, object id, endpoint, and outcome.
- A model of legitimate access (which subject may touch which objects; which roles
  may call which functions) and of the expected workflow sequences.
- A place to run detections and route alerts.

## Procedure

1. **Enforce object-level authorization (fix BOLA).** On every request that
   references an object, verify the authenticated subject owns/may access *that*
   object server-side — never infer it from the fact that the app displayed it.
2. **Enforce function-level authorization (fix BFLA).** Check the caller's role/scope
   on every privileged endpoint and method; default-deny, and don't rely on the app
   hiding a button.
3. **Re-derive client-supplied trust values.** Ignore client-sent `role`,
   `isPremium`, `price`, `discount`, `verified`, `deviceTrusted` and compute them
   server-side from authoritative state. Treat their presence in a mutation as
   untrusted input.
4. **Validate workflow state and idempotency.** Enforce required step order and
   one-time semantics on the server (payment before fulfillment, single-use tokens,
   idempotency keys) so a client can't skip, reorder, or replay steps.
5. **Detect id enumeration / BOLA probing.** Alert when a token accesses a rising
   spread of object ids it doesn't own or generates a burst of authorization
   failures across ids — the signature of an id-swap sweep.
6. **Detect privilege and sequence anomalies.** Alert when a low-privileged token
   calls admin/privileged endpoints, when requests arrive in an order or at a cadence
   no legitimate UI produces, or when a flow completes without its prerequisite
   steps.
7. **Continuously verify.** Run the paired offense's replays as an automated test and
   assert the backend returns 403 and the detections fire, so an authorization
   regression is caught before release.

## Detection engineering notes

- The highest-value signal is **authorization failures concentrated by token across
  many object ids** — that pattern is direct-API BOLA probing, not normal app use,
  which touches only the user's own objects.
- Enforcement is primary and detection is the backstop: server-side authz makes the
  bypass fail, and the alerts tell you someone is trying. This is the same logic as
  `api-bola-detection` / `api-function-authorization-monitoring` on the `api` surface.

## Paired offense / defense

Pairs with **mobile-backend-api-abuse**. Run that skill against a monitored backend:
the id swaps return 403 and trip the enumeration alert, the hidden privileged call is
denied and flagged, forged trust fields are ignored, and the skipped-step flow is
rejected by workflow validation — while the app's normal traffic stays clean.

## Validation

Reproduce against a backend you own:

1. Start from the demo backend with client-only authorization; confirm the paired
   skill replays across users and hits hidden endpoints.
2. Add server-side object/function authorization, trust-value re-derivation, and
   workflow/idempotency checks, plus the enumeration and privilege-anomaly
   detections.
3. Re-run the paired skill and confirm the replays are denied (403) and the alerts
   fire, while legitimate app requests succeed.

_Not yet lab-validated end-to-end (no shipped mobile lab target); the server-side
BOLA/BFLA enforcement and detections are validated on the `api` surface (crAPI).
Authored and reviewed against OWASP MASVS-AUTH and OWASP API Top 10._

## References

- OWASP Mobile Top 10 M3 Insecure Authentication/Authorization; OWASP MASVS-AUTH
- OWASP API Security Top 10: API1 BOLA, API5 BFLA (shared server-side controls & detections)
- MITRE D3FEND D3-IAA (Identifier Activity Analysis), D3-UBA (User Behavior Analysis)
- MITRE ATT&CK T1190; CAPEC-115; CWE-602, CWE-639
