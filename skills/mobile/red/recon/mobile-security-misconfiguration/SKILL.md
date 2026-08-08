---
name: mobile-security-misconfiguration
description: >-
  Demonstrate Security Misconfiguration (OWASP Mobile Top 10 M8) during an authorized
  mobile assessment — finding insecure platform and app configuration that weakens an
  otherwise-sound app: debuggable/backup-enabled builds, exported components with weak
  or missing permissions, cleartext-traffic and permissive network security config,
  weak WebView settings (JS bridges, file access), and world-readable file modes. Use
  to inventory the misconfigurations that expand a mobile app's attack surface.
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: recon
techniques:
  attack: [T1626, T1420]
  capec: [CAPEC-1, CAPEC-121]
  cwe: [CWE-16, CWE-926]
  owasp: []
  d3fend: []
pairs_with: [mobile-misconfiguration-hardening]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile security misconfiguration

## Overview

Even an app with sound logic and crypto can be undone by **insecure default or
leftover configuration** (M8): a `debuggable`/`allowBackup` production build, an
Android component (`activity`/`service`/`provider`/`receiver`) exported without a
proper permission, a network security config that allows cleartext or trusts
user-added CAs, a WebView with JavaScript + `addJavascriptInterface` + file access
enabled, or files created world-readable. Each of these is a small door another
component — or another app on the device — can walk through. This skill inventories,
on an app you are authorized to assess, the platform and app misconfigurations that
expand its attack surface, so they can be corrected.

## Authorization & scope

**Run only against an app you are explicitly authorized to assess**, on a device/
emulator you own. Enumerate configuration and demonstrate *reachability* (an exported
component responds, cleartext is allowed) with benign markers; do **not** use an
exported component to corrupt real data or pivot into out-of-scope systems. Report the
misconfigurations and their impact.

## Preconditions

- The app package and/or the app installed on a device/emulator you own.
- Tooling: `apktool`/`aapt`/`jadx` (manifest & config inspection), `adb` (component
  interaction, file modes), and a proxy to observe cleartext.

## Procedure

1. **Inspect the manifest / build flags.** Check for `android:debuggable="true"`,
   `android:allowBackup="true"`, missing `networkSecurityConfig`, and a low
   `minSdkVersion` that disables modern defaults; on iOS check `ATS` exceptions in
   `Info.plist`.
2. **Enumerate exported components.** List `activity`/`service`/`provider`/`receiver`
   with `exported="true"` (or an intent-filter implying export) and no/weak permission,
   and test benign reachability:
   ```bash
   aapt dump xmltree app.apk AndroidManifest.xml | grep -A3 -i 'exported\|permission'
   adb shell am start -n com.example/.ExportedActivity   # does it launch from outside?
   adb shell content query --uri content://com.example.provider/  # exported provider?
   ```
3. **Check network security config.** Determine whether cleartext HTTP is permitted
   (`cleartextTrafficPermitted`), whether user-added CAs are trusted, and whether pins/
   domain configs are present; confirm by observing a cleartext request through your
   proxy.
4. **Review WebView configuration.** Look for `setJavaScriptEnabled(true)` combined with
   `addJavascriptInterface`, `setAllowFileAccess`/`setAllowUniversalAccessFromFileURLs`,
   and loading of untrusted content — a classic RCE/bridge-abuse surface.
5. **Check file & storage modes.** Identify files created `MODE_WORLD_READABLE/WRITABLE`
   or in shared/world-accessible locations (overlaps with M9 storage), and permissive
   FileProvider paths.
6. **Record** each misconfiguration (setting, location, what it exposes, reachable from
   where) and the fix: disable debug/backup in release, export only what must be with a
   signature-level permission, enforce a strict network security config (no cleartext,
   no user CAs), lock down WebView settings, and use private file modes.

## Paired defense / offense

Pairs with **mobile-misconfiguration-hardening**. Each exposed setting this skill finds
— debuggable/backup, over-exported component, cleartext-permitting config, unsafe
WebView, world-readable file — is what that skill sets to a secure value and gates in
CI.

## Validation

Reproduce against a test app you own:

1. Build a demo app that is `debuggable`, exports an activity without a permission, and
   permits cleartext traffic.
2. Enumerate the flags, launch the exported component from `adb`, and observe a
   cleartext request in your proxy.
3. Apply the paired hardening (disable debug/backup, add a permission / unexport,
   enforce a no-cleartext network config) and confirm each door is closed.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-PLATFORM and MASTG platform-interaction test procedures._

## References

- OWASP Mobile Top 10 (2024) M8 Security Misconfiguration
- OWASP MASVS-PLATFORM; MASTG platform-interaction & network tests
- Android manifest/exported-component, Network Security Config, and WebView security
  docs; iOS App Transport Security
- MITRE ATT&CK Mobile T1626 Abuse Elevation Control, T1420 File and Directory
  Discovery; CAPEC-1, CAPEC-121; CWE-16, CWE-926
