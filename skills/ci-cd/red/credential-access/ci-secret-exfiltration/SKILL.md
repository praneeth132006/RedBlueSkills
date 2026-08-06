---
name: ci-secret-exfiltration
description: >-
  Demonstrate CI/CD secret exfiltration (CICD-SEC-6, Insufficient Credential
  Hygiene) during an authorized assessment — recovering pipeline secrets, registry
  tokens, cloud/OIDC credentials, and deploy keys from build logs, environment
  dumps, caches/artifacts, and over-scoped tokens. Use when you have a foothold in a
  pipeline (via PPE or a malicious dependency) and need to prove which credentials a
  job can reach and how they leak.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: credential-access
techniques:
  attack: [T1552.001, T1552.004]
  capec: [CAPEC-118]
  cwe: [CWE-522, CWE-532]
  owasp: ["A07:2021"]
  d3fend: []
pairs_with: [ci-secret-exposure-monitoring]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# CI/CD secret exfiltration

## Overview

CI runners are credential-dense: registry tokens, cloud keys or OIDC identities,
signing keys, deploy SSH keys, and third-party API tokens all pass through them.
Poor credential hygiene turns any code execution in a job into credential theft —
secrets printed to logs, whole `env` dumped on error, credentials cached in
artifacts or layer caches, long-lived tokens with far more scope than the job
needs, and secrets committed to the repo. This skill enumerates what a compromised
job can reach and proves leakage paths, using **non-reversible proofs** rather than
extracting live secret material.

## Authorization & scope

**Run only against pipelines you are authorized to test.** Prove reachability with
**redacted, non-reversible evidence** — a secret's length, a salted hash, or the
fact that an authenticated call to a collaborator succeeded — **never** the plaintext
secret, and never move a live credential off the runner. Do not use recovered
credentials to access production. Purge any logs/artifacts you generate.

## Preconditions

- Code execution within a job (from `ci-poisoned-pipeline-execution` or a malicious
  build dependency) or access to build logs, artifacts, and caches.
- The list of secrets/identities the pipeline configures, to scope the assessment.

## Procedure

1. **Inventory reachable secrets.** From within a job, list configured secret names
   and mounted credentials without printing values:
   ```bash
   env | sed -E 's/=(.*)$/=<redacted len:\x27"$(printf %s "\1" | wc -c)"\x27>/' | grep -iE 'TOKEN|KEY|SECRET|PASS'
   ```
2. **Log leakage.** Check whether secrets are printed by build steps, whether
   `set -x`/debug modes echo them, and whether error paths dump the environment.
3. **Artifact & cache leakage.** Inspect build artifacts, uploaded logs, and
   dependency/layer caches for embedded credentials, `.npmrc`/`.netrc`/`.docker`
   config, or `.env` files that get persisted between jobs.
4. **Token over-scope.** Determine the pipeline token's permissions (repo write,
   package publish, cloud role) and whether it exceeds the job's need — an
   over-scoped or long-lived token widens the blast radius of any leak.
5. **OIDC/federation scope.** Where the pipeline federates into a cloud role, check
   the trust policy's subject condition — an over-broad `sub` claim lets other
   repos/branches assume the role.
6. **Repo history.** Scan the repository and its history for committed secrets
   (a frequent CICD-SEC-6 finding).
7. **Record** each reachable credential, its leakage path (log/artifact/cache/
   over-scope/committed), the blast radius, and the fix: mask and never log secrets,
   short-lived least-privilege tokens, scoped OIDC subjects, artifact/cache
   hygiene, and secret scanning.

## Paired defense / offense

Pairs with **ci-secret-exposure-monitoring**. The leakage paths you probe — secrets
in logs/artifacts, env dumps, over-scoped tokens used off-pipeline — are what that
skill scans for and alerts on, closing the loop from detection to rotation.

## Validation

Reproduce in a lab CI you own:

1. Configure a pipeline with a dummy secret and a step that accidentally logs it /
   caches it in an artifact.
2. From a job (or the logs), recover the leakage path and emit a non-reversible
   proof (length/hash) that the secret was reachable.
3. Confirm token scope exceeds the job's need; tear down and rotate the dummy
   secret.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-6 Insufficient Credential Hygiene
- OWASP: A07:2021 Identification and Authentication Failures
- GitHub/GitLab secret masking & OIDC hardening; SLSA provenance
- MITRE ATT&CK T1552.001 (Credentials in Files), T1552.004 (Private Keys)
- CAPEC-118; CWE-522, CWE-532 (Insertion of Sensitive Information into Log File)
