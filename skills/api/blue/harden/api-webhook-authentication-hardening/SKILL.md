---
name: api-webhook-authentication-hardening
description: Harden incoming webhooks with provider signature verification, signed freshness checks where supported, and durable idempotent processing.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  cwe:
  - CWE-345
pairs_with:
- api-webhook-authentication-assessment
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

# Api webhook authentication hardening

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

1. Use the provider SDK's verification API with the original request bytes and
   an endpoint-specific secret. Reject failures before parsing trusted event fields
   or invoking business logic; never substitute an IP allowlist for authentication.
2. Enforce the provider's signed timestamp policy where available. Keep clocks
   synchronized. GitHub body signatures do not provide a signed delivery timestamp.
3. Derive the deduplication key from an authenticated event identity, scoped by
   provider/account/endpoint as appropriate. Do not trust unsigned IDs blindly.
4. Persist acceptance and processing state atomically with a unique key. Couple
   business effects transactionally or use an outbox/idempotency key; a check-then-set
   cache and an early permanent processed flag can lose retries or duplicate effects.
5. Acknowledge accepted duplicates without repeating effects. Preserve retryability
   after failure, define retention from provider retry rules, and test concurrency
   and crash recovery against the actual datastore.
6. Test old/new keys during the documented rotation interval. Log reason codes and
   event references without payloads or secrets; monitor verification/retry failures.

## Paired defense / offense

Pair with **`api-webhook-authentication-assessment`**. Reuse the same positive and negative cases before and after
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
