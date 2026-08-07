---
name: ci-secret-exposure-monitoring
description: >-
  Detect and prevent CI/CD secret exposure (CICD-SEC-6). Use when instrumenting
  pipelines against credential leakage: scanning repos/history and build outputs for
  secrets, enforcing masking, alerting on secrets in logs/artifacts/caches,
  right-sizing token and OIDC scope, and driving rotation when a credential leaks.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1552.001, T1552.004]
  capec: [CAPEC-118]
  cwe: [CWE-522, CWE-532]
  owasp: ["A07:2021"]
  d3fend: [D3-FA, D3-CA]
pairs_with: [ci-secret-exfiltration]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# CI/CD secret exposure monitoring

## Overview

Secret leakage from pipelines is caught by scanning the places credentials leak and
by removing the reward through short-lived, least-privilege identities. This skill
scans repositories, history, build logs, artifacts, and caches for secrets; enforces
masking so secrets can't be printed; alerts on the leakage patterns the paired
offensive skill probes; and continuously checks that pipeline tokens and OIDC trust
policies are scoped no wider than the job needs — so a leak is both detected and
low-impact.

## Authorization & scope

Passive scanning and configuration analysis of CI/CD you operate. Findings can
include live secret material — handle under your normal data-handling policy, and
route confirmed leaks to rotation, not to tickets in plaintext.

## Preconditions

- Access to repositories/history, build logs, artifact and cache storage, and the
  CI/CD platform's token/OIDC configuration.
- A secret-scanning engine (push protection + historical scan) and a SIEM for build
  telemetry.

## Procedure

1. **Scan code & history.** Run secret scanning on every push (push protection to
   block) and across full history; alert and rotate on any committed credential.
2. **Scan build outputs.** Scan job logs, uploaded artifacts, and dependency/layer
   caches for secret patterns and credential files (`.npmrc`, `.netrc`, cloud
   config, `.env`); fail or quarantine the build on a hit.
3. **Enforce masking.** Ensure the platform masks registered secrets in logs and
   that debug/`set -x` modes cannot echo them; alert if a known secret value appears
   in output despite masking.
4. **Right-size identities.** Audit pipeline token permissions and OIDC trust-policy
   `sub` conditions; flag over-scoped or long-lived credentials and drive them to
   least-privilege, short-lived, per-job scopes.
5. **Detect off-pipeline use.** Where feasible, correlate credential usage to the
   issuing pipeline; alert when a pipeline credential is used from an unexpected
   source — a strong exfiltration signal.
6. **Rotate on exposure.** Any secret that reaches a log/artifact/cache is
   considered compromised — rotate it, don't just delete the log.

## Detection engineering notes

- **Push protection** (block secrets at commit time) prevents the most common
  exposure before it exists; historical scanning is the backstop.
- The strongest low-impact control is **short-lived least-privilege OIDC** — it
  shrinks both the leak window and the blast radius, so detection buys more time.

## Paired offense / defense

Pairs with **ci-secret-exfiltration**. Run that skill in the lab: the secret it
leaks to a log/artifact should trip the output scanner, and the over-scoped token/
OIDC subject it finds should match what this skill's scope audit flags.

## Validation

Reproduce in a lab CI you own:

1. Enable secret scanning (push + history), output scanning, and masking.
2. Run the paired `ci-secret-exfiltration` skill (leak a dummy secret to a log/
   artifact, use an over-scoped token).
3. Confirm the leak is detected and the scope audit flags the token/OIDC subject;
   confirm push protection blocks a committed dummy secret.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-6 Insufficient Credential Hygiene
- OWASP: A07:2021 Identification and Authentication Failures
- GitHub/GitLab secret scanning & push protection; OIDC hardening; SLSA
- MITRE ATT&CK T1552.001, T1552.004; D3FEND D3-FA (File Analysis), D3-CA (Credential Analysis)
- CAPEC-118; CWE-522, CWE-532
