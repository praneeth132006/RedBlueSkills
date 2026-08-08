---
name: mobile-supply-chain-hardening
description: >-
  Secure a mobile app's supply chain against OWASP Mobile Top 10 M2. Use when
  hardening what goes into and ships as an Android or iOS build: pinning and verifying
  third-party SDKs/dependencies, producing and checking an SBOM/provenance, enforcing
  code signing and runtime integrity/tamper checks, gating the build pipeline, and
  distributing only through trusted channels so a repackaged or dependency-compromised
  app cannot reach users.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1195.002, T1444]
  capec: [CAPEC-186]
  cwe: [CWE-1357, CWE-494]
  owasp: []
  d3fend: [D3-ACH, D3-EAL]
pairs_with: [mobile-supply-chain-tampering]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile supply-chain hardening

## Overview

Securing a mobile supply chain means enforcing **integrity and provenance at every
stage** — from the dependencies pulled at build time to the signed artifact that
reaches a device. This skill hardens four stages: **dependencies** (SDKs and libraries
pinned to specific verified versions from trusted sources, scanned for known vulns,
and captured in an SBOM), **build** (a controlled pipeline that verifies inputs and
produces signed, reproducible artifacts with provenance), **integrity** (code signing
plus runtime tamper/signature and integrity attestation so a repackaged build is
rejected), and **distribution** (release only through trusted store channels with
integrity verification). It removes the unverified inputs and tamper acceptance that
M2 attacks exploit.

## Authorization & scope

Defensive configuration of an app and build pipeline your team owns. Dependency and
build inventories may expose internal tooling — handle under your data-handling
policy. No testing of third-party apps or channels.

## Preconditions

- Access to the app source, dependency manifests (Gradle/CocoaPods/SPM), and the
  build/release pipeline and signing identities.
- The ability to add integrity checks to the app and gates to the pipeline.

## Procedure

1. **Pin and verify dependencies.** Pin every SDK/library to a specific version from a
   trusted source with checksum/signature verification; remove unmaintained or
   excessive-permission SDKs; scan dependencies for known vulnerabilities in CI.
2. **Produce and check an SBOM/provenance.** Generate an SBOM (CycloneDX/SPDX) for each
   build and record build provenance (SLSA); fail the release if the SBOM contains a
   disallowed or vulnerable component.
3. **Enforce signing + runtime integrity.** Sign artifacts with protected keys and add
   runtime checks: verify the app's own signature/installer, use platform integrity
   attestation (Play Integrity / App Attest) so a repackaged or re-signed build is
   detected and refused.
4. **Control the build pipeline.** Build in a controlled environment (see the ci-cd
   hardening skills), verify all inputs, and keep signing keys in an HSM/secure store
   off the build workstation.
5. **Distribute through trusted channels only.** Release via the official stores/MDM;
   discourage sideloading of production builds and detect installers other than the
   trusted source at runtime where the platform allows.
6. **Monitor and respond.** Watch for cloned/repackaged versions of the app in the
   wild, and have a key-rotation and forced-update path for a compromised dependency
   or signing key.

## Detection engineering notes

- **Platform integrity attestation** (Play Integrity / App Attest) is the strongest
  single anti-repackaging control — it moves the check to a signal the client cannot
  forge, unlike a self-check the attacker also controls.
- A **CI-enforced SBOM + dependency scan** is what catches the *quiet* supply-chain
  path (a malicious/vulnerable transitive dependency) that no runtime check would see.

## Paired offense / defense

Pairs with **mobile-supply-chain-tampering**. Run that skill before and after: it
should first repackage-and-run the app and enumerate unpinned dependencies, and
afterward find the tampered build rejected by integrity/attestation and the
dependencies pinned, scanned, and SBOM-tracked.

## Validation

Reproduce against a test app you own:

1. Start from the demo app that repackages-and-runs with unpinned SDKs; confirm the
   paired skill tampers successfully.
2. Pin+verify dependencies, add an SBOM+scan gate, and add a signature/integrity
   attestation check.
3. Re-run the paired skill and confirm the tampered build is rejected and a
   vulnerable/unpinned dependency fails CI, while the legitimate build ships.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-RESILIENCE and SLSA/SBOM guidance._

## References

- OWASP Mobile Top 10 (2024) M2 Inadequate Supply Chain Security
- OWASP MASVS-RESILIENCE / MASVS-CODE; MASTG anti-tampering tests
- SLSA; SBOM (CycloneDX/SPDX); Google Play Integrity API; Apple App Attest / DeviceCheck
- MITRE D3FEND D3-ACH (Application Configuration Hardening), D3-EAL (Executable
  Allowlisting); ATT&CK T1195.002, T1444; CAPEC-186; CWE-1357, CWE-494
