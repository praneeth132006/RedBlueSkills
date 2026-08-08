---
name: mobile-deep-link-hardening
description: >-
  Harden a mobile app's deep links and inter-app entry points so a crafted link
  cannot trigger sensitive actions, redirect callbacks, or inject untrusted input.
  Use when protecting an Android or iOS app: gating sensitive actions behind fresh
  authorization, validating all link parameters, using verified App/Universal Links
  with state/PKCE for callbacks, and minimizing exported components and claimable
  schemes. Pairs with the M4/M8 deep-link abuse offense.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1625, T1516]
  capec: [CAPEC-194]
  cwe: [CWE-939, CWE-927]
  owasp: []
  d3fend: [D3-ACH, D3-IAA]
pairs_with: [mobile-deep-link-abuse]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile deep-link hardening

## Overview

A deep link is untrusted input from an untrusted caller, so it is hardened the same
way any external request is: authenticate the actor, validate the data, and don't
expose more surface than necessary. The defenses are to treat every incoming link as
hostile, require a fresh authorization step before any sensitive action a link could
reach, validate and canonicalize all parameters, back callbacks with verified links
plus OAuth state/PKCE so codes can't be intercepted, and shrink the exported /
claimable entry-point surface. This skill enumerates those controls for Android and
iOS to defeat the link-hijacking and injection the paired offense demonstrates.

## Authorization & scope

Defensive configuration and code review of an app your team owns. Manifests,
entitlements, and site-association files are not sensitive user data; validate with
seeded test accounts on a test device. No testing of third-party apps.

## Preconditions

- Access to the app source and platform config (Android manifest, iOS Info.plist /
  entitlements) and the associated web domain (for App/Universal Links).
- The list of deep-link entry points and which of them can reach sensitive actions
  or feed privileged sinks.
- A test device to verify with the paired offense skill.

## Procedure

1. **Gate sensitive actions behind fresh authorization.** No deep link should
   complete a transfer, change security settings, or reveal sensitive data on its
   own — require the user to be authenticated and, for high-value actions, to
   re-authenticate/confirm. A link may *navigate*; it must not *authorize*.
2. **Validate and canonicalize every parameter.** Treat link inputs as untrusted:
   enforce type/format/range, allowlist expected values, reject path traversal and
   injected URLs, and never pass link data unsanitized into a WebView, SQL, file
   path, or intent extra.
3. **Use verified links for callbacks with state/PKCE.** Prefer Android App Links
   (`autoVerify="true"` with a valid Digital Asset Links file) and iOS Universal
   Links (valid `apple-app-site-association`) over custom schemes, which any app can
   claim. For OAuth/magic-link callbacks, validate `state` and use PKCE so an
   intercepted code is useless (per RFC 8252).
4. **Minimize exported / claimable surface.** Set `android:exported="false"` on
   components that don't need external invocation; require signature permissions for
   inter-app components that do; avoid custom schemes for anything sensitive.
5. **Fail safe on unknown routes.** Unrecognized or malformed links should land on a
   safe default screen, not error into a privileged state or leak parameters.
6. **Continuously verify.** Add a test that fires the paired offense's crafted links
   in CI/QA and asserts they reach only non-sensitive screens with validated input,
   and monitor that the Digital Asset Links / AASA files stay valid so link
   verification doesn't silently regress to a claimable scheme.

## Detection engineering notes

- The load-bearing control is the **re-authorization gate**: even a perfectly
  hijacked link then can't perform the sensitive action. Input validation and
  verified links close the injection and interception paths.
- Custom schemes are inherently claimable by other apps — treat any sensitive flow
  built on a bare `myapp://` scheme as a finding and move it to a verified
  App/Universal Link.

## Paired offense / defense

Pairs with **mobile-deep-link-abuse**. Run that skill before and after: beforehand a
crafted link reaches a sensitive action or injects an unvalidated value; after
hardening the link only navigates, sensitive actions demand fresh authorization,
parameters are validated, and callbacks can't be intercepted.

## Validation

Reproduce against a test app you own:

1. Start from the demo app whose `myapp://` handler performs an action from link
   parameters without re-auth; confirm the paired skill triggers it.
2. Add a re-authorization gate, parameter validation, verified App/Universal Links
   with state/PKCE, and unexport unnecessary components.
3. Re-run the paired skill and confirm the crafted links are rejected or reach only
   safe, validated screens.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-PLATFORM and platform deep-link guidance._

## References

- OWASP Mobile Top 10 M4 Insufficient Input/Output Validation, M8 Security Misconfiguration
- OWASP MASVS-PLATFORM; MASTG deep-link / IPC tests
- Android App Links verification & Digital Asset Links; Apple Universal Links / AASA; OAuth for Native Apps (RFC 8252, PKCE)
- MITRE D3FEND D3-ACH (Application Configuration Hardening), D3-IAA (Identifier Activity Analysis)
- MITRE ATT&CK Mobile T1625, T1516; CAPEC-194; CWE-939, CWE-927
