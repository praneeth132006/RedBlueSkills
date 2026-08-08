---
name: mobile-hardcoded-secrets
description: >-
  Extract hardcoded secrets from a mobile app binary during an authorized mobile
  assessment. Use when you have an APK/AAB/IPA and need to prove that API keys,
  cloud credentials, signing/crypto keys, backend URLs, or third-party tokens are
  embedded in the shipped binary or its resources — recoverable by static analysis
  because a mobile app is client-side code the attacker fully controls. Maps to
  OWASP Mobile Top 10 M1 Improper Credential Usage / M7 Insufficient Binary
  Protections (MASVS-CODE / MASVS-RESILIENCE).
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: recon
techniques:
  attack: [T1552.001, T1406]
  capec: [CAPEC-37, CAPEC-191]
  cwe: [CWE-798, CWE-321]
  owasp: []
  d3fend: []
pairs_with: [mobile-secrets-hardening]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile hardcoded secrets

## Overview

A mobile app ships to every user as a fully attacker-controlled artifact: whatever
key, credential, or endpoint is compiled into the APK/IPA can be recovered by anyone
who downloads it. Developers routinely embed third-party API keys, cloud access
keys, backend hostnames, encryption keys, and "secret" auth constants directly in
code, resources, or native libraries — treating obfuscation as protection. This
skill statically extracts those embedded secrets from a build you are authorized to
assess and characterizes their blast radius (what the key unlocks), demonstrating
why secrets must live server-side and client keys must be scoped and revocable.

## Authorization & scope

**Run only against an app build you are explicitly authorized to assess**, obtained
through a legitimate channel. Prove recoverability and identify the *class* and
*scope* of each secret; do **not** use recovered credentials to access third-party
or production services beyond a single, in-scope validation of whether the key is
live (where the rules of engagement allow it). Redact recovered key material to a
fingerprint (provider, key type, prefix, scope) in the report — the finding is "a
live provider key is extractable from the binary", not the key itself. Report
exposed live keys promptly so they can be rotated.

## Preconditions

- The app package (`.apk`/`.aab`/`.ipa`) from an authorized source.
- Static tooling: `apktool`/`jadx`/`dex2jar` (Android), `class-dump`/Hopper/Ghidra
  and `unzip`/`plutil` (iOS), plus `strings` and a secret-scanning ruleset
  (gitleaks/trufflehog-style regexes).
- A safe place to record findings without storing live secrets.

## Procedure

1. **Unpack the binary.** Decode resources and decompile code:
   ```bash
   # Android
   apktool d app.apk -o app_src
   jadx -d app_jadx app.apk        # Java/Kotlin sources + resources
   # iOS
   unzip -o app.ipa -d app_ipa     # Payload/<App>.app/ contains the Mach-O + resources
   ```
2. **Scan strings and resources for secret patterns.** Look across smali/Java,
   `res/`, `assets/`, `strings.xml`, `Info.plist`, embedded `.json`/`.plist`, and
   native `.so`/Mach-O:
   ```bash
   grep -rniE 'api[_-]?key|secret|token|password|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|-----BEGIN' app_src app_jadx
   strings -n 8 app_ipa/Payload/*.app/* | grep -iE 'AKIA|AIza|sk_live|bearer|BEGIN (RSA|EC) PRIVATE'
   ```
3. **Check the usual high-value locations.** Android `AndroidManifest.xml`
   `meta-data`, `BuildConfig`, `google-services.json`, `local.properties` leftovers;
   iOS `Info.plist`, entitlements, embedded config plists, and hardcoded constants in
   the Mach-O.
4. **Classify each hit.** Determine provider and key type (e.g. cloud access key,
   maps/analytics key, payment/publishable vs. secret key, Firebase config) and
   whether it is a client-safe identifier or a true secret that should never ship.
5. **Assess blast radius from scope, not by abusing it.** Determine what the key
   *could* do from the provider's key model and any visible scopes/restrictions;
   only confirm liveness with a single, in-scope, read-only check if the rules of
   engagement permit, then stop.
6. **Record** each secret as (provider, key type, location in binary, client-safe or
   not, live?), plus the fix: remove server-side secrets from the client, scope and
   restrict any client keys, rotate anything exposed, and add binary secret-scanning
   to CI.

## Paired defense / offense

Pairs with **mobile-secrets-hardening**. Each embedded credential this skill
recovers is what that skill eliminates — moving true secrets to the backend, using
only scoped/restricted client keys, adding key restrictions and rotation, and
gating releases on a binary secret scan. Re-run this skill on the hardened build to
confirm no live server-side secret remains extractable.

## Validation

Reproduce against a test app you own:

1. Build a demo app that embeds a (revocable, test-only) API key in `strings.xml`
   / `Info.plist` and a hardcoded auth constant in code.
2. Unpack with `apktool`/`jadx` (or `unzip` for iOS) and recover the key and
   constant with a secret-scan grep.
3. Apply the paired hardening (remove the secret, restrict the client key, add a CI
   scan) and confirm the rebuilt binary yields no live secret.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASTG code-quality / reverse-engineering test procedures._

## References

- OWASP Mobile Top 10 M1 Improper Credential Usage, M7 Insufficient Binary Protections
- OWASP MASVS-CODE / MASVS-RESILIENCE; MASTG static analysis & secret-scanning tests
- MITRE ATT&CK: T1552.001 Credentials In Files; ATT&CK Mobile T1406 Obfuscated Files or Information
- CAPEC-37, CAPEC-191 Read Sensitive Constants Within an Executable; CWE-798, CWE-321
