---
name: mobile-insecure-data-storage
description: >-
  Recover sensitive data a mobile app leaves on the device during an authorized
  mobile assessment. Use when you have a debuggable build (or a rooted/jailbroken
  test device) and need to prove that credentials, session tokens, PII, or crypto
  keys are written to app-private storage, shared preferences/UserDefaults,
  SQLite/Core Data, caches, logs, or backups in cleartext or with recoverable
  protection — the classic "lost/stolen device" and malicious-app exposure. Maps
  to OWASP Mobile Top 10 M9 Insecure Data Storage / MASVS-STORAGE.
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: collection
techniques:
  attack: [T1409, T1533]
  capec: [CAPEC-37]
  cwe: [CWE-312, CWE-922, CWE-311]
  owasp: []
  d3fend: []
pairs_with: [mobile-data-storage-hardening]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile insecure data storage

## Overview

Mobile apps persist state locally for speed and offline use, and the platform
sandbox (app-private directories, the iOS Keychain, Android Keystore) is often
treated as if it were a vault. It is not: a lost or stolen device, a device backup,
an ADB-enabled or jailbroken phone, or a co-resident malicious app can all reach
data that was written without encryption or with encryption whose key never leaves
the device. This skill enumerates every place an app writes data and proves whether
sensitive values — auth tokens, passwords, PANs, PII, or crypto keys — are
recoverable at rest, demonstrating the exposure so storage can be moved to
hardware-backed encryption and secrets kept out of world- and backup-readable
locations.

## Authorization & scope

**Run only against an app and a test device you are explicitly authorized to
assess.** Use a dedicated test account and seeded, non-production data — never real
user data or someone else's device. The finding is "class of secret X is
recoverable from location Y at rest", not the secret material: redact recovered
tokens/PII to a fingerprint (type, length, storage path, protection class) in the
report. Do not exfiltrate the data store off the test device beyond what is needed
to demonstrate the flaw, and delete any pulled copies when the assessment closes.

## Preconditions

- The app installed on a test device or emulator you control, ideally a debuggable
  build; otherwise a rooted (Android) / jailbroken (iOS) test device to read
  app-private storage.
- Tooling: `adb` + platform tools (Android), a jailbroken device with SSH or a
  Frida host (iOS), and a SQLite/plist/keychain reader.
- A seeded test account so you can drive the app into writing session tokens, PII,
  and cached responses, then inspect what landed on disk.

## Procedure

1. **Exercise the app, then snapshot storage.** Log in, browse, and cache data with
   the test account, then pull the app's private directory:
   ```bash
   # Android — app-private data (debuggable build or rooted device)
   adb exec-out run-as com.example.app tar c -C /data/data/com.example.app . \
     > appdata.tar
   # or the backup path if android:allowBackup="true"
   adb backup -f app.ab com.example.app
   ```
   On iOS, pull the app container from a jailbroken test device (`/var/mobile/
   Containers/Data/Application/<UUID>/`) over SSH, or use a Frida script to dump
   `NSUserDefaults` and the app sandbox.
2. **Grep the obvious cleartext stores.** Inspect shared preferences / UserDefaults,
   flat files, and caches for tokens, passwords, and PII:
   ```bash
   # Android
   find . -name '*.xml' -path '*shared_prefs*' -exec cat {} +
   grep -rniE 'token|password|secret|bearer|authorization|"pan"|ssn' .
   ```
   iOS: read `Library/Preferences/*.plist` and any app plists/JSON caches.
3. **Open the structured stores.** Dump SQLite / Core Data databases and Realm files
   and look at what is stored unencrypted:
   ```bash
   sqlite3 databases/app.db '.tables'
   sqlite3 databases/app.db 'SELECT * FROM sessions LIMIT 5;'
   ```
4. **Check the "secure" stores are actually keyed to hardware.** Confirm whether the
   Keychain items use an appropriate protection class
   (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, not `Always`) and whether
   Android Keystore keys require user auth / are `StrongBox`-backed — a token in the
   Keychain with `Always` accessibility is still readable on a locked, stolen device.
5. **Check backups and logs.** Confirm whether sensitive data survives into
   iTunes/iCloud or `adb backup` archives (backup flag not excluded) and whether the
   app writes secrets to `logcat`/`NSLog`/crash logs.
6. **Record** each recovered secret class as (type, storage location, protection
   class, cleartext yes/no), plus the fix: encrypt at rest with a hardware-backed
   key, use the Keychain/Keystore with the strictest workable accessibility, exclude
   secrets from backups, and stop logging sensitive values.

## Paired defense / offense

Pairs with **mobile-data-storage-hardening**. Every cleartext store this skill
recovers — a token in shared prefs, PII in an unencrypted SQLite table, a secret in
a backup archive — is exactly what that skill removes by moving secrets into
hardware-backed Keychain/Keystore storage with correct accessibility, encrypting
local databases, and excluding sensitive data from backups and logs. Re-run this
skill after hardening to confirm the values are no longer recoverable at rest.

## Validation

Reproduce against a test app you own:

1. Build a demo app that writes a session token to shared prefs / `NSUserDefaults`
   and PII to an unencrypted SQLite table, and enables `allowBackup`.
2. Drive it with a seeded account, pull the app container / backup, and recover the
   token and PII in cleartext.
3. Apply the paired hardening (Keychain/Keystore, encrypted DB, backup exclusion),
   re-pull, and confirm the values are no longer readable.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed for correctness against OWASP MASTG storage test procedures._

## References

- OWASP Mobile Top 10: M9 Insecure Data Storage; OWASP MASVS-STORAGE; MASTG storage tests
- MITRE ATT&CK Mobile: T1409 Access Stored Application Data; T1533 Data from Local System
- Apple Keychain accessibility classes; Android Keystore / EncryptedSharedPreferences
- CAPEC-37 Retrieve Embedded Sensitive Data; CWE-312, CWE-922, CWE-311
