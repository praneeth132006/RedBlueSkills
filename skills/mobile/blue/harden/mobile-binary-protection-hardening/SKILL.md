---
name: mobile-binary-protection-hardening
description: >-
  Add binary protections and, above all, remove client-side trust against OWASP
  Mobile Top 10 M7. Use when hardening an Android or iOS app so tampering and runtime
  instrumentation are costly and — critically — pointless: enforcing security
  decisions server-side, adding integrity/tamper detection and platform attestation,
  and layering obfuscation, anti-debugging, and anti-hooking as defense-in-depth.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1407, T1633.001]
  capec: [CAPEC-208]
  cwe: [CWE-693, CWE-919]
  owasp: []
  d3fend: [D3-PSMD, D3-EAL]
pairs_with: [mobile-binary-tampering]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile binary protection hardening

## Overview

The device is the attacker's, so the first rule is **never let a client-side check be
the only thing protecting an asset** — every real security decision (auth, entitlement,
fraud, data access) must be enforced server-side, where the attacker can't patch it.
Binary protections are the *second* layer: they don't make the client trustworthy,
they raise the cost of tampering and give you a tamper signal. This skill hardens on
two levels: **trust placement** (move security logic to the backend; use platform
integrity attestation so the server can gauge client integrity) and **resistance**
(integrity/tamper self-checks, code obfuscation, anti-debugging, and anti-hooking to
slow reverse engineering). It neutralizes M7 bypasses by making them either detectable
or worthless.

## Authorization & scope

Defensive configuration of an app your team owns. Reviewing protections may reveal
security-sensitive logic — handle under your data-handling policy. No testing of
third-party apps.

## Preconditions

- Access to the app source, build/obfuscation configuration, and the backend that
  serves the app.
- The ability to move security checks server-side and to integrate platform
  attestation.

## Procedure

1. **Move trust server-side.** Enforce authentication, authorization, entitlements,
   pricing/feature gating, and fraud decisions on the backend; treat every value from
   the client as untrusted input. A patched client should not be able to grant itself
   anything.
2. **Add platform integrity attestation.** Integrate Play Integrity (Android) / App
   Attest & DeviceCheck (iOS) so the backend receives a signal about device and app
   integrity it can factor into risk decisions — a signal the client cannot forge.
3. **Add tamper/integrity self-checks.** Verify the app's own signature/installer and
   detect repackaging; fail safe (degrade or refuse sensitive operations) on tamper —
   as defense-in-depth, not as the sole gate.
4. **Obfuscate and strip.** Enable R8/ProGuard (Android) and strip symbols/debug info
   (iOS) to raise reverse-engineering cost; keep the mapping files secured for crash
   symbolication.
5. **Resist dynamic instrumentation.** Add anti-debugging and anti-hooking/Frida
   detection where the threat model warrants, understanding these are speed bumps a
   determined attacker on their own device can eventually pass.
6. **Keep pinning, but don't over-rely.** Maintain certificate pinning for transport
   integrity (see `mobile-transport-hardening`) while recognizing an instrumented
   client can bypass it — so the backstop remains server-side authorization.
7. **Monitor tamper signals.** Feed attestation/integrity/tamper results into backend
   risk scoring and alert on anomalous volumes of failed attestation.

## Detection engineering notes

- The **load-bearing control is server-side enforcement**: it makes a fully cracked
  client unable to obtain the protected asset, which is the only durable answer to a
  device the attacker owns.
- **Attestation beats self-checks** because it can't be patched out on the client — a
  self-check runs in the same binary the attacker is already modifying.

## Paired offense / defense

Pairs with **mobile-binary-tampering**. Run that skill before and after: it should
first trivially defeat client-side checks, and afterward find that the bypass no
longer yields the asset (server-side enforcement) and that tampering is detected by
attestation/integrity checks.

## Validation

Reproduce against a test app you own:

1. Start from the demo app whose client-side check the paired skill defeats and that
   trusts the client result.
2. Move the decision server-side, add attestation and an integrity self-check, and
   enable obfuscation/anti-hooking.
3. Re-run the paired skill and confirm the patched/hooked client no longer gains the
   asset and the tamper is detected.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-RESILIENCE and platform attestation guidance._

## References

- OWASP Mobile Top 10 (2024) M7 Insufficient Binary Protections
- OWASP MASVS-RESILIENCE; MASTG anti-tampering & anti-reversing tests
- Google Play Integrity API; Apple App Attest / DeviceCheck; R8/ProGuard
- MITRE D3FEND D3-PSMD (Process Self-Modification Detection), D3-EAL (Executable
  Allowlisting); ATT&CK T1407, T1633.001; CAPEC-208; CWE-693, CWE-919
