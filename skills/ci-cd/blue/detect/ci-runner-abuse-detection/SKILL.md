---
name: ci-runner-abuse-detection
description: >-
  Detect and prevent self-hosted CI runner abuse (CICD-SEC-7). Use when hardening and
  monitoring build runners: enforcing ephemeral one-job runners, least-privilege and
  network isolation, keeping untrusted builds off self-hosted runners, and alerting
  on reused-workspace access, persistence-hook writes, and build jobs reaching
  internal networks.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1078, T1195.002]
  capec: [CAPEC-233]
  cwe: [CWE-269, CWE-668]
  owasp: ["A05:2021"]
  d3fend: [D3-PH, D3-PSMD]
pairs_with: [ci-self-hosted-runner-abuse]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# CI runner abuse detection

## Overview

The blast radius of a self-hosted runner is controlled by removing persistence and
isolating the host, then watching for the behaviours that abuse whatever remains.
This skill enforces **ephemeral, single-job** runners (a fresh, disposable
environment per job removes cross-job residue), least-privilege non-root execution,
and network isolation from internal systems, and keeps untrusted/fork builds off
self-hosted runners entirely. On top of that it detects abuse: access to a prior
job's workspace, writes to persistence locations, and build jobs opening
connections to internal hosts.

## Authorization & scope

Defensive configuration and monitoring of runners you operate. Runner telemetry can
include job and repo identifiers — handle under your normal data-handling policy. No
active testing of third-party runners.

## Preconditions

- Access to the CI runner fleet configuration and host/OS telemetry (process,
  filesystem, network) feeding a SIEM.
- Knowledge of which projects require self-hosted runners and their trust level.

## Procedure

1. **Make runners ephemeral.** Configure single-use runners (a fresh
   container/VM per job, auto-deregistered after one job) so no state — caches,
   credentials, checkouts — survives between jobs. This is the load-bearing control.
2. **Least privilege & isolation.** Run the runner as a non-root user with no sudo,
   on a host isolated from internal networks and other tenants; deny egress except to
   what builds legitimately need.
3. **Keep untrusted builds off self-hosted runners.** Route fork/PR builds to
   ephemeral cloud-hosted runners or require approval; never run untrusted code on a
   persistent, networked self-hosted host.
4. **Detect cross-job residue access.** Alert when a job reads paths belonging to a
   prior job's workspace or user home credentials — on a truly ephemeral runner this
   is impossible, so any occurrence indicates a non-ephemeral fleet or a compromise.
5. **Detect persistence attempts.** Alert on writes to cron/systemd/startup
   locations, tool-cache poisoning, or new services created from within a build job.
6. **Detect network pivots.** Alert on build jobs opening connections to internal
   hosts/ports outside the build's declared needs.
7. **Verify configuration continuously.** Check that runners are registered
   ephemeral, non-root, and isolated; flag any long-lived or privileged runner.

## Detection engineering notes

- **Ephemeral single-use runners** eliminate the entire cross-job residue and
  persistence class; treat runtime detection as the backstop for exception fleets.
- The highest-fidelity alerts are **persistence-hook writes** and **internal-network
  connections from a build job** — both are near-zero in normal ephemeral builds.

## Paired offense / defense

Pairs with **ci-self-hosted-runner-abuse**. Run that skill against a lab runner:
ephemeral single-use runners remove the residue and pivot it relies on, and the
detections here fire on reused-workspace access, persistence writes, and internal
connections if a non-ephemeral runner is targeted.

## Validation

Reproduce in a lab you own with a self-hosted runner:

1. Confirm the paired abuse skill finds cross-job residue and internal reach on a
   non-ephemeral runner.
2. Switch the fleet to ephemeral single-use, non-root, network-isolated runners and
   enable the residue/persistence/network detections.
3. Re-run and confirm the residue and internal reach are gone, and that the
   detections fire if a non-ephemeral runner is reintroduced.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-7 Insecure System Configuration
- OWASP: A05:2021 Security Misconfiguration
- GitHub/GitLab ephemeral & isolated runner guidance
- MITRE ATT&CK T1078, T1195.002; D3FEND D3-PH (Platform Hardening), D3-PSMD (Process Self-Modification Detection)
- CAPEC-233; CWE-269, CWE-668
