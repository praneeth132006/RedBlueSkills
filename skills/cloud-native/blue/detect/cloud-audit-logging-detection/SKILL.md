---
name: cloud-audit-logging-detection
description: >-
  Make the cloud audit trail tamper-resistant and detect attempts to blind it. Use when
  hardening AWS CloudTrail / GCP Cloud Audit Logs / Azure Monitor against defense
  evasion: org-managed immutable trails delivering to object-locked storage, log-file
  integrity validation, least-privilege on logging control APIs, full event coverage,
  and high-priority alerting on any attempt to stop, delete, or reconfigure logging.
version: 1.0.0
team: blue
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1562.008, T1070]
  capec: [CAPEC-268]
  cwe: [CWE-778, CWE-223]
  owasp: []
  d3fend: [D3-PM, D3-DAM]
pairs_with: [cloud-logging-tamper]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Cloud audit logging & tamper detection

## Overview

An audit trail only helps if an attacker can't quietly turn it off, so the goal is a
trail that is **hard to disable, impossible to silently alter, and loud when touched.**
This skill hardens cloud audit logging on four axes: **immutability** (org-managed
trails delivering to object-locked/immutable storage in a separate logging account, so
a compromised workload account can't delete the evidence), **integrity** (log-file
validation on, so tampering is detectable), **coverage** (management and data events
across all regions/services, no blind selectors), and **alerting + least privilege**
(tight IAM on the logging control APIs, plus a high-priority alert on any
`StopLogging`/`DeleteTrail`/selector change or delivery gap). It closes the tamper
paths the paired offense exercises.

## Authorization & scope

Defensive configuration of cloud logging you operate. Audit logs contain sensitive
account activity — store and access them under your data-handling and retention policy.
Passive collection and configuration; no active testing of third-party accounts.

## Preconditions

- Admin access to the organization's logging configuration and a dedicated,
  access-restricted logging destination.
- A SIEM/alerting pipeline consuming the trail.

## Procedure

1. **Use org-managed, immutable trails.** Configure an organization trail centrally so
   member accounts cannot disable it; deliver to a bucket/workspace in a separate,
   locked-down logging account.
2. **Protect the destination.** Enable object-lock/immutability and a restrictive
   resource policy on the log store so logs cannot be deleted or altered, even by a
   powerful principal in a workload account.
3. **Turn on integrity validation.** Enable CloudTrail log-file validation (or
   equivalent) so any tampering with delivered logs is detectable.
4. **Ensure full coverage.** Capture management and data events across all regions and
   the services that matter; periodically verify selectors haven't been narrowed.
5. **Least-privilege the logging APIs.** Restrict who can `StopLogging`, `DeleteTrail`,
   `PutEventSelectors`, or modify the log destination to a tiny set of break-glass
   identities; deny it via SCPs for everyone else.
6. **Alert on any logging change.** Raise a high-priority alert on stop/delete/
   reconfigure of a trail, changes to the log bucket policy/lock, and — critically — a
   **delivery gap** (the trail going silent), since a successful disable may not log
   itself.
7. **Rehearse.** Periodically run the paired tamper skill in a test account and confirm
   the immutability blocks it and the alerts fire.

## Detection engineering notes

- **Immutable, org-managed delivery to a separate account** is the load-bearing control
  — it removes the attacker's ability to delete evidence even after full account
  compromise, unlike an in-account trail they can reach.
- Alert on the **delivery gap**, not just the stop event: a disabled trail stops
  emitting the very event you'd key on, so "logs went quiet" is the reliable signal.

## Paired offense / defense

Pairs with **cloud-logging-tamper**. Run that skill against the hardened configuration:
its stop/delete/reconfigure attempts should be blocked by SCP/immutability or fire an
immediate alert, and a delivery gap should page — leaving the account reconstructable.

## Validation

Reproduce in a test account/org you own:

1. Confirm the paired skill can blind a naive in-account trail with no object-lock.
2. Move to an org-managed immutable trail delivering to an object-locked bucket in a
   logging account, least-privilege the logging APIs, and add stop/gap alerts.
3. Re-run the paired skill and confirm tampering is blocked or immediately alerted.

## References

- AWS CloudTrail (organization trails, log-file validation, S3 Object Lock, SCPs) / GCP
  Cloud Audit Logs / Azure Monitor immutability & alerting docs
- MITRE ATT&CK T1562.008, T1070; MITRE D3FEND D3-PM (Platform Monitoring), D3-DAM
  (Domain Account Monitoring)
- CAPEC-268; CWE-778, CWE-223
