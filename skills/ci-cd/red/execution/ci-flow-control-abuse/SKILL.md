---
name: ci-flow-control-abuse
description: >-
  Demonstrate Insufficient Flow Control (CICD-SEC-1) during an authorized
  assessment — pushing code, config, or artifacts through the delivery pipeline to a
  protected environment without passing the intended review, approval, or quality
  gates. Use when branch protections, required reviews, environment approvals, or
  merge gates can be bypassed (direct push, self-approval, admin override, force
  push, an unprotected release branch, or a deploy path that skips the gate) so a
  single actor can move a change to production unilaterally.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: execution
techniques:
  attack: [T1195.002, T1078]
  capec: [CAPEC-233]
  cwe: [CWE-284, CWE-807]
  owasp: ["A08:2021"]
  d3fend: []
pairs_with: [ci-flow-control-hardening]
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

# CI/CD flow-control abuse

## Overview

A delivery pipeline is supposed to force every change through a fixed sequence of
gates — peer review, status checks, environment approval — before it can reach a
protected target. **Insufficient flow control** is any path that lets a single actor
move a change past those gates unilaterally: pushing directly to a protected branch,
approving one's own pull request, using an admin override or "merge without waiting
for checks", force-pushing over a protected ref, shipping from an *unprotected*
release/tag that deploys, or a deploy job that reads from a branch the gate does not
cover. This skill proves, on a repo/pipeline you are authorized to test, that an
authorized change can reach a protected environment without the mandated review or
checks — a benign marker commit, never a real payload — and characterizes exactly
which gate was missing.

## Authorization & scope

**Run only against a repository and pipeline you are authorized to test**, on a
throwaway target branch/environment provisioned for the engagement. Prove the bypass
with an **inert marker** (a no-op commit, a README line, an echo in a deploy step) —
do **not** ship real code, alter production config, or deploy anything with effect.
Revert the marker commit/tag and any deployment, and restore branch protection to
its original state if you changed it. Never exercise this on a shared branch that
others are actively delivering from.

## Preconditions

- Write access at the privilege level under test (contributor, maintainer, or admin)
  to a repo/pipeline in scope, and a non-production target environment.
- Visibility into the intended gate: required reviewers, required status checks,
  environment protection rules, and which refs deploy.

## Procedure

1. **Map the intended flow.** Document the gates a change is *supposed* to pass:
   required reviews and their count, required status checks, who can approve, which
   branches/tags are protected, and which refs trigger a deploy to the protected
   environment.
2. **Test direct-push / force-push.** From an in-scope branch, attempt a direct push
   and a force push to the protected ref:
   ```bash
   git commit --allow-empty -m "RBS-FLOW-marker $(date +%s)"
   git push origin HEAD:main            # should be rejected by branch protection
   git push --force origin HEAD:main    # force-push over a protected ref
   ```
3. **Test self-approval / single-actor merge.** Open a PR and attempt to approve and
   merge it yourself, or use "merge without review"/admin-override to merge before
   required checks complete. Note whether one identity can both author and approve.
4. **Test gate-skipping deploy paths.** Look for a deploy that triggers from an
   *unprotected* branch or tag, a manually-dispatchable deploy workflow, or a
   release created directly — anything that reaches the protected environment
   without going through the reviewed path. Trigger it with a benign marker.
5. **Confirm reach without effect.** Show the marker commit/artifact arrived in the
   protected environment (a canary line in the deploy log, the marker tag deployed) —
   proving the change bypassed the gate — without changing anything of consequence.
6. **Record** which gate was missing (no required review, self-approval allowed,
   admin override, unprotected deploy ref, force-push permitted), the privilege level
   needed, and the fix: enforce protection on every ref that can deploy, require
   independent review, forbid self-approval and admin bypass, and make the reviewed
   path the *only* path to production.

## Paired defense / offense

Pairs with **ci-flow-control-hardening**. The bypasses you prove — direct/force
push, self-approval, admin override, an unprotected deploy ref — are exactly the
paths that skill closes and monitors: uniform branch/tag protection, required
independent review, disallowed self-approval, and a single audited path to each
protected environment.

## Validation

**Validated `2026-08-09` against the `ci-local` lab** (`_lab/ci-local/`, run
`bash _lab/ci-local/validate.sh`). Observed: against an unprotected bare repo a
direct push of a marker commit to `main` was **accepted** (`RESULT vuln flow-control
ATTACK_SUCCEEDED direct-push-to-main-accepted`); against a repo with a `pre-receive`
protected-branch hook the same direct push **and** a force-push were **rejected**
while a feature-branch push still succeeded (`RESULT hardened flow-control
ATTACK_BLOCKED direct+force-rejected feature-branch-ok`).

Reproduce in a lab repo/pipeline you own (a throwaway GitHub/GitLab project):

1. Protect `main` with required reviews and checks, and wire a deploy that triggers
   on push to `main` and on tags.
2. Show a marker change reaching the "deploy" via an ungated path — e.g. a tag or an
   unprotected `release/*` branch that also deploys, or self-approval — without an
   independent review.
3. Apply the paired hardening (protect all deploy refs, require independent review,
   disable self-approval/override) and confirm the marker path is now blocked while
   a properly reviewed change still ships.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-1 Insufficient Flow Control Mechanisms
- OWASP: A08:2021 Software and Data Integrity Failures
- GitHub branch/tag protection & required reviews; GitLab protected branches &
  merge-request approvals; environment protection rules
- MITRE ATT&CK T1195.002, T1078; CAPEC-233; CWE-284, CWE-807
