---
name: ci-logging-evasion
description: >-
  Demonstrate Insufficient Logging & Visibility (CICD-SEC-10) during an authorized
  assessment — showing that malicious activity in the CI/CD ecosystem leaves no
  usable trail: actions with no audit record, logs that omit the who/what/where,
  build output an attacker can suppress or overwrite, and no alerting on
  security-relevant events. Use to prove that a defender could not detect or
  reconstruct a pipeline compromise from the available logs.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: defense-evasion
techniques:
  attack: [T1562.008, T1070]
  capec: [CAPEC-268]
  cwe: [CWE-778, CWE-223]
  owasp: ["A09:2021"]
  d3fend: []
pairs_with: [ci-audit-logging-detection]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: ci-local
  last_validated: 2026-08-09
  validated_by: praneeth132006
license: Apache-2.0
---

# CI/CD logging evasion

## Overview

Detection and incident response depend on the CI/CD ecosystem recording *who did
what, where, and when* — and alerting when it matters. **Insufficient logging &
visibility** is the gap that lets an attacker operate unseen: security-relevant
actions (secret access, config changes, integration installs, deploys) that emit no
audit event; build logs that don't capture the commands, identity, or network
destinations of a step; logs an in-pipeline attacker can suppress, truncate, or
overwrite; short/no retention; and no alerting so even recorded events are never
reviewed. This skill assesses, on a pipeline you are authorized to test, how much of
a simulated benign "attack" (a marker step) is reconstructable from the logs — and
demonstrates the blind spots, without disabling anyone's real logging.

## Authorization & scope

**Run only against a pipeline you are authorized to test.** Assess visibility with
benign marker activity and by *reading* what the logs captured; do **not** delete or
tamper with production logs, disable a real logging pipeline, or destroy audit
records. Any log-suppression demonstration must be on a throwaway pipeline you own.
The deliverable is the list of blind spots, not erased evidence.

## Preconditions

- A pipeline in scope you can run a benign marker step in, and read access to the
  audit logs, build logs, and any SIEM the environment feeds.
- A throwaway pipeline you own for any active log-suppression demonstration.

## Procedure

1. **Enumerate what is logged.** Inventory the available logs: SCM/CI audit log,
   build/job logs, registry and deploy logs, cloud audit trail. Note what each does
   and does not capture (identity, source ref, commands, network egress, secret
   access).
2. **Run a benign marker sequence.** In a throwaway/in-scope pipeline, perform actions
   that mimic an attack path — access a (dummy) secret, change a pipeline setting,
   trigger a deploy — each tagged with a canary marker.
3. **Attempt reconstruction.** From the logs alone, try to answer: which identity
   ran it, from what ref, what commands executed, what secrets were touched, what
   network destinations were contacted. Record every question the logs can't answer.
4. **Test log integrity/suppression (own lab only).** On a pipeline you own, show
   whether an in-job step can suppress or overwrite its own build output, or whether
   audit events are missing for the sensitive actions above.
5. **Test alerting.** Determine whether any of the security-relevant marker events
   generated an alert or was merely recorded (or not recorded at all).
6. **Record** the blind spots (unlogged action classes, missing fields, suppressible/
   short-retention logs, absent alerting) and the fix: audit-log the security-relevant
   events with full context, ship logs off the runner to tamper-resistant storage,
   set retention, and alert on the high-value events.

## Paired defense / offense

Pairs with **ci-audit-logging-detection**. Each unanswered reconstruction question
and missing alert this skill finds is what that skill fills — comprehensive,
tamper-resistant CI/CD audit logging with alerting on the security-relevant events.

## Validation

**Validated `2026-08-09` against the `ci-local` lab** (`_lab/ci-local/`, run
`bash _lab/ci-local/validate.sh`). Observed: when the job log was an in-workspace
file the step could reach, a malicious step emitted a marker and then wiped the log —
the marker was gone from the record (`RESULT vuln logging ATTACK_SUCCEEDED
marker-erased-from-job-log`). When the runner streamed step output to an out-of-band
append-only audit sink the step had no handle to, the marker survived the same wipe
(`RESULT hardened logging ATTACK_BLOCKED marker-preserved-in-oob-audit-sink`).

Reproduce in a lab you own:

1. Stand up a pipeline with default logging and run a marker "attack" sequence
   (secret access, config change, deploy).
2. Attempt to reconstruct who/what/where from the logs and record the blind spots;
   show whether a step can suppress its own output.
3. Apply the paired detection (ship audit + build logs off-runner, add fields, add
   alerts) and confirm the same marker sequence is now fully reconstructable and
   alerted.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-10 Insufficient Logging and Visibility
- OWASP: A09:2021 Security Logging and Monitoring Failures
- GitHub/GitLab audit-log docs; cloud audit trail (CloudTrail/Cloud Audit Logs);
  centralized log shipping and retention
- MITRE ATT&CK T1562.008 Disable/Modify Cloud Logs, T1070 Indicator Removal;
  CAPEC-268; CWE-778, CWE-223
