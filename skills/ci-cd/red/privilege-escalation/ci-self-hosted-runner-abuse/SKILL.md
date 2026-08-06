---
name: ci-self-hosted-runner-abuse
description: >-
  Demonstrate self-hosted CI runner abuse (CICD-SEC-7, insecure system
  configuration) during an authorized assessment — abusing a persistent,
  non-ephemeral, or over-privileged build runner to escalate from a build job into
  the runner host, its network, cached credentials, or other tenants' jobs. Use when
  a project uses self-hosted runners that survive between jobs, run untrusted PR
  builds, or sit inside a trusted network.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1078, T1195.002]
  capec: [CAPEC-233]
  cwe: [CWE-269, CWE-668]
  owasp: ["A05:2021"]
  d3fend: []
pairs_with: [ci-runner-abuse-detection]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Self-hosted runner abuse

## Overview

Self-hosted runners trade convenience for blast radius: unlike ephemeral
cloud-hosted runners, they often persist between jobs, run as a privileged user, sit
inside a trusted internal network, and — dangerously — may execute untrusted PR
builds. A build job that lands on such a runner can read state left by previous jobs
(cached credentials, checked-out private repos, tokens), persist on the host, reach
internal services the runner can route to, or interfere with other tenants' builds.
This skill demonstrates that escalation from a build job to the runner host/network
with **read-only, inert proof**, so the runner can be made ephemeral and isolated.

## Authorization & scope

**Run only against runners you are authorized to test.** Prove reach with **inert,
read-only evidence** — the runner's hostname, that a previous job's workspace or a
cached credential file *exists* (not its contents), or that an internal host is
reachable — and **do not** install persistence, pivot into internal systems, read
other tenants' secret material, or disrupt running jobs. Restore any state you touch;
remove test workflows.

## Preconditions

- A project that dispatches jobs to a self-hosted runner and a way to run a job on it
  (a branch/PR in scope, or a provisioned test workflow).
- Knowledge of whether the runner is ephemeral, what user it runs as, and what
  network it sits in.

## Procedure

1. **Fingerprint the runner.** From a benign job, record whether it's self-hosted,
   the user/privilege it runs as, and whether the environment shows signs of reuse:
   ```bash
   whoami; id; hostname
   echo "reused workspace?"; ls -a "$RUNNER_WORKSPACE/.." 2>/dev/null | head
   ```
2. **Check ephemerality.** Look for residue from prior jobs — leftover checkouts,
   `~/.docker`/`~/.aws`/`~/.npmrc`, build caches, running containers — that a truly
   ephemeral runner would not retain. Their presence proves persistence between jobs.
3. **Untrusted-build exposure.** Determine whether the runner executes fork/PR builds
   (chains with `ci-poisoned-pipeline-execution`) — if so, untrusted code runs on a
   persistent, networked host.
4. **Network reach (inert).** Test whether the runner can reach internal services it
   shouldn't (a single connection check to an internal host/port), demonstrating the
   runner as a network pivot — do not authenticate or pull data.
5. **Persistence potential (describe, don't install).** Note whether the runner user
   could write a cron/systemd/startup hook or a poisoned tool cache that a later job
   would execute — describe it from permissions; do not actually persist.
6. **Record** the runner's privilege, ephemerality, untrusted-build exposure, and
   network position, plus the fix: ephemeral one-job runners, least-privilege
   non-root user, network isolation from internal systems, and never running
   untrusted builds on self-hosted runners.

## Paired defense / offense

Pairs with **ci-runner-abuse-detection**. The behaviours you exercise — reused
workspace access, a build job reaching internal hosts, persistence-hook writes — are
what that skill hunts for on runner telemetry, alongside the configuration checks for
ephemerality and privilege.

## Validation

Reproduce in a lab you own with a self-hosted runner:

1. Register a non-ephemeral runner and run two sequential jobs; in job two, confirm
   residue from job one (a marker file / cached credential) is present.
2. From a job, confirm the runner can reach an internal-only test service.
3. Re-register the runner as ephemeral/isolated and confirm the residue and internal
   reach are gone (see the paired skill).

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-7 Insecure System Configuration
- OWASP: A05:2021 Security Misconfiguration
- GitHub/GitLab self-hosted runner hardening; ephemeral runners; runner isolation
- MITRE ATT&CK T1078, T1195.002; CAPEC-233; CWE-269, CWE-668
