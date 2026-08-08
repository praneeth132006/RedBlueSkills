---
name: mobile-weak-cryptography
description: >-
  Demonstrate Insufficient Cryptography (OWASP Mobile Top 10 M10) during an authorized
  mobile assessment — showing that an app's use of cryptography fails to protect data:
  weak or broken algorithms (DES, RC4, MD5/SHA-1, ECB mode), hardcoded/derivable keys,
  static IVs and predictable nonces, home-grown "encryption," and keys stored outside
  the hardware keystore. Use to prove that data the app treats as protected can be
  recovered because the cryptography — not just the key storage — is inadequate.
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: credential-access
techniques:
  attack: [T1552.001, T1475]
  capec: [CAPEC-97, CAPEC-475]
  cwe: [CWE-327, CWE-326]
  owasp: []
  d3fend: []
pairs_with: [mobile-cryptography-hardening]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile weak cryptography

## Overview

Mobile apps constantly reach for cryptography — to protect stored tokens, encrypt a
local cache, sign a request, obfuscate a value — and **insufficient cryptography**
(M10) is when that reach fails to actually protect anything: a broken or deprecated
algorithm (DES/3DES, RC4, MD5/SHA-1 for integrity, RSA with tiny keys), an insecure
mode (AES-ECB, which leaks structure; no authentication), a hardcoded or trivially
derivable key, a static IV or reused nonce, or a custom scheme that only looks like
encryption. This skill demonstrates, on an app you are authorized to assess, that a
value the app treats as cryptographically protected can be recovered or forged because
the primitive, mode, or key management is weak — distinct from (but often alongside)
insecure storage.

## Authorization & scope

**Run only against an app you are explicitly authorized to assess**, on a device/
emulator you own, using **test data**. Prove the *weakness class* (e.g. "AES-ECB with a
hardcoded key recovers the cached token") against test values; do **not** decrypt real
users' data or use recovered keys against production. Redact any recovered key to a
fingerprint in the report. Report weak algorithms/keys promptly so they can be replaced
and data re-encrypted.

## Preconditions

- The app package and/or the app on a device/emulator you own, with test data present.
- Tooling: `apktool`/`jadx` (find crypto calls & keys), `openssl`/a scripting env to
  reproduce the scheme, and access to the app's encrypted files/prefs for a decrypt PoC.

## Procedure

1. **Locate cryptographic use.** Grep the decompiled app for crypto APIs and their
   parameters — `Cipher.getInstance(...)`, `MessageDigest`, `SecretKeySpec`,
   `IvParameterSpec`, `SecureRandom` vs. `Random`, and any custom routines:
   ```bash
   grep -rniE 'Cipher\.getInstance|SecretKeySpec|IvParameterSpec|DES|RC4|MD5|SHA-?1|ECB' app_jadx
   ```
2. **Judge the primitive and mode.** Flag deprecated/broken algorithms and insecure
   modes: DES/3DES/RC4, MD5/SHA-1 used for integrity, `AES/ECB`, unauthenticated CBC,
   RSA without OAEP, and hashing without salt for password storage.
3. **Find the key and IV.** Determine where the key comes from — hardcoded constant,
   derived from a device value an attacker also has, or a proper Keystore-backed key —
   and whether the IV/nonce is static or reused.
4. **Reproduce a decrypt/forge (test data).** Using the recovered algorithm + key,
   decrypt an app-encrypted **test** value or forge a signed value, proving the
   protection is ineffective:
   ```bash
   # illustrative: AES-ECB with a recovered hardcoded key over a test ciphertext
   openssl enc -d -aes-128-ecb -K <recovered-hex-key> -in cache.bin -out plain.txt
   ```
5. **Check integrity/authentication.** Note whether encrypted data is authenticated
   (AEAD/GCM or encrypt-then-MAC) or malleable, and whether "signatures" use adequate
   algorithms and verified keys.
6. **Record** each weakness (algorithm, mode, key source, IV/nonce, authenticated?),
   the recovered/forged test result, and the fix: use modern authenticated primitives
   (AES-GCM/ChaCha20-Poly1305), Keystore/Keychain-managed keys, per-message random
   IVs/nonces, and standard KDFs — never custom crypto.

## Paired defense / offense

Pairs with **mobile-cryptography-hardening**. Each weak primitive, hardcoded key, and
static IV this skill exploits is what that skill replaces with a modern, authenticated,
hardware-backed scheme — after which the same decrypt/forge attempt fails.

## Validation

Reproduce against a test app you own:

1. Build a demo app that encrypts a test token with AES-ECB using a hardcoded key.
2. Recover the key and mode from the decompiled app and decrypt the token with
   `openssl`.
3. Apply the paired hardening (AES-GCM with a Keystore-backed key and random IV) and
   confirm the recovered-key/ECB approach no longer decrypts the data.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-CRYPTO and MASTG cryptography test procedures._

## References

- OWASP Mobile Top 10 (2024) M10 Insufficient Cryptography
- OWASP MASVS-CRYPTO; MASTG cryptography tests; NIST SP 800-131A (algorithm
  transitions), SP 800-175B
- Android Keystore / Jetpack Security; iOS Keychain & CryptoKit
- MITRE ATT&CK T1552.001, ATT&CK Mobile T1475 Deliver Malicious App via Authorized
  Channel (context); CAPEC-97, CAPEC-475; CWE-327, CWE-326
