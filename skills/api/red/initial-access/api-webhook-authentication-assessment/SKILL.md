---
name: api-webhook-authentication-assessment
description: Assess incoming webhook signature validation and duplicate-event handling using synthetic deliveries. Use for webhook receivers, not outbound callback SSRF.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  cwe:
  - CWE-345
pairs_with:
- api-webhook-authentication-hardening
risk:
  level: medium
  reversible: true
  data_touch: read-write
authorization: required
maturity: validated
validation:
  method: lab
  target: security-controls
  last_validated: '2026-09-19'
  validated_by: codex-local-validation
license: Apache-2.0
---

# Api webhook authentication assessment

## Overview

Separate authenticity, freshness, and duplicate processing. A valid signature alone
does not establish that an event has not already been handled.

## Authorization & scope

Use source review or synthetic deliveries in an authorized test environment with
side effects stubbed. Do not replay production payment, deployment, or account events.
Stop if a test reaches a real downstream action; record it without retrying.

## Preconditions

- Provider documentation, receiver middleware, and a dedicated test signing key.
- Observable test handler effects and the retry/deduplication storage design.
- A legitimate signed test delivery as the positive control.

## Procedure

1. Trace raw request bytes through middleware into signature verification. Confirm
   verification runs before business logic and uses the expected endpoint secret.
2. In the isolated receiver, compare a valid delivery with missing/wrong signatures
   and a changed body. Record handler effects, not merely HTTP status.
3. Where the provider signs a timestamp, check stale and future deliveries against
   its documented tolerance. Do not invent a signed-timestamp guarantee for GitHub.
4. Replay the same authenticated test event, then redeliver that event with a new
   valid timestamp/signature. Verify that processing happens once in both cases.
5. Review atomic deduplication, retry-after-failure, concurrent delivery, and crash
   recovery. A sequential in-memory check cannot prove these properties.
6. Record the minimal failing case and refer to the paired hardening skill. Redact
   signatures, secrets, and payload data from retained evidence.

## Paired defense / offense

Pair with **`api-webhook-authentication-hardening`**. Reuse the same positive and negative cases before and after
hardening. Mark unavailable controls blocked and missing evidence inconclusive.

## Validation

Run `python3 _lab/security-controls/validate.py WebhookControls` from the repository,
or `redblueskills lab security-controls` from the installed package (Python 3.10+).
Five offline tests exercise raw-body integrity, authenticated timestamps, tolerance
boundaries, malformed inputs, forgery, and repeat-event effects, with a vulnerable
control. The synthetic HMAC format and in-memory set are teaching fixtures, not
provider-compatible code. They do not validate SDK integration, persistence,
concurrency, retries after crashes, or a deployed receiver. No network calls occur.

## References

- [GitHub: validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Stripe: webhook signatures, duplicate events, and replay protection](https://docs.stripe.com/webhooks)
- [CWE-345: Insufficient Verification of Data Authenticity](https://cwe.mitre.org/data/definitions/345.html)
