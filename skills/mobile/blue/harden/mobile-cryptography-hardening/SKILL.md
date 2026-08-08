---
name: mobile-cryptography-hardening
description: >-
  Use cryptography correctly in a mobile app against OWASP Mobile Top 10 M10. Use when
  replacing weak or broken crypto in an Android or iOS app with modern, authenticated,
  hardware-backed schemes: AES-GCM/ChaCha20-Poly1305, Keystore/Keychain-managed keys,
  per-message random IVs/nonces, standard KDFs and strong hashes, and no home-grown
  algorithms — so protected data stays protected.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1552.001, T1475]
  capec: [CAPEC-97]
  cwe: [CWE-327, CWE-326]
  owasp: []
  d3fend: [D3-DENCR, D3-ACH]
pairs_with: [mobile-weak-cryptography]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile cryptography hardening

## Overview

Good mobile cryptography is almost entirely about **using standard, modern primitives
correctly and letting the platform manage the keys** — the failures in M10 come from
weak algorithms, wrong modes, and keys the app itself can leak. This skill sets four
rules: **modern authenticated primitives** (AES-GCM or ChaCha20-Poly1305 for
confidentiality+integrity; SHA-256+ for hashing; Argon2/PBKDF2/scrypt for password
derivation), **hardware-backed keys** (generate and use keys in the Android Keystore /
iOS Keychain/Secure Enclave so the app never handles raw key material), **correct
parameters** (a fresh random IV/nonce per message from a CSPRNG, adequate key sizes,
OAEP for RSA), and **no custom crypto** (never invent a scheme; use vetted libraries).
It makes the data the paired offense recovered actually unrecoverable.

## Authorization & scope

Defensive configuration of an app your team owns. Reviewing crypto may reveal key
handling and sensitive data — handle under your data-handling policy. No testing of
third-party apps.

## Preconditions

- Access to the app source and its cryptographic code paths, and the platform keystore
  APIs.
- A migration path to re-encrypt any data currently protected with a weak scheme.

## Procedure

1. **Replace weak algorithms and modes.** Remove DES/3DES/RC4, MD5/SHA-1 (for
   integrity), and AES-ECB/unauthenticated modes; standardize on AES-GCM or
   ChaCha20-Poly1305 for encryption and SHA-256+ for hashing.
2. **Use hardware-backed keys.** Generate keys in the Android Keystore / iOS Keychain
   or Secure Enclave with appropriate access control (require user authentication for
   the most sensitive keys); never hardcode keys or derive them from device values an
   attacker also has.
3. **Get parameters right.** Use a fresh, random IV/nonce per message from a CSPRNG
   (`SecureRandom`/`SecRandomCopyBytes`), never a static/reused IV; use adequate key
   sizes (AES-256, RSA-3072/OAEP or prefer ECC); use AEAD so ciphertext is
   authenticated.
4. **Derive password-based keys properly.** Use Argon2id/scrypt/PBKDF2 with a random
   salt and strong parameters for any key derived from a user secret; never a bare hash.
5. **Use vetted libraries, not custom crypto.** Prefer Tink / Jetpack Security /
   CryptoKit / libsodium over hand-rolled constructions; keep libraries updated.
6. **Migrate existing data.** Re-encrypt data currently under a weak scheme during a
   controlled migration and invalidate the old keys/ciphertext.
7. **Gate in CI.** Add a static check that flags banned algorithms/modes, `Random` used
   for crypto, hardcoded keys, and `Cipher.getInstance` calls without an authenticated
   mode.

## Detection engineering notes

- **Keystore-backed keys + AEAD** together neutralize the two most common M10 wins at
  once: the key is never in the app's memory to recover, and the ciphertext can't be
  silently tampered.
- A **CI ban-list for weak crypto APIs** is the durable control — crypto mistakes are
  easy to reintroduce and cheap to catch statically at the call site.

## Paired offense / defense

Pairs with **mobile-weak-cryptography**. Run that skill before and after: it should
first recover a key/mode and decrypt or forge a test value, and afterward find the data
under AES-GCM with a Keystore-backed key and random IV, defeating the recover-and-
decrypt approach.

## Validation

Reproduce against a test app you own:

1. Start from the demo app that encrypts a test token with AES-ECB and a hardcoded key;
   confirm the paired skill decrypts it.
2. Switch to AES-GCM with a Keystore-generated key and a per-message random IV, and add
   a CI ban-list for weak APIs.
3. Re-run the paired skill and confirm the recovered-key/ECB path no longer decrypts the
   data, and that reintroducing ECB/`Random` fails CI.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-CRYPTO and platform key-management guidance._

## References

- OWASP Mobile Top 10 (2024) M10 Insufficient Cryptography
- OWASP MASVS-CRYPTO; MASTG cryptography tests; NIST SP 800-131A, SP 800-175B
- Google Tink / Jetpack Security; Android Keystore; Apple CryptoKit / Keychain / Secure
  Enclave; libsodium
- MITRE D3FEND D3-DENCR (Disk Encryption), D3-ACH (Application Configuration
  Hardening); ATT&CK T1552.001, T1475; CAPEC-97; CWE-327, CWE-326
