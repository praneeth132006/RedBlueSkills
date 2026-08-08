---
name: ci-flow-control-hardening
description: >-
  Harden a CI/CD delivery pipeline against Insufficient Flow Control (CICD-SEC-1).
  Use when ensuring no single actor can move a change to a protected environment
  without the mandated review and checks: uniform branch/tag protection on every ref
  that can deploy, required independent review, no self-approval or admin override,
  a single audited path to each environment, and alerting on gate bypass.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1195.002, T1078]
  capec: [CAPEC-233]
  cwe: [CWE-284, CWE-807]
  owasp: ["A08:2021"]
  d3fend: [D3-ACH, D3-UBA]
pairs_with: [ci-flow-control-abuse]
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

# CI/CD flow-control hardening

## Overview

Flow control is the guarantee that **every** change to a protected environment
traverses the same reviewed, checked path — and that no identity can shortcut it.
This skill enforces that guarantee on four axes: **coverage** (every branch and tag
that can deploy is protected — no ungated release refs), **independence** (a change
requires review by someone other than its author; self-approval is disabled),
**no-override** (admin bypass, "merge without checks", and force-push over protected
refs are turned off or tightly restricted and logged), and **single path** (each
protected environment is reachable only through the reviewed pipeline, with
environment approval where warranted). It closes direct-push, self-approval,
override, and ungated-deploy bypasses.

## Authorization & scope

Defensive configuration of CI/CD and source control you operate. Repo settings and
deploy logs may reveal internal topology — handle under your normal data-handling
policy. No active testing of third-party pipelines.

## Preconditions

- Admin access to source-control branch/tag protection and the CI/CD platform's
  environment and approval settings.
- An inventory of every ref/trigger that can reach each protected environment.

## Procedure

1. **Protect every deploy ref uniformly.** Identify all branches and tags that can
   trigger a deploy and apply protection to each — no environment should be reachable
   from an unprotected `release/*`, tag, or manual-dispatch path that skips review.
2. **Require independent review.** Require at least one approving review from someone
   other than the author (CODEOWNERS for sensitive paths); enable "dismiss stale
   approvals on new commits" so a re-push cannot smuggle unreviewed code past an
   earlier approval.
3. **Disable self-approval and override.** Forbid a single identity from authoring
   and approving the same change; disable or tightly restrict admin merge-override
   and "merge without waiting for checks"; disallow force-push to protected refs.
4. **Make required checks blocking.** Mark the pipeline's quality/security checks as
   *required* status checks so a merge cannot complete until they pass — not merely
   advisory.
5. **Gate protected environments.** Add environment protection rules (required
   reviewers, wait timers, allowed branches) for any deploy to production, so the
   deploy step itself re-checks provenance.
6. **Collapse to one path.** Ensure production is reachable only through the reviewed
   pipeline; remove or lock down direct-deploy tooling, personal deploy credentials,
   and manual console access that bypasses it.
7. **Audit and alert.** Log and alert on protection-rule changes, admin overrides,
   force-pushes to protected refs, and deploys that did not originate from a reviewed
   merge.

## Detection engineering notes

- The highest-value invariant is **"one path to prod"**: if every deploy must come
  from a reviewed merge on a protected ref, most bypasses become impossible rather
  than merely detected.
- Alert specifically on **admin override / self-approval / force-push** events — they
  are rare in healthy repos, so each one deserves a look.

## Paired offense / defense

Pairs with **ci-flow-control-abuse**. Run that skill against a lab pipeline: after
hardening, its direct/force-push, self-approval, override, and ungated-deploy marker
attempts should all be blocked or flagged, while a properly reviewed change still
ships cleanly.

## Validation

**Validated `2026-08-09` against the `ci-local` lab** (`_lab/ci-local/`, run
`bash _lab/ci-local/validate.sh`). Observed: adding a `pre-receive`
protected-branch hook to the bare repo turned an accepted direct/force push to
`main` into a rejection (`RESULT hardened flow-control ATTACK_BLOCKED
direct+force-rejected feature-branch-ok`), while a legitimate feature-branch push
still succeeded — confirming the ref-protection control closes the bypass without
breaking the reviewed path.

Reproduce in a lab repo/pipeline you own:

1. Stand up a repo with a deploy on push-to-`main` and a bypass path (a tag or
   `release/*` branch that also deploys) and confirm the paired skill reaches deploy
   ungated.
2. Apply protection to all deploy refs, require independent review, disable
   self-approval/override, and gate the environment.
3. Re-run the paired skill and confirm every bypass marker is blocked while a
   reviewed change deploys normally.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-1 Insufficient Flow Control Mechanisms
- OWASP: A08:2021 Software and Data Integrity Failures
- GitHub branch/tag protection, required reviews, environment protection rules;
  GitLab protected branches & MR approval rules; SLSA source requirements
- MITRE ATT&CK T1195.002, T1078; D3FEND D3-ACH (Application Configuration
  Hardening), D3-UBA (User Behavior Analysis); CAPEC-233; CWE-284, CWE-807
