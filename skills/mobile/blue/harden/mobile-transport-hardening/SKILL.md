---
name: mobile-transport-hardening
description: >-
  Harden a mobile app's network transport so an adversary-in-the-middle on a hostile
  network cannot read or tamper with its traffic. Use when protecting an Android or
  iOS app: enforcing TLS for all connections, refusing cleartext and user-added CAs,
  pinning the backend certificate/public key, and validating certificates strictly.
  Pairs with the M5 Insecure Communication offense.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1638, T1557]
  capec: [CAPEC-94]
  cwe: [CWE-319, CWE-295]
  owasp: []
  d3fend: [D3-OTF, D3-PH]
pairs_with: [mobile-insecure-transport]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile transport hardening

## Overview

Because a mobile app runs on networks the attacker may control, transport hardening
assumes the network is hostile and pushes trust into the app itself: encrypt
everything, refuse to fall back to cleartext, don't trust CAs the user (or an
attacker with device access) added, and pin the specific backend key so a merely
"trusted" CA is not enough to impersonate it. This skill lays out the platform
controls — Android Network Security Config and iOS App Transport Security, plus
certificate/public-key pinning — that defeat the adversary-in-the-middle the paired
offense demonstrates.

## Authorization & scope

Defensive configuration and code review of an app your team owns. No interception of
user traffic; validate with seeded test accounts on a test network. Configuration
files and pinning material are not sensitive user data.

## Preconditions

- Access to the app source and platform config (Android `network_security_config`,
  iOS Info.plist ATS keys) and the ability to ship a build.
- The backend's certificate/public-key material and a rotation plan (primary +
  backup pins).
- A test device to verify with the paired offense skill.

## Procedure

1. **TLS everywhere, no cleartext.** Android: set `cleartextTrafficPermitted=
   "false"` in `network_security_config` and target a modern API level so cleartext
   is off by default. iOS: keep App Transport Security on with no blanket
   `NSAllowsArbitraryLoads` exception. Remove every `http://` endpoint.
2. **Do not trust user-added CAs.** Android: configure `<trust-anchors>` to include
   only `system` (exclude `user`) for your domains, so a proxy/malware CA can't
   decrypt. iOS: don't add exceptions that weaken validation.
3. **Pin the backend certificate / public key.** Pin the server's public key (SPKI)
   or certificate so only your backend's key is accepted, even if another trusted CA
   would otherwise validate. Ship a **backup pin** and a rotation runbook so pin
   rollover never bricks the app. On Android use `network_security_config`
   `<pin-set>` or a library (OkHttp `CertificatePinner`); on iOS pin in the URLSession
   delegate or via a vetted library.
4. **Validate strictly.** Reject expired/invalid/hostname-mismatched certificates and
   weak TLS versions/ciphers (TLS 1.2+); never disable certificate validation, even
   in debug builds that could ship.
5. **Defend the pinning itself.** Pinning is bypassable on a rooted/jailbroken device
   via Frida/objection — treat that as expected, combine with the other controls, and
   (where warranted) add tamper/root detection as defense-in-depth, not as the sole
   control.
6. **Continuously verify.** Add a CI/MASTG test that fails if a build permits
   cleartext, trusts user CAs, or drops pinning, and monitor pin-expiry so rotation
   happens before certificates change.

## Detection engineering notes

- The two load-bearing controls are **no user-CA trust** and **key pinning**:
  together they mean a MITM needs your actual backend key, not just any CA the device
  trusts. TLS-only and strict validation close the cleartext and bad-cert paths.
- Plan pin rotation before you pin: a shipped app with an expired-only pin and no
  backup is an outage. Always ship primary + backup pins.

## Paired offense / defense

Pairs with **mobile-insecure-transport**. Run that skill before and after: beforehand
its proxy reads credentials via cleartext, user-CA trust, or missing pinning; after
hardening the same MITM setup cannot decrypt or tamper with the app's traffic without
a bypass that itself requires a rooted device.

## Validation

Reproduce against a test app you own:

1. Start from the demo app with an `http://` endpoint and no pinning; confirm the
   paired skill intercepts credentials.
2. Enforce TLS-only, exclude user CAs, and add SPKI pinning with a backup pin.
3. Re-run the paired skill and confirm the proxy can no longer decrypt (without a
   device-level pinning bypass), while the app's normal traffic still works.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-NETWORK and platform transport-security guidance._

## References

- OWASP Mobile Top 10 M5 Insecure Communication; OWASP MASVS-NETWORK; MASTG network tests
- Android Network Security Configuration & pin-set; Apple App Transport Security; OWASP Certificate & Public Key Pinning
- MITRE D3FEND D3-OTF (Outbound Traffic Filtering), D3-PH (Platform Hardening)
- MITRE ATT&CK Mobile T1638, T1557; CWE-319, CWE-295; CAPEC-94
