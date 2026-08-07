---
name: ci-pipeline-execution-hardening
description: >-
  Harden a CI/CD pipeline against Poisoned Pipeline Execution (PPE / CICD-SEC-4). Use
  when protecting pipelines from attacker-controlled build steps: gating
  PR/untrusted triggers behind approval, denying secrets to fork/untrusted builds,
  pinning and quoting untrusted inputs, least-privileging the pipeline token, and
  auditing pipeline-definition changes.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1195.002, T1059]
  capec: [CAPEC-233]
  cwe: [CWE-94, CWE-829]
  owasp: ["A08:2021"]
  d3fend: [D3-ACH, D3-EAL]
pairs_with: [ci-poisoned-pipeline-execution]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# CI pipeline execution hardening

## Overview

PPE is prevented by ensuring untrusted input never becomes privileged executed
code. This skill hardens pipelines on four axes: **triggers** (untrusted/fork PRs
run in a low-privilege context, gated behind maintainer approval, never with
production secrets), **inputs** (values from PR titles, branch names, and issue
bodies are treated as data — passed via environment, never interpolated into a
shell), **identity** (the pipeline token is least-privilege and short-lived, scoped
per job), and **change control** (pipeline-definition edits require review and are
audited). It closes both direct and indirect PPE and the command-injection variant.

## Authorization & scope

Defensive configuration of CI/CD you operate. Pipeline logs and configs may contain
secret references and internal topology — handle under your normal data-handling
policy. No active testing of third-party pipelines.

## Preconditions

- Admin access to the CI/CD platform configuration and repository settings.
- An inventory of pipelines, their triggers, and the secrets/credentials each job
  can access.

## Procedure

1. **Gate untrusted triggers.** Require manual approval before running CI on pull
   requests from forks/first-time contributors; do not use privileged fork-PR
   triggers (`pull_request_target`, "run pipelines for fork merge requests" with
   secrets) unless the job is provably safe and reads no secrets.
2. **Deny secrets to untrusted builds.** Scope secrets to protected branches/
   environments and to specific jobs; untrusted/fork builds get **no** secrets and
   a read-only token. Use environment protection rules with required reviewers for
   any job that deploys or reads production credentials.
3. **Treat inputs as data.** Never interpolate `${{ ... }}` / untrusted variables
   directly into `run:` shell; assign them to an environment variable and reference
   `"$VAR"` quoted. Lint workflows for untrusted-context interpolation.
4. **Least-privilege the token.** Default the pipeline token to read-only
   (`permissions: contents: read`) and grant additional scopes per-job only where
   needed; prefer short-lived OIDC federation over long-lived stored credentials.
5. **Isolate untrusted execution.** Run untrusted builds on ephemeral, isolated
   runners with no access to internal networks, deploy targets, or other jobs'
   state.
6. **Control pipeline changes.** Require review for changes to pipeline definitions
   and included build files (CODEOWNERS on `.github/workflows/**`, `Jenkinsfile`,
   build scripts); pin third-party actions/orbs to a full commit SHA.
7. **Audit and detect.** Alert on pipeline-definition changes within a PR, jobs
   reading secrets on untrusted triggers, and new outbound network destinations
   from a build.

## Detection engineering notes

- The single highest-value control is **no secrets for fork/untrusted PR builds** —
  it removes the reward even when execution is achieved.
- Alert on **untrusted-context interpolation** in workflow files at PR time (a CI
  lint step) — it catches command-injection PPE before merge.

## Paired offense / defense

Pairs with **ci-poisoned-pipeline-execution**. Run that skill against a lab
pipeline: approval-gated triggers and secret scoping should prevent the poisoned
job from reaching credentials, and the workflow-lint/CODEOWNERS controls should
block or flag the pipeline-definition edit and the injected input.

## Validation

Reproduce in a lab CI you own:

1. Stand up a pipeline that initially runs fork PRs with a secret.
2. Confirm the paired PPE skill can execute an injected step and reach the secret.
3. Apply the controls (approval gate, secret scoping, quoted inputs, read-only
   token) and confirm the poisoned PR no longer executes with secrets, while a
   trusted build still succeeds.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-4 Poisoned Pipeline Execution
- OWASP: A08:2021 Software and Data Integrity Failures
- GitHub Actions security hardening; GitLab CI/CD security; SLSA build requirements
- MITRE ATT&CK T1195.002, T1059; D3FEND D3-ACH (Application Configuration Hardening), D3-EAL (Executable Allowlisting)
- CAPEC-233; CWE-94, CWE-829
