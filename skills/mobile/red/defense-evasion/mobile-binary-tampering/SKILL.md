---
name: mobile-binary-tampering
description: >-
  Demonstrate Insufficient Binary Protections (OWASP Mobile Top 10 M7) during an
  authorized mobile assessment — bypassing an app's client-side defenses by patching
  the binary or hooking it at runtime: defeating root/jailbreak detection, disabling
  certificate pinning, patching license/feature or auth checks, and instrumenting the
  app with Frida. Use to prove that logic and checks enforced only on the client can be
  removed, so security decisions must not rely on the integrity of client-side code.
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: defense-evasion
techniques:
  attack: [T1407, T1633.001]
  capec: [CAPEC-208, CAPEC-660]
  cwe: [CWE-693, CWE-919]
  owasp: []
  d3fend: []
pairs_with: [mobile-binary-protection-hardening]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile binary tampering

## Overview

A mobile app runs entirely on a device the attacker controls, so any check the app
enforces on itself — root/jailbreak detection, certificate pinning, anti-debugging,
license/feature gating, a client-side auth or fraud check — can in principle be
removed by patching the binary or hooking it at runtime. **Insufficient binary
protections** (M7) is the absence or weakness of the defenses (integrity checks,
obfuscation, anti-hooking, anti-debugging) that raise the cost of that tampering.
This skill demonstrates, on an app you are authorized to assess, that a specific
client-side check can be defeated via static patching or dynamic instrumentation —
proving the check cannot be the sole line of defense and must be backed server-side or
by tamper-evident attestation.

## Authorization & scope

**Run only against an app you are explicitly authorized to assess**, on a device/
emulator you own. Prove the *bypass class* (e.g. "pinning defeated with a Frida hook",
"root detection patched out") with an inert marker; do **not** use a tampered build to
access production data or others' accounts, and do not distribute the modified app.
The finding is that the protection is insufficient — not a weaponized cracked build.
Report the missing/weak protections and any server-side reliance on them.

## Preconditions

- The app on a device/emulator you own (rooted/jailbroken test device, or emulator).
- Tooling: `apktool`/`jadx`/`apksigner` (static patch + re-sign with your key), Frida/
  Objection (dynamic instrumentation), a proxy for the pinning bypass.

## Procedure

1. **Enumerate client-side protections.** Identify what the app enforces on itself:
   root/jailbreak detection, certificate pinning, debugger/emulator detection,
   integrity/signature self-checks, and any license/feature/auth check done in the
   client.
2. **Static patch a check.** Locate the check in smali/decompiled code, patch it to a
   benign always-pass, rebuild and re-sign with your own key, and confirm the check no
   longer fires:
   ```bash
   apktool d app.apk -o app_src
   # patch e.g. isRooted()/checkSignature() to return the benign path
   apktool b app_src -o patched.apk && apksigner sign --ks my-test.keystore patched.apk
   ```
3. **Dynamic bypass with Frida.** Where static patching is impractical, hook at
   runtime to defeat the check without modifying the file:
   ```
   # illustrative: hook the detection/pinning method and force the benign return
   frida -U -f com.example.app -l bypass.js --no-pause
   ```
4. **Defeat pinning specifically.** Bypass certificate pinning (patch or hook) and
   confirm the app's traffic is now interceptable through your proxy — showing pinning
   alone doesn't protect data if the client can be instrumented.
5. **Assess resistance.** Note whether obfuscation, anti-hooking, anti-debugging, or
   integrity attestation raised the cost at all, and whether any bypassed check was the
   *only* thing protecting an asset (vs. a server-side backstop).
6. **Record** each defeated protection, the method (static/dynamic), and the fix: add
   integrity/tamper detection and platform attestation, obfuscate and add
   anti-hooking/anti-debugging as defense-in-depth, and — critically — enforce every
   security decision server-side rather than trusting the client.

## Paired defense / offense

Pairs with **mobile-binary-protection-hardening**. The bypasses this skill proves are
what that skill raises the cost of (integrity checks, attestation, obfuscation,
anti-hooking) — and, more importantly, what it makes irrelevant by moving trust
server-side.

## Validation

Reproduce against a test app you own:

1. Build a demo app with a client-side root-detection check and certificate pinning
   and no server-side backstop.
2. Patch out the root check (static) and defeat pinning (Frida), confirming
   interception; show the app still trusts the client result.
3. Apply the paired hardening (attestation/integrity check, obfuscation/anti-hooking,
   and a server-side check) and confirm the trivial bypass no longer grants the asset.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-RESILIENCE and MASTG reverse-engineering / anti-tampering
test procedures._

## References

- OWASP Mobile Top 10 (2024) M7 Insufficient Binary Protections
- OWASP MASVS-RESILIENCE; MASTG reverse-engineering & anti-tampering tests
- Frida / Objection; Play Integrity API; Apple App Attest; R8/ProGuard obfuscation
- MITRE ATT&CK Mobile T1407 Download New Code at Runtime, T1633.001 Virtualization/
  Sandbox Evasion; CAPEC-208, CAPEC-660; CWE-693, CWE-919
