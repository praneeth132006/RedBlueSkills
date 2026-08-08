---
name: cloud-logging-tamper
description: >-
  Demonstrate cloud audit-logging tampering during an authorized assessment — showing
  that an attacker with sufficient IAM can blind the account by stopping, deleting, or
  reconfiguring the audit trail (AWS CloudTrail, GCP Cloud Audit Logs, Azure Monitor):
  halting a trail, deleting the log bucket/sink, disabling log-file validation, or
  narrowing what is captured. Use to prove whether defenders would still see and be able
  to reconstruct activity after the logging control is attacked.
version: 1.0.0
team: red
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: defense-evasion
techniques:
  attack: [T1562.008, T1070]
  capec: [CAPEC-268]
  cwe: [CWE-778, CWE-223]
  owasp: []
  d3fend: []
pairs_with: [cloud-audit-logging-detection]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Cloud logging tamper

## Overview

Cloud detection depends on a single control plane of truth — the account's audit trail.
An attacker who reaches enough IAM will target that trail before doing damage:
**stopping or deleting** a CloudTrail/audit sink, **deleting or locking out** the log
destination bucket/log-analytics workspace, **disabling log-file integrity validation**,
**narrowing** the trail (dropping data events, one region, management-only), or routing
logs somewhere they can quietly drop them. This skill assesses, on an account you are
authorized to test, whether the audit trail can be tampered with and — more importantly
— whether that tampering would itself be detected and the account remain reconstructable.
The point is the blind-spot inventory, not destroying anyone's logs.

## Authorization & scope

**Run only against a cloud account you are authorized to test.** Prefer read-only
assessment of the trail's configuration and protections; any *active* stop/delete
demonstration must be done in a throwaway account you own, against a test trail, and be
reverted. Do **not** delete or disable production logging. Emit the finding as a
blind-spot inventory. Report weak trail protection promptly.

## Preconditions

- Read access to the audit-logging configuration in scope, and (for active
  demonstration) a throwaway account with a test trail you own.
- Knowledge of where the trail delivers and how it is protected (SCPs, bucket policy,
  object lock).

## Procedure

1. **Enumerate the audit trail.** Identify all trails/sinks, what each captures
   (management vs. data events, which regions, which services), and where they deliver:
   ```bash
   aws cloudtrail describe-trails
   aws cloudtrail get-trail-status --name <trail>
   aws cloudtrail get-event-selectors --trail-name <trail>   # data-event coverage?
   ```
2. **Assess protections.** Check whether the trail is org-managed (harder to disable
   from a member account), whether log-file validation is on, and whether the
   destination bucket has object-lock/immutability and a restrictive policy.
3. **Map who can tamper.** Determine which principals can `StopLogging`,
   `DeleteTrail`, `PutEventSelectors`, or delete/modify the destination bucket/sink —
   i.e. who could blind the account.
4. **Demonstrate tamper (own test account only).** In a throwaway account, show the
   effect: stop a test trail or narrow its selectors and confirm subsequent marker
   activity is no longer recorded — then restore it.
5. **Test whether tamper is detected.** Determine whether stopping/deleting/reconfiguring
   the trail itself generates an alert (it is a loggable event *until the moment it's
   disabled*), and whether a delivery gap would be noticed.
6. **Record** the blind spots (who can disable logging, missing immutability/validation,
   undetected stop/delete, coverage gaps) and the fix: org-level immutable trails,
   object-lock on the destination, least-privilege on logging APIs, and alerting on any
   change to the logging configuration.

## Paired defense / offense

Pairs with **cloud-audit-logging-detection**. Every tamper path and detection gap this
skill finds is what that skill closes — immutable, org-managed trails; least-privilege
on logging control APIs; and high-priority alerting on any attempt to stop, delete, or
reconfigure the audit trail.

## Validation

Reproduce in a throwaway account you own:

1. Create a test trail delivering to a bucket without object-lock and confirm marker
   activity is recorded.
2. Stop the trail (or narrow selectors) and confirm subsequent markers are not
   recorded, and whether the stop itself alerted.
3. Apply the paired detection (org-managed immutable trail, object-lock, alert on
   logging-config change) and confirm tampering is blocked or immediately alerted.

## References

- AWS CloudTrail (log-file validation, org trails, `StopLogging`) / GCP Cloud Audit Logs
  / Azure Monitor tamper-resistance docs; S3 Object Lock
- MITRE ATT&CK T1562.008 Disable or Modify Cloud Logs, T1070 Indicator Removal; MITRE
  D3FEND (see paired skill)
- CAPEC-268; CWE-778, CWE-223
