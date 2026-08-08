---
name: mobile-misconfiguration-hardening
description: >-
  Eliminate mobile security misconfiguration against OWASP Mobile Top 10 M8. Use when
  setting an Android or iOS app's platform and app configuration to secure values:
  disabling debug/backup in release, exporting only necessary components behind proper
  permissions, enforcing a strict network security config (no cleartext, no user CAs),
  locking down WebView settings, using private file modes, and gating these in CI so a
  regression cannot ship.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1626, T1420]
  capec: [CAPEC-1]
  cwe: [CWE-16, CWE-926]
  owasp: []
  d3fend: [D3-ACH, D3-EAL]
pairs_with: [mobile-security-misconfiguration]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile misconfiguration hardening

## Overview

Misconfiguration is the cheapest class of mobile risk to fix and the easiest to
regress, so the defense is to **set every platform control to its secure value and
then keep it there with a build-time gate.** This skill hardens the configuration
surface: **build flags** (no `debuggable`/`allowBackup` in release; a sane
`minSdkVersion`), **component exposure** (export only what must be, each behind a
signature-level permission; nothing exported by accident), **network config** (no
cleartext, no user-added CA trust, pinning where warranted; iOS ATS enforced),
**WebView** (JavaScript and bridges only where needed, no untrusted content, file
access off), and **storage modes** (private file modes, scoped FileProvider paths). A
CI check locks each secure default so a later change can't quietly reopen a door.

## Authorization & scope

Defensive configuration of an app your team owns. Configuration review may surface
security-sensitive settings — handle under your data-handling policy. No testing of
third-party apps.

## Preconditions

- Access to the app manifest/`Info.plist`, build configuration, network security
  config, WebView code, and the CI pipeline.
- The ability to change these settings and add a config-lint gate.

## Procedure

1. **Secure the release build flags.** Ensure release builds are not `debuggable`,
   disable `allowBackup` (or exclude sensitive data from backup), and set a
   `minSdkVersion` that keeps modern platform defaults; strip debug logging.
2. **Minimize and permission component exports.** Set `exported="false"` on everything
   that doesn't need external access; for components that must be exported, require a
   signature-level permission and validate all incoming intents/URIs.
3. **Enforce a strict network security config.** Disallow cleartext
   (`cleartextTrafficPermitted=false`), do not trust user-added CAs, scope pins/domain
   configs; on iOS enforce App Transport Security with no blanket exceptions.
4. **Lock down WebViews.** Enable JavaScript only where required; avoid
   `addJavascriptInterface` with untrusted content (or restrict to `@JavascriptInterface`
   with a vetted API); disable file and universal access; load only trusted origins.
5. **Use private storage modes.** Create files with private modes (never
   `MODE_WORLD_*`), keep sensitive data in app-private storage (see
   `mobile-data-storage-hardening`), and scope FileProvider grants narrowly.
6. **Gate in CI.** Add a manifest/config lint (and a diff check) that fails the build
   on `debuggable`/`allowBackup` in release, a newly-exported component without a
   permission, cleartext-permitting config, or unsafe WebView flags.
7. **Baseline and review.** Keep a known-good configuration baseline and review it each
   release so secure defaults don't erode.

## Detection engineering notes

- The durable control is the **CI config gate**: individual settings drift, but a
  build-time check that fails on an insecure value turns a recurring manual review into
  an automatic block.
- Exported components and WebView bridges are the two settings that most often turn a
  misconfiguration into real code execution — treat any change to them as
  security-relevant.

## Paired offense / defense

Pairs with **mobile-security-misconfiguration**. Run that skill before and after: it
should first enumerate debuggable/backup, over-exported components, and cleartext, and
afterward find each set to its secure value with the CI gate blocking regressions.

## Validation

Reproduce against a test app you own:

1. Start from the demo app that is `debuggable`, over-exports an activity, and permits
   cleartext; confirm the paired skill finds all three.
2. Disable debug/backup, unexport/permission the component, enforce a no-cleartext
   network config, and add a CI config lint.
3. Re-run the paired skill and confirm the doors are closed, and that reintroducing a
   bad flag fails CI.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-PLATFORM and platform security-configuration guidance._

## References

- OWASP Mobile Top 10 (2024) M8 Security Misconfiguration
- OWASP MASVS-PLATFORM; MASTG platform-configuration tests
- Android manifest/exported-component, Network Security Config, WebView security docs;
  iOS App Transport Security
- MITRE D3FEND D3-ACH (Application Configuration Hardening), D3-EAL (Executable
  Allowlisting); ATT&CK T1626, T1420; CAPEC-1; CWE-16, CWE-926
