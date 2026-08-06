---
name: ci-artifact-provenance-hardening
description: >-
  Harden the build→release path against artifact tampering by establishing signing
  and provenance (CICD-SEC-4/9, SLSA). Use when securing artifact integrity: signing
  build outputs, generating SLSA provenance/attestations, enforcing signature and
  provenance verification at the deploy/consumption gate, and pinning artifacts by
  immutable digest.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1195.002, T1565.001]
  capec: [CAPEC-186]
  cwe: [CWE-494, CWE-345]
  owasp: ["A08:2021"]
  d3fend: [D3-ACH, D3-EAL]
pairs_with: [ci-artifact-tampering]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# CI artifact provenance hardening

## Overview

Artifact tampering is defeated by making every deployed artifact cryptographically
traceable to the trusted build and by refusing anything that isn't. This skill signs
build outputs, generates SLSA provenance that records how and from what source each
artifact was built, and — critically — **enforces verification at the consumption
gate** so an unsigned, unattested, or modified artifact is rejected at deploy.
Signing without mandatory verification is not a control; the enforcement point is
where the security actually lives.

## Authorization & scope

Defensive configuration of build/release systems you operate. Provenance metadata
and signing key configuration are sensitive — protect signing keys in an HSM/KMS or
use keyless (OIDC-based) signing. No active testing of third-party artifacts.

## Preconditions

- Access to the build pipeline (to add signing/attestation) and the deploy/consumer
  side (to add verification).
- A signing mechanism (Sigstore/cosign keyless via OIDC, or KMS-backed keys) and an
  attestation format (SLSA provenance / in-toto).

## Procedure

1. **Sign build outputs.** Sign every artifact (images, packages, binaries) at build
   time; prefer keyless signing tied to the pipeline's OIDC identity so there's no
   long-lived key to steal.
2. **Generate provenance.** Produce a SLSA provenance attestation per artifact
   recording the source commit, builder identity, and build parameters; store it
   alongside the artifact.
3. **Enforce verification at deploy.** At the consumption gate (admission
   controller, deploy step, install policy), **require** a valid signature **and**
   a provenance attestation whose source/builder match policy — reject otherwise.
   This is the load-bearing control.
4. **Pin by digest.** Reference artifacts by immutable content digest, not mutable
   tags, so an artifact cannot be silently replaced behind a tag.
5. **Protect the transport & store.** Require authenticated TLS for push/pull, and
   restrict write access to artifact stores to the pipeline identity only.
6. **Raise the SLSA level.** Drive toward hermetic, isolated builds so provenance is
   trustworthy and non-forgeable.
7. **Detect.** Alert on artifacts deployed without matching provenance, signature-
   verification failures at the gate, and writes to the artifact store from any
   identity other than the pipeline.

## Detection engineering notes

- The control that matters is **mandatory verification at the consumption gate** —
  signing and provenance are inert unless deployers refuse what fails verification.
- Alert on **digest/tag mismatches** and **store writes from non-pipeline
  identities** — both indicate an attempt to substitute an artifact.

## Paired offense / defense

Pairs with **ci-artifact-tampering**. Run that skill against a lab release path:
signature + provenance verification at the deploy gate should reject the tampered
test artifact and the unattested publish, and digest-pinning should prevent the
tag-swap.

## Validation

Reproduce in a lab you own:

1. Confirm the paired tampering skill can get a modified/unattested artifact accepted
   before hardening.
2. Add signing + SLSA provenance in the build and mandatory verification + digest
   pinning at the deploy gate.
3. Re-run and confirm the tampered and unattested artifacts are rejected, while a
   properly signed+attested artifact deploys.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-4 / CICD-SEC-9
- OWASP: A08:2021 Software and Data Integrity Failures
- SLSA framework; Sigstore/cosign keyless signing; in-toto; Kubernetes admission verification
- MITRE ATT&CK T1195.002, T1565.001; D3FEND D3-ACH, D3-EAL; CAPEC-186; CWE-494, CWE-345
