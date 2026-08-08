---
name: ci-pbac-hardening
description: >-
  Harden Pipeline-Based Access Controls against CICD-SEC-5. Use when constraining
  what a running pipeline node can reach: scoping secrets per job instead of injecting
  all of them everywhere, using ephemeral isolated runners so no job inherits
  another's residue, blocking the cloud metadata endpoint, restricting runner network
  egress, and keeping the Docker socket and host away from untrusted jobs.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1552.007, T1021]
  capec: [CAPEC-233]
  cwe: [CWE-668, CWE-653]
  owasp: ["A04:2021"]
  d3fend: [D3-ACH, D3-NTA]
pairs_with: [ci-pbac-abuse]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: validated
validation:
  method: lab
  target: ci-local
  last_validated: 2026-08-09
  validated_by: praneeth132006
license: Apache-2.0
---

# CI/CD PBAC hardening

## Overview

The execution context of a pipeline job should carry only what *that job* needs and
nothing more. This skill tightens Pipeline-Based Access Controls so a compromised or
poisoned step cannot pivot: **secret scope** (each job receives only its own secrets,
never the union of all pipeline secrets), **runner isolation** (ephemeral,
single-use runners so no workspace, cache, or credential residue crosses jobs),
**identity containment** (block the cloud metadata endpoint from untrusted jobs so
the runner's role cannot be harvested), **network egress** (allowlist the few
destinations a build legitimately needs), and **host separation** (no Docker socket
or privileged host access for untrusted jobs). It removes the lateral reach CICD-SEC-5
abuse depends on.

## Authorization & scope

Defensive configuration of CI/CD runners and pipelines you operate. Runner and
pipeline configs may expose secret references and topology — handle under your
data-handling policy. No active testing of third-party systems.

## Preconditions

- Admin access to runner configuration and pipeline secret/variable scoping.
- An inventory of which secrets, networks, and hosts each job legitimately needs.

## Procedure

1. **Scope secrets per job/environment.** Stop injecting all pipeline secrets into
   every job; bind each secret to the specific job/environment that uses it (job-level
   variables, environment-scoped secrets) so other jobs never see it.
2. **Use ephemeral, isolated runners.** Prefer single-use runners that are destroyed
   after each job; never reuse a persistent runner across trust boundaries. This
   removes cross-job workspace, cache, and credential residue.
3. **Block the metadata endpoint.** For jobs that don't need cloud metadata, deny
   egress to `169.254.169.254`; where cloud identity is required, use IMDSv2 with a
   minimal hop limit and a scoped instance/OIDC role.
4. **Restrict network egress.** Allowlist the destinations a build genuinely needs
   (package registries, your artifact store) and deny reach to internal databases,
   other environments, and the CI control plane.
5. **Keep the host away from untrusted jobs.** Do not mount the Docker socket or grant
   privileged/host access to jobs that run untrusted code; use rootless/isolated build
   backends.
6. **Separate trust tiers.** Run untrusted (fork/PR) builds on a distinct runner pool
   with no secrets and no internal reach, apart from trusted release runners.
7. **Audit reach.** Periodically verify what each runner pool can reach and alert on
   new egress destinations, metadata access, or Docker-socket mounts.

## Detection engineering notes

- **Per-job secret scoping + ephemeral runners** together eliminate most PBAC lateral
  movement structurally — a job simply never holds another job's secret or residue.
- Alerting on **new outbound destinations** and **metadata endpoint access** from a
  build catches both PBAC abuse and the poisoned-pipeline step that precedes it.

## Paired offense / defense

Pairs with **ci-pbac-abuse**. Run that skill against a lab pipeline before and after:
after hardening, its enumeration should find only this job's secrets, a clean
ephemeral runner, a blocked metadata endpoint, and no internal reach.

## Validation

**Validated `2026-08-09` against the `ci-local` lab** (`_lab/ci-local/`, run
`bash _lab/ci-local/validate.sh`). Observed: switching the runner from global to
per-job secret injection removed the unrelated `DEPLOY_KEY` from the `build` job's
environment — the poisoned enumeration that previously found it now saw only the
job's own `ANALYTICS_KEY` (`RESULT hardened pbac ATTACK_BLOCKED
only-own-ANALYTICS_KEY-present`), confirming per-job scoping eliminates the cross-job
reach.

Reproduce in a lab you own:

1. Start from a pipeline that injects all secrets into every job on a shared runner
   with open egress; confirm the paired skill proves cross-job/lateral reach.
2. Scope secrets per job, switch to ephemeral isolated runners, block metadata, and
   apply an egress allowlist.
3. Re-run the paired skill and confirm the ambient reach is gone while the job's
   legitimate task still succeeds.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-5 Insufficient PBAC
- OWASP: A04:2021 Insecure Design
- Ephemeral runner guidance; IMDSv2 hardening; egress allowlisting for build runners
- MITRE ATT&CK T1552.007, T1021; D3FEND D3-ACH (Application Configuration
  Hardening), D3-NTA (Network Traffic Analysis); CAPEC-233; CWE-668, CWE-653
