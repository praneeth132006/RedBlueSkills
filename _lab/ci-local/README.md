# `ci-local` — dependency-free CI/CD validation lab

A tiny, self-contained lab that proves three `ci-cd` skill pairs end-to-end with no
Docker, no cloud, and no external CI service — just `git` and `bash`. Each control is
exercised in a **vulnerable** configuration (the attack succeeds) and a **hardened**
configuration (the same attack is blocked), and the outcomes are asserted.

It is the named `validation.target` (`ci-local`) for the skill pairs below.

## Run it

```bash
bash _lab/ci-local/validate.sh
```

Expected: `ci-local: 6 passed, 0 failed` (exit 0).

## What each scenario models

| Scenario | Risk | Vulnerable config | Hardened config | Skills proven |
|---|---|---|---|---|
| `scenarios/flow-control.sh` | CICD-SEC-1 | bare repo, no hook → direct push to `main` lands | bare repo + `pre-receive` hook → direct & force push to `main` rejected, feature branch still pushes | `ci-flow-control-abuse` ↔ `ci-flow-control-hardening` |
| `scenarios/pbac.sh` | CICD-SEC-5 | runner injects **all** pipeline secrets into every job → `build` reads the unrelated `DEPLOY_KEY` | runner injects only a job's declared secrets → `build` sees only `ANALYTICS_KEY` | `ci-pbac-abuse` ↔ `ci-pbac-hardening` |
| `scenarios/logging.sh` | CICD-SEC-10 | job log is a workspace file → a step wipes it after emitting a marker | out-of-band append-only audit sink the step can't reach → marker preserved despite the wipe | `ci-logging-evasion` ↔ `ci-audit-logging-detection` |

`runner.sh` is a minimal, faithful model of how a CI runner injects secrets
(`SCOPE=global|per-job`) and captures logs (`LOGMODE=inline|oob`). The scenarios
configure it the vulnerable and hardened ways and assert the difference.

## Scope / honesty

This lab validates the **control logic** each pair describes — server-side ref
protection, per-job secret scoping, and tamper-resistant out-of-band logging — with
real, observable behavior. It does **not** reproduce a specific vendor's platform
(GitHub/GitLab UI, marketplace, cloud IAM). The two ci-cd pairs that genuinely require
a hosted SCM/cloud identity plane — `ci-identity-privilege-abuse` /
`ci-identity-access-hardening` (CICD-SEC-2) and `ci-third-party-integration-abuse` /
`ci-third-party-governance-hardening` (CICD-SEC-8) — remain `maturity: reviewed` with
in-skill reproduction steps against a real provider.
