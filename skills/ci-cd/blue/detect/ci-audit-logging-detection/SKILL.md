---
name: ci-audit-logging-detection
description: >-
  Close Insufficient Logging & Visibility (CICD-SEC-10) with comprehensive,
  tamper-resistant CI/CD audit logging and alerting. Use when instrumenting the
  pipeline ecosystem so security-relevant events (secret access, config/integration
  changes, deploys, identity use) are recorded with full context, shipped off the
  runner to tamper-resistant storage with retention, and alerted on — so a compromise
  is detectable and reconstructable.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1562.008, T1070]
  capec: [CAPEC-268]
  cwe: [CWE-778, CWE-223]
  owasp: ["A09:2021"]
  d3fend: [D3-PM, D3-UBA]
pairs_with: [ci-logging-evasion]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: ci-local
  last_validated: 2026-08-09
  validated_by: praneeth132006
license: Apache-2.0
---

# CI/CD audit logging & detection

## Overview

Visibility is what turns a pipeline compromise from an invisible event into a
detectable, reconstructable one. This skill instruments the CI/CD ecosystem so every
security-relevant action is captured and actionable on four axes: **coverage** (audit
events for secret access, pipeline/config and protection-rule changes, integration
installs, identity use, and deploys — plus build logs that capture identity, source
ref, commands, and network egress), **context** (each event carries who/what/where/
when), **integrity** (logs are shipped off the runner to append-only, tamper-resistant
storage with defined retention, so an in-pipeline attacker cannot erase them), and
**alerting** (the high-value events page a human rather than sit unread). It fills the
blind spots CICD-SEC-10 evasion depends on.

## Authorization & scope

Defensive instrumentation of CI/CD you operate. Logs may contain secret references,
source, and internal topology — store and access them under your data-handling and
retention policy. Passive collection and analysis; no active testing of third-party
systems.

## Preconditions

- Access to the audit-log and log-forwarding configuration of the SCM, CI platform,
  registry, and cloud, and a log store / SIEM to ship to.
- A list of the security-relevant event classes to cover and who owns response.

## Procedure

1. **Enable and centralize audit logs.** Turn on audit logging in SCM, CI, registry,
   and cloud, and forward all of it to a central, append-only store/SIEM with defined
   retention — off the runners that generate it.
2. **Cover the security-relevant events.** Ensure these are logged with full context:
   secret/credential access, pipeline-definition and protection-rule changes,
   integration/OAuth-app installs and scope changes, runner registration, identity/
   role assumption, and deploys to protected environments.
3. **Enrich build logs.** Capture per-job identity, triggering ref/actor, executed
   commands, and outbound network destinations so a build's behavior is
   reconstructable.
4. **Make logs tamper-resistant.** Stream logs out in near-real-time so a compromised
   job cannot suppress or overwrite the record after the fact; protect the log store
   with least-privilege write/append-only access.
5. **Alert on high-value events.** Page on: secret access on an untrusted trigger,
   protection-rule/pipeline changes outside a reviewed merge, new integration installs
   or scope escalations, new runner registrations, deploys not originating from a
   reviewed merge, and disabling/gaps in the logging itself.
6. **Set retention and review.** Retain logs long enough for investigation and
   periodically confirm the pipeline is still emitting the expected events (detect the
   silent gap).
7. **Rehearse reconstruction.** Periodically run the paired evasion skill's marker
   sequence and confirm the logs answer who/what/where and that the alerts fire.

## Detection engineering notes

- **Shipping logs off the runner in real time** is the load-bearing integrity control
  — it defeats after-the-fact suppression, which is the whole point of the paired
  evasion skill.
- The most valuable single alert is **"security-relevant change outside the reviewed
  path"** (config/secret/integration/deploy that didn't come from a reviewed merge) —
  it catches the actions an attacker actually needs.

## Paired offense / defense

Pairs with **ci-logging-evasion**. Run that skill against the instrumented pipeline:
its marker "attack" sequence should now be fully reconstructable from the logs, its
suppression attempt defeated by real-time forwarding, and its security-relevant
events should each fire an alert.

## Validation

**Validated `2026-08-09` against the `ci-local` lab** (`_lab/ci-local/`, run
`bash _lab/ci-local/validate.sh`). Observed: shipping step output to an out-of-band
append-only audit sink (rather than an in-workspace job log) defeated the paired
evasion — a step that emitted a marker and then wiped its own log could not remove
the marker from the sink (`RESULT hardened logging ATTACK_BLOCKED
marker-preserved-in-oob-audit-sink`), confirming real-time off-runner capture makes
the record reconstructable despite tampering.

Reproduce in a lab you own:

1. Start from a pipeline with default logging; confirm the paired evasion skill finds
   blind spots and an unalerted marker sequence.
2. Enable/centralize audit logs, enrich build logs, ship them off-runner in real time,
   and add alerts on the security-relevant events.
3. Re-run the paired skill and confirm the marker sequence is reconstructable, the
   suppression attempt fails, and alerts fire.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-10 Insufficient Logging and Visibility
- OWASP: A09:2021 Security Logging and Monitoring Failures
- GitHub/GitLab audit-log & log-streaming docs; cloud audit trail; SIEM ingestion
- MITRE ATT&CK T1562.008, T1070; D3FEND D3-PM (Platform Monitoring), D3-UBA (User
  Behavior Analysis); CAPEC-268; CWE-778, CWE-223
