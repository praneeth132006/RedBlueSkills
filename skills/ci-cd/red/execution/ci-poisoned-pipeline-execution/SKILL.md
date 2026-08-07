---
name: ci-poisoned-pipeline-execution
description: >-
  Demonstrate Poisoned Pipeline Execution (PPE / CICD-SEC-4) during an authorized
  assessment — injecting attacker-controlled build steps into a CI/CD pipeline via a
  pull request, a modifiable pipeline-definition file, or an injectable build input.
  Use when a pipeline runs configuration or scripts that a lower-privileged
  contributor can influence, so untrusted input reaches the runner as executed code
  with access to pipeline secrets and deploy credentials.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: execution
techniques:
  attack: [T1195.002, T1059]
  capec: [CAPEC-233]
  cwe: [CWE-94, CWE-829]
  owasp: ["A08:2021"]
  d3fend: []
pairs_with: [ci-pipeline-execution-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Poisoned Pipeline Execution (PPE)

## Overview

A CI pipeline turns repository content into executed commands on a privileged
runner that holds secrets, registry tokens, and deploy credentials. Poisoned
Pipeline Execution abuses the moment untrusted input becomes one of those commands:
a **direct-PPE** where a pull request edits the pipeline definition itself
(`.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`) and the CI runs the
attacker's version; an **indirect-PPE** where the definition is protected but pulls
in a file the attacker controls (a `Makefile`, `package.json` script, test config);
and **command-injection PPE** where an untrusted value (a PR title, branch name,
issue body) is interpolated unquoted into a shell step. This skill proves the
pipeline executes attacker-influenced code and reaches secrets — with a benign
marker, not a real payload.

## Authorization & scope

**Run only against pipelines you are authorized to test**, on a fork or a
throwaway branch/repo provisioned for the engagement. Prove execution with an
**inert marker** (echo a canary, print a redacted secret's *length* or a hash, or
call a collaborator host) — do **not** exfiltrate real secrets, push to production
registries, or deploy. Never target a shared pipeline whose other jobs process real
data. Delete the test branch/PR and any artifacts afterward.

## Preconditions

- A pipeline that runs on an event a lower-privileged actor can trigger (PR,
  push to a branch, comment) and either an editable pipeline file, an included
  attacker-controlled file, or an unsanitized input interpolated into a step.
- A fork/branch you control and, for out-of-band proof, a collaborator host.

## Procedure

1. **Map triggers and trust.** Identify which events run the pipeline and whether
   they run with secrets for **fork PRs** (the highest-risk misconfiguration —
   `pull_request_target` / privileged fork builds), or only for trusted branches.
2. **Direct PPE.** On a branch/fork, modify the pipeline definition to add a benign
   step and confirm CI runs your version:
   ```yaml
   # added step — proves attacker-controlled pipeline code executed
   - run: echo "RBS-PPE-$(git rev-parse --short HEAD)"; env | grep -c '.'   # count, not values
   ```
3. **Indirect PPE.** If the definition is protected, poison a file it invokes
   (`npm test` → a malicious `test` script in `package.json`, or a `make build`
   target) and confirm the runner executes it.
4. **Command-injection PPE.** Where an untrusted value flows into a shell step
   (e.g. `run: echo ${{ github.event.pull_request.title }}`), submit a title such as
   `x"; echo RBS-INJECT; #` and confirm the injected command runs.
5. **Prove secret reach (safely).** Demonstrate the job *could* read secrets by
   emitting a **non-reversible** proof — the length or a salted hash of a secret,
   or an authenticated call to a collaborator — never the secret itself.
6. **Record** the trigger, the injection class (direct/indirect/injection), whether
   fork PRs ran with secrets, the secret/credential scope reachable, and the fix:
   require approval for PR-triggered runs, never expose secrets to fork/untrusted
   builds, pin and isolate untrusted inputs, and least-privilege the pipeline token.

## Paired defense / offense

Pairs with **ci-pipeline-execution-hardening**. The signals you produce — a pipeline
definition changed within a PR, a job reading secrets on an untrusted trigger,
untrusted input reaching a shell step — are exactly what that skill blocks
(trigger/approval controls, secret scoping) and audits.

## Validation

Reproduce in a lab CI you own (a throwaway GitHub/GitLab repo or a local
`act`/Gitea runner):

1. Configure a pipeline that runs on PR and exposes a dummy secret.
2. Open a PR that adds a benign echo step (direct PPE) and confirm CI runs it; then
   test an injected PR-title value reaching a shell step.
3. Emit a non-reversible proof that the secret was reachable; tear down the branch.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-4 Poisoned Pipeline Execution
- OWASP: A08:2021 Software and Data Integrity Failures
- GitHub Actions security hardening; GitLab CI/CD security; `pull_request_target` guidance
- MITRE ATT&CK T1195.002, T1059; CAPEC-233; CWE-94, CWE-829
