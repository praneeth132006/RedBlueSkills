---
name: mobile-data-storage-hardening
description: >-
  Harden how a mobile app stores data at rest so a lost, stolen, backed-up, or
  rooted/jailbroken device does not leak credentials, tokens, or PII. Use when
  protecting an Android or iOS app: moving secrets into hardware-backed
  Keychain/Keystore with the strictest workable accessibility, encrypting local
  databases and files, excluding sensitive data from backups, and stopping secrets
  from reaching logs and caches. Pairs with the M9 Insecure Data Storage offense.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1409, T1533]
  capec: [CAPEC-37]
  cwe: [CWE-312, CWE-922, CWE-311]
  owasp: []
  d3fend: [D3-ACH, D3-PH]
pairs_with: [mobile-insecure-data-storage]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile data-storage hardening

## Overview

Local storage is defended by assuming the device itself is hostile: encrypt every
sensitive value at rest with a key the app never sees in cleartext, keep that key in
hardware (Secure Enclave / StrongBox / TEE), and make sure nothing sensitive escapes
into backups, logs, or caches where the sandbox no longer protects it. This skill
walks the concrete controls for Android and iOS that neutralize the "recover secrets
from a pulled app container" attack: the right secure-storage API, the right
accessibility/authentication class, encrypted databases, backup exclusions, and log
hygiene.

## Authorization & scope

Defensive configuration and code review of an app your team owns. Reviewing storage
code and test-device containers may surface real secrets — handle any recovered
values under your normal data-handling policy and use seeded test data when
validating. No testing of third-party apps or devices.

## Preconditions

- Access to the app source and build configuration (Android `Manifest`/Gradle, iOS
  entitlements/Info.plist) and the ability to change storage code.
- An inventory of what the app persists and which values are sensitive
  (credentials, tokens, PII, crypto keys).
- A test device to verify the controls with the paired offense skill.

## Procedure

1. **Put secrets in hardware-backed secure storage.** iOS: store tokens/keys in the
   **Keychain** with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` (or
   `...AfterFirstUnlockThisDeviceOnly` only where background access is required) and
   generate keys in the **Secure Enclave** where possible. Android: use the
   **Keystore** (prefer `StrongBox`), require user authentication for high-value
   keys, and use `EncryptedSharedPreferences`/Jetpack Security for key-value data.
2. **Never store what you can avoid.** Don't persist passwords at all; hold session
   tokens only as long as needed and clear them on logout; prefer short-lived tokens
   refreshed from the backend over long-lived local secrets.
3. **Encrypt structured local data.** Use SQLCipher (or platform encrypted DB) for
   SQLite/Room, and encrypt Realm/Core Data stores, with the key wrapped by
   Keystore/Keychain — not embedded in the app.
4. **Exclude sensitive data from backups.** Android: set `android:allowBackup=
   "false"` or use `fullBackupContent`/`dataExtractionRules` to exclude secret files
   and the encrypted DB. iOS: set the "do not back up" resource attribute on
   sensitive files and never place secrets in iCloud-synced containers.
5. **Stop leaking to logs and caches.** Remove secrets from `logcat`/`NSLog`/crash
   reports, disable verbose logging in release builds, and mark sensitive views to
   avoid screenshot/snapshot caching (`FLAG_SECURE` on Android; blur the iOS app
   snapshot on background).
6. **Continuously verify.** Add a CI check / MASTG-based test that fails the build if
   a token or PII string is found in shared prefs, an unencrypted DB, or a backup
   archive of a test run.

## Detection engineering notes

- The strongest preventive control is a **hardware-bound key with device-only
  accessibility**: even a full container pull off a stolen device yields ciphertext
  whose key cannot leave that device.
- Backup and log exposure are the most commonly missed paths — a perfectly
  Keychain-stored token still leaks if the same value is written to a log line or an
  unexcluded backup file.

## Paired offense / defense

Pairs with **mobile-insecure-data-storage**. Run that skill before and after this
one: beforehand it recovers tokens/PII from shared prefs, an unencrypted DB, and a
backup archive; after hardening, the same container pull yields only ciphertext, the
backup excludes the secret files, and the logs are clean.

## Validation

Reproduce against a test app you own:

1. Start from the demo app that stores a token in shared prefs and PII in a plaintext
   SQLite table with backups enabled; confirm the paired skill recovers them.
2. Apply hardware-backed Keychain/Keystore storage, an encrypted DB, backup
   exclusions, and log scrubbing.
3. Re-run the paired skill and confirm no sensitive value is recoverable at rest and
   nothing sensitive survives into a backup or log.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-STORAGE and platform secure-storage guidance._

## References

- OWASP MASVS-STORAGE; OWASP Mobile Top 10 M9; OWASP MASTG storage & backup tests
- Apple Keychain / Secure Enclave; Android Keystore, StrongBox, Jetpack Security EncryptedSharedPreferences
- MITRE D3FEND D3-ACH (Application Configuration Hardening), D3-PH (Platform Hardening)
- MITRE ATT&CK Mobile T1409, T1533; CWE-312, CWE-922, CWE-311; CAPEC-37
