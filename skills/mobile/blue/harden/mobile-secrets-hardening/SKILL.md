---
name: mobile-secrets-hardening
description: >-
  Keep secrets out of shipped mobile binaries and limit the damage of any client
  key. Use when protecting an Android or iOS app: removing server-side credentials
  from the client, replacing them with a backend broker, scoping and restricting the
  client keys that must ship, rotating exposed keys, and gating releases on a binary
  secret scan. Pairs with the M1/M7 hardcoded-secrets offense.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1552.001, T1406]
  capec: [CAPEC-191]
  cwe: [CWE-798, CWE-321]
  owasp: []
  d3fend: [D3-ACH, D3-PH]
pairs_with: [mobile-hardcoded-secrets]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile secrets hardening

## Overview

The one durable rule of mobile secret management: **anything shipped in the binary
is public.** So the defense is not to hide secrets better but to make sure no
server-side secret ships at all, and that whatever client identifier must ship is
scoped so tightly that extracting it buys the attacker nothing. This skill covers
moving true secrets behind the backend, restricting the few keys that legitimately
live on the client, rotating anything already exposed, and enforcing all of it with
a build-time secret scan so a hardcoded credential can never merge.

## Authorization & scope

Defensive review and configuration of an app your team owns. Scanning binaries and
source may reveal real credentials — treat any recovered secret as an incident
(rotate it) and handle under your data-handling policy. No testing of third-party
apps.

## Preconditions

- Access to the app source, build pipeline, and the backend the app talks to.
- The ability to change how the app authenticates to third-party services and to
  rotate keys with those providers.
- An inventory of every key/credential currently referenced by the client.

## Procedure

1. **Move server-side secrets off the client.** Any credential that grants
   privileged access (cloud access keys, payment secret keys, third-party API
   secrets) must live only on the backend. Have the app call your backend, which
   holds the secret and brokers the third-party request — the client never sees it.
2. **Scope and restrict unavoidable client keys.** For keys that must ship (maps,
   analytics, Firebase), apply provider-side restrictions: bundle-id/package +
   signing-cert allowlists, API/endpoint restrictions, per-key quotas, and the
   least-privileged key variant (publishable, not secret).
3. **Use short-lived, device-bound tokens for backend auth.** Authenticate the user,
   then issue short-lived tokens; store them in Keychain/Keystore (see
   `mobile-data-storage-hardening`) rather than embedding a static API secret.
4. **Rotate everything exposed.** Treat any secret found in a shipped build as
   compromised: rotate it at the provider, invalidate the old value, and ship a new
   build that no longer contains it.
5. **Gate releases on a secret scan.** Run a binary/source secret scanner
   (gitleaks/trufflehog-style rules over the decompiled APK/IPA) in CI and fail the
   build on any high-confidence hit; keep an allowlist for known client-safe
   identifiers so the signal stays clean.
6. **Reduce reverse-engineering signal.** Obfuscation is defense-in-depth, not a
   secret store — enable R8/ProGuard and strip symbols to raise the cost of analysis,
   but never rely on it to protect a value that must stay secret.

## Detection engineering notes

- The load-bearing control is **architectural**: no server-side secret in the client
  at all. Restrictions and obfuscation only matter for the keys that genuinely must
  ship, and even those should be scoped so extraction is low-value.
- A CI secret scan on the *built artifact* (not just source) catches secrets injected
  via resources, generated config (`google-services.json`), or native libraries that
  a source-only scan misses.

## Paired offense / defense

Pairs with **mobile-hardcoded-secrets**. Run that skill against the build before and
after: beforehand it extracts a live key from resources/code; after hardening the
server-side secret is gone, the remaining client key is provider-restricted and
low-value, and the CI scan blocks any regression.

## Validation

Reproduce against a test app you own:

1. Start from the demo app that embeds a test API key and an auth constant; confirm
   the paired skill extracts them.
2. Remove the server-side secret (broker via backend), restrict the client key,
   rotate the exposed key, and add a CI secret scan over the built artifact.
3. Re-run the paired skill and confirm no live server-side secret is extractable and
   the CI scan fails a deliberately reintroduced hardcoded key.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-CODE and provider key-restriction guidance._

## References

- OWASP Mobile Top 10 M1 Improper Credential Usage, M7 Insufficient Binary Protections
- OWASP MASVS-CODE / MASVS-RESILIENCE; MASTG secret-management tests
- Google/Apple API key restriction docs; gitleaks / trufflehog secret scanning
- MITRE D3FEND D3-ACH, D3-PH; ATT&CK T1552.001, T1406; CWE-798, CWE-321; CAPEC-191
