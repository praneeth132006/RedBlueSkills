---
name: mobile-deep-link-abuse
description: >-
  Abuse insecure deep links and inter-app entry points during an authorized mobile
  assessment. Use when an app registers custom URL schemes, Android App Links /
  iOS Universal Links, or exported components that accept externally-supplied input,
  and you need to prove that a crafted link from a webpage, another app, or a QR code
  can trigger sensitive actions, redirect OAuth/tokens, or inject untrusted data into
  a privileged screen. Maps to OWASP Mobile Top 10 M4 Insufficient Input/Output
  Validation and M8 Security Misconfiguration.
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1625, T1516]
  capec: [CAPEC-194]
  cwe: [CWE-939, CWE-927]
  owasp: []
  d3fend: []
pairs_with: [mobile-deep-link-hardening]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile deep-link abuse

## Overview

Deep links are an app's externally-reachable front door: a `myapp://` scheme, an
`https://` App/Universal Link, or an exported activity/intent can be invoked by any
webpage, any other installed app, or a scanned QR code. When the handler trusts that
input — routing to a privileged screen, completing an OAuth callback, auto-filling a
form, or executing an action without re-authorization — a crafted link becomes an
initial-access primitive. This skill enumerates an app's registered entry points and
proves which ones perform sensitive actions or accept attacker-controlled data
without validation, demonstrating link-hijacking, intent-redirection, and unvalidated
callback flows so the handlers can be locked down.

## Authorization & scope

**Run only against an app and test device you are explicitly authorized to assess**,
with a seeded test account. Craft links that demonstrate the flaw (reaching a
privileged screen, a redirectable callback, unvalidated input into a handler) — not
links that damage data or target real users. The finding is "entry point X performs
sensitive action / accepts unvalidated input", captured as the link, the handler, and
the observed effect. Do not publish crafted links or use them against anyone else's
device or account.

## Preconditions

- The app package and/or source, on a test device/emulator you control.
- Ability to enumerate the app's manifest (`AndroidManifest.xml` intent filters,
  exported components) or iOS `Info.plist` URL types / associated-domains
  entitlement.
- `adb`/`xcrun simctl` to fire links, plus a minimal test webpage/second app to
  originate cross-app invocations.

## Procedure

1. **Enumerate registered entry points.** List custom schemes, App/Universal Links,
   and exported components:
   ```bash
   # Android — intent filters and exported components
   apktool d app.apk -o app_src   # read AndroidManifest.xml: <data android:scheme=...>, exported="true"
   adb shell dumpsys package com.example.app | grep -A3 -i 'scheme\|intent filter'
   ```
   iOS: read `CFBundleURLTypes` and the `com.apple.developer.associated-domains`
   entitlement in the app package.
2. **Fire each link and observe routing.** Invoke handlers and watch where the app
   lands and what it trusts:
   ```bash
   # Android
   adb shell am start -a android.intent.action.VIEW -d 'myapp://account/transfer?to=attacker&amt=1'
   # iOS Simulator
   xcrun simctl openurl booted 'myapp://reset?token=TEST'
   ```
   Flag any link that reaches an authenticated/privileged screen or performs an
   action without a fresh authorization step.
3. **Test parameter validation.** Supply hostile values in link parameters (path
   traversal, injected URLs, script for a WebView sink, oversized/unexpected types)
   and observe whether the handler validates them or passes them into a sensitive
   sink.
4. **Test callback/redirect trust (OAuth & co.).** If a deep link is used as an OAuth
   or magic-link callback, check whether the app validates state/PKCE and the
   redirect target — a scheme another app can also claim, or an unvalidated redirect,
   can leak the authorization code/token to an attacker-controlled handler.
5. **Test scheme/link claiming.** On Android, check whether a custom scheme or an
   `autoVerify=false` App Link can be claimed by a second (malicious) app to intercept
   the invocation; on iOS confirm Universal Links are backed by a valid
   `apple-app-site-association` rather than a hijackable custom scheme.
6. **Record** each vulnerable entry point as (link, handler/component, sensitive
   action or unvalidated sink, exported/claimable?), plus the fix: require
   re-authorization for sensitive actions, validate all parameters, use verified
   App/Universal Links with state/PKCE for callbacks, and stop exporting components
   that don't need it.

## Paired defense / offense

Pairs with **mobile-deep-link-hardening**. Each entry point this skill abuses — a
privileged action behind an unauthenticated link, an unvalidated parameter, a
claimable scheme, a redirectable callback — is what that skill closes by gating
sensitive actions, validating input, using verified links, and minimizing exported
surface. Re-run this skill after hardening to confirm the crafted links no longer
reach a sensitive action or inject untrusted data.

## Validation

Reproduce against a test app you own:

1. Build a demo app that registers `myapp://` and an activity that performs an action
   from link parameters without re-auth or validation.
2. Fire a crafted link with `adb`/`simctl` and confirm it reaches the action /
   injects an unvalidated value.
3. Apply the paired hardening (re-auth gate, parameter validation, verified links,
   unexport) and confirm the same links are now rejected or inert.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASTG platform-interaction (deep link) test procedures._

## References

- OWASP Mobile Top 10 M4 Insufficient Input/Output Validation, M8 Security Misconfiguration
- OWASP MASVS-PLATFORM; MASTG deep-link / IPC test cases
- Android App Links & intent filters; Apple Universal Links & associated domains; OAuth for native apps (RFC 8252 / PKCE)
- MITRE ATT&CK Mobile T1625 Hijack Execution Flow, T1516 Input Injection; CAPEC-194; CWE-939, CWE-927
