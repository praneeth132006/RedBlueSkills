---
name: mobile-supply-chain-tampering
description: >-
  Demonstrate Inadequate Supply Chain Security (OWASP Mobile Top 10 M2) during an
  authorized mobile assessment — showing that a mobile app can be repackaged,
  trojanized, or built with a compromised dependency/SDK/build step and still run,
  because the app and its distribution do not verify integrity or provenance. Use when
  assessing whether an APK/AAB/IPA can be modified and re-signed, whether third-party
  SDKs and build tooling are unpinned/unverified, and whether the shipped artifact's
  authenticity is checked before it reaches users.
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1195.002, T1444]
  capec: [CAPEC-186, CAPEC-442]
  cwe: [CWE-1357, CWE-494]
  owasp: []
  d3fend: []
pairs_with: [mobile-supply-chain-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile supply-chain tampering

## Overview

A mobile app's supply chain spans the third-party SDKs and libraries it bundles, the
build tooling that assembles it, the signing that authenticates it, and the store/
channel that distributes it. **Inadequate supply-chain security** (M2) is any point
where integrity or provenance goes unverified: an unpinned SDK that can be swapped for
a malicious version, a build step that pulls an unverified dependency, an app that can
be decompiled, patched, and re-signed to run as a trojanized clone, and distribution
that doesn't detect the tamper. This skill demonstrates, on an app you are authorized
to assess, that the artifact can be modified and still run — and inventories the
unverified dependencies and build inputs — proving why integrity must be enforced at
build and at install.

## Authorization & scope

**Run only against an app you are explicitly authorized to assess**, using a build
obtained through a legitimate channel and a device/emulator you own. Repackaging and
re-signing must produce a **benign marker** build (a canary log line, a changed
string) installed only on your test device — never distribute a modified app, never
sideload a trojanized build to anyone else, and never upload it to a store. Report
which integrity checks were missing; the finding is "the artifact is modifiable and
runs", not a weaponized clone.

## Preconditions

- The app package (`.apk`/`.aab`/`.ipa`) from an authorized source and a test device/
  emulator you own.
- Tooling: `apktool`, `jadx`, `apksigner`/`zipalign` (Android), a re-sign identity you
  own; dependency manifests (Gradle/CocoaPods/SPM) if available.

## Procedure

1. **Inventory the dependency & build surface.** From the build (and manifests if
   available), list bundled SDKs/libraries and their versions, and note which are
   unpinned, unmaintained, or fetched from untrusted sources; identify build steps that
   pull dependencies without integrity verification.
2. **Repackage with a benign marker.** Decode, insert an inert marker, and rebuild:
   ```bash
   apktool d app.apk -o app_src
   # add a benign marker (e.g. a log line) to a smali/resource file
   apktool b app_src -o app_tampered.apk
   zipalign -f 4 app_tampered.apk app_aligned.apk
   apksigner sign --ks my-test.keystore app_aligned.apk   # YOUR test key
   ```
3. **Install and confirm it runs.** Install the re-signed marker build on your test
   device and confirm the app launches and the marker fires — proving the app has no
   effective runtime integrity/anti-tamper check and accepts a foreign signature.
4. **Check provenance verification.** Determine whether anything (the app, an MDM, the
   store channel) verifies the artifact's origin/signature before it runs — or whether
   a re-signed build is indistinguishable to the user.
5. **Assess dependency risk.** Flag SDKs with excessive permissions or network reach,
   dependencies pinned to mutable versions, and the absence of a bill of materials
   (SBOM) — the vectors by which malicious code enters legitimately.
6. **Record** the tamperability result, the unverified/unpinned dependencies and build
   inputs, and the fix: sign and verify integrity, pin and verify dependencies, produce
   and check an SBOM/provenance, add runtime tamper/signature checks, and distribute
   only through trusted channels.

## Paired defense / offense

Pairs with **mobile-supply-chain-hardening**. The tamper acceptance and unverified
dependencies this skill demonstrates are what that skill closes — dependency pinning
and verification, SBOM/provenance, signature/tamper checks, and trusted distribution.
Re-run this skill on the hardened build to confirm the tampered marker build is
rejected while the legitimate signed build still runs.

## Validation

Reproduce against a test app you own:

1. Build a demo app that bundles a pinned-by-version third-party SDK and ships without
   runtime integrity checks.
2. Repackage it with a benign marker, re-sign with your own key, install, and confirm
   it runs; inventory the unpinned/unverified build inputs.
3. Apply the paired hardening (pin+verify deps, add a signature/tamper check, produce
   an SBOM) and confirm the tampered marker build is detected/rejected while the
   legitimate build runs.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-RESILIENCE and MASTG code-tampering / dependency test
procedures._

## References

- OWASP Mobile Top 10 (2024) M2 Inadequate Supply Chain Security
- OWASP MASVS-RESILIENCE / MASVS-CODE; MASTG code-tampering & dependency tests
- SLSA supply-chain framework; SBOM (CycloneDX/SPDX); Android app signing & Play
  Integrity; iOS code signing
- MITRE ATT&CK T1195.002 Compromise Software Supply Chain, ATT&CK Mobile T1444
  Masquerade as Legitimate Application; CAPEC-186, CAPEC-442; CWE-1357, CWE-494
