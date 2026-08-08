---
name: ci-pbac-abuse
description: >-
  Demonstrate Insufficient Pipeline-Based Access Controls (CICD-SEC-5) during an
  authorized assessment — abusing the fact that a running pipeline node has access
  far wider than the single job requires, so code executing in one step can reach
  other jobs' secrets, the underlying runner host, the internal network, or adjacent
  environments. Use when a job runs with ambient credentials, a shared/persistent
  runner, or unrestricted network egress, letting execution in one pipeline step move
  laterally to resources the step should never touch.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: lateral-movement
techniques:
  attack: [T1552.007, T1021]
  capec: [CAPEC-233]
  cwe: [CWE-668, CWE-653]
  owasp: ["A04:2021"]
  d3fend: []
pairs_with: [ci-pbac-hardening]
risk:
  level: high
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

# CI/CD PBAC abuse

## Overview

Pipeline-Based Access Controls govern what a *running pipeline node* can reach. When
they are insufficient, a single job's execution context carries far more access than
that job needs: all of the pipeline's secrets are present in the environment, the
runner is shared or persistent so one job sees another's leftovers, the runner's
identity/metadata endpoint hands out cloud credentials, and the network is wide open
to internal services. **PBAC abuse** turns arbitrary execution in one step (obtained,
e.g., via the paired poisoned-pipeline skill) into lateral reach: reading secrets
scoped to other jobs, pivoting to the runner host or internal network, or touching an
adjacent environment. This skill proves that reach on a target you are authorized to
test, with read-only markers.

## Authorization & scope

**Run only against a pipeline and runner you are authorized to test.** Prove reach
with read-only, non-mutating enumeration (list env keys, `whoami`, list reachable
hosts/ports) and inert markers; do **not** exfiltrate real secrets, alter other jobs,
or move into out-of-scope systems. Prefer ephemeral/isolated runners provisioned for
the test. Emit non-reversible proof (counts, hashes, `whoami`) and tear down.

## Preconditions

- The ability to run a benign step in a pipeline in scope (a branch/PR you control),
  and permission to enumerate what that step can reach.
- Knowledge of the runner model (ephemeral vs. shared/persistent) and the secrets
  and network the pipeline is configured with.

## Procedure

1. **Inventory the job's ambient access.** From a benign step, enumerate what is
   present without being needed by this job:
   ```bash
   env | cut -d= -f1 | sort            # secret NAMES only, never values
   curl -s --max-time 2 http://169.254.169.254/  # runner cloud metadata reachable?
   id; hostname; mount | head          # runner host context
   ```
2. **Check cross-job secret exposure.** Determine whether *all* pipeline secrets are
   injected into every job (vs. scoped per job) — the presence of another job's
   secret name in this environment is the finding.
3. **Probe runner reuse.** On a shared/persistent runner, look for another job's
   residue (build workspace, cached credentials, Docker socket) that a fresh,
   isolated runner would not expose:
   ```bash
   ls -la /var/run/docker.sock 2>/dev/null   # Docker socket = host/other-container reach
   ls -la $HOME /tmp /builds 2>/dev/null | head
   ```
4. **Map network reach.** Enumerate what internal hosts/ports the job can reach that
   it should not (databases, other environments, the CI control plane):
   ```bash
   for p in 22 80 443 5432 6379; do timeout 1 bash -c "</dev/tcp/internal-host/$p" \
     && echo "open:$p"; done
   ```
5. **Prove one lateral hop (safely).** With a single read-only call, demonstrate
   reach to one out-of-scope resource (metadata credential *presence*, another job's
   secret *name*, an internal port open) — then stop.
6. **Record** the excess ambient access (all-jobs secrets, shared runner residue,
   Docker socket, open internal network, reachable metadata) and the fix: scope
   secrets per job, use ephemeral isolated runners, block the metadata endpoint,
   restrict egress, and remove the Docker socket from untrusted jobs.

## Paired defense / offense

Pairs with **ci-pbac-hardening**. The ambient reach this skill proves — all-jobs
secrets, shared-runner residue, host/Docker-socket access, open internal network,
reachable metadata — is precisely what that skill removes by scoping each job's
execution context to least privilege.

## Validation

**Validated `2026-08-09` against the `ci-local` lab** (`_lab/ci-local/`, run
`bash _lab/ci-local/validate.sh`). Observed: with the runner injecting **all**
pipeline secrets into every job (global scope), a poisoned step in the `build` job —
which legitimately needs only `ANALYTICS_KEY` — enumerated the unrelated
`DEPLOY_KEY` in its environment (`RESULT vuln pbac ATTACK_SUCCEEDED
build-job-can-read-foreign-DEPLOY_KEY`). Under per-job scoping the same step saw only
`ANALYTICS_KEY` (`RESULT hardened pbac ATTACK_BLOCKED only-own-ANALYTICS_KEY-present`).

Reproduce in a lab you own:

1. Configure a pipeline that injects all secrets into every job on a shared runner
   with open egress and a reachable metadata endpoint.
2. From a benign step, enumerate cross-job secret names, runner residue, and internal
   reach.
3. Apply the paired hardening (per-job secret scope, ephemeral isolated runner,
   blocked metadata, egress allowlist) and confirm the lateral reach is gone while
   the job's own task still runs.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-5 Insufficient PBAC (Pipeline-Based
  Access Controls)
- OWASP: A04:2021 Insecure Design
- Ephemeral/isolated runner guidance (GitHub Actions runner groups, GitLab runner
  isolation); cloud metadata (IMDSv2) hardening
- MITRE ATT&CK T1552.007 Container API / Credentials, T1021 Remote Services;
  CAPEC-233; CWE-668, CWE-653
