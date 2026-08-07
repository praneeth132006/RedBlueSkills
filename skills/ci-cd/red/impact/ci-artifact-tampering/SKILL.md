---
name: ci-artifact-tampering
description: >-
  Demonstrate build-artifact tampering and lack of provenance (CICD-SEC-4/CICD-SEC-9
  artifact integrity) during an authorized assessment — modifying a build output,
  image, or release artifact between build and deploy, or publishing an artifact with
  no verifiable provenance, so consumers install code that never came from the
  trusted build. Use when the path from source to artifact to deployment lacks
  signing, provenance attestation, or integrity verification.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: impact
techniques:
  attack: [T1195.002, T1565.001]
  capec: [CAPEC-186]
  cwe: [CWE-494, CWE-345]
  owasp: ["A08:2021"]
  d3fend: []
pairs_with: [ci-artifact-provenance-hardening]
risk:
  level: high
  reversible: true
  data_touch: read-write
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Build-artifact tampering

## Overview

The output of a pipeline — a package, container image, binary, or release bundle —
is trusted by everything downstream. If the pipeline signs nothing and consumers
verify nothing, an attacker who can write to the artifact store, intercept an
unauthenticated pull/push, or inject a step late in the pipeline can replace the
artifact with a modified one and deployers will run it. This skill demonstrates that
gap: it shows an artifact can be altered after build (or published without
provenance) and consumed without detection — using a **benign marker change** on a
**test artifact**, never a real malicious build pushed to a real channel.

## Authorization & scope

**Run only against build/release systems you are authorized to test.** Operate on a
**test artifact and a test channel/repository**; prove tampering with an inert marker
(a changed label, an added harmless file, a modified version string) — do **not**
publish a tampered artifact to a channel real users consume, and never introduce
executable malicious content. Restore the artifact store to its prior state and
remove test artifacts afterward.

## Preconditions

- A build→artifact→deploy path where artifacts are stored/transported and later
  consumed, and where you can write to the store or influence a late pipeline stage
  (in scope, on a test channel).
- Knowledge of whether artifacts are signed and whether consumers verify signatures/
  provenance.

## Procedure

1. **Map the artifact path.** Trace where the build writes artifacts, how they're
   transported (registry, package repo, object store), and how deployers fetch them
   — noting every point without integrity verification.
2. **Check signing & provenance.** Determine whether artifacts are signed (e.g.
   Sigstore/cosign), whether a provenance attestation (SLSA) is produced, and
   whether **consumers actually verify** them (unverified signing is no control).
3. **Tamper after build (test artifact).** On a test artifact in a test channel,
   make an inert change (add a harmless marker file / change a label) and re-store
   it, simulating post-build modification.
4. **Consume without detection.** Pull the tampered test artifact through the normal
   deploy path and confirm the marker is present and nothing rejected it — proving
   no integrity check gates consumption.
5. **Provenance gap.** Publish a test artifact with no attestation and confirm the
   consumer accepts it, showing provenance is not required.
6. **Transport integrity.** Note whether pulls/pushes use authenticated TLS and
   whether an unpinned tag (vs a content digest) allows silent replacement.
7. **Record** the unverified points, whether signing/provenance exist and are
   verified, and the fix: sign artifacts, generate and require SLSA provenance,
   verify signature+provenance at deploy, and pin by immutable digest.

## Paired defense / offense

Pairs with **ci-artifact-provenance-hardening**. The tampered-but-accepted test
artifact and the unattested publish you demonstrate are exactly what that skill
blocks by signing artifacts, generating provenance, and enforcing verification at
the consumption gate.

## Validation

Reproduce in a lab you own (a local registry / package repo + a deploy step):

1. Build and store a test artifact with no signing/provenance.
2. Modify it in place (inert marker) and pull it through the deploy path; confirm it
   is accepted unverified.
3. Add signing + provenance + verification and confirm the tampered/unattested
   artifact is now rejected (see the paired skill).

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-4 / CICD-SEC-9 (artifact integrity & provenance)
- OWASP: A08:2021 Software and Data Integrity Failures
- SLSA framework; Sigstore/cosign; in-toto attestations
- MITRE ATT&CK T1195.002, T1565.001 (Stored Data Manipulation)
- CAPEC-186; CWE-494 (Download of Code Without Integrity Check), CWE-345
