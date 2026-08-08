---
name: mobile-privacy-hardening
description: >-
  Build adequate privacy controls into a mobile app against OWASP Mobile Top 10 M6.
  Use when minimizing what an Android or iOS app collects, retains, and shares:
  dropping unneeded permissions and data-hungry SDKs, gating collection on meaningful
  consent, using resettable identifiers, keeping sensitive data out of logs/clipboard/
  backups/screenshots, and disclosing data practices accurately. Pairs with the M6
  privacy-exposure offense.
version: 1.0.0
team: blue
app_type: mobile
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1426, T1636.003]
  capec: [CAPEC-118]
  cwe: [CWE-359, CWE-200]
  owasp: []
  d3fend: [D3-ACH, D3-DENCR]
pairs_with: [mobile-privacy-exposure]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Mobile privacy hardening

## Overview

Privacy is an architectural property, not a policy paragraph: an app protects its
users by **collecting less, sharing less, and keeping what it must handle contained.**
This skill hardens four areas: **minimization** (request only the permissions and
collect only the data a feature actually needs; remove data-hungry SDKs), **consent &
transparency** (gate privacy-sensitive collection on meaningful, revocable consent and
disclose practices accurately in-app and in store labels), **identity** (use resettable
advertising/analytics identifiers, never stable hardware identifiers, and avoid
cross-context tracking), and **containment** (keep sensitive values out of logs, the
clipboard, screenshots/backgrounding snapshots, cloud backups, and crash reports; set
retention and deletion). It removes the over-collection and leakage that M6 attacks
inventory.

## Authorization & scope

Defensive review and configuration of an app your team owns. Assessing data flows may
surface real user data — handle strictly under your privacy and data-handling policy.
No testing of third-party apps.

## Preconditions

- Access to the app source, manifest/entitlements, bundled-SDK list, and backend
  data flows.
- The ability to change permissions, SDK configuration, consent flows, and logging.

## Procedure

1. **Minimize permissions and data.** Remove permissions with no backing feature;
   request sensitive permissions just-in-time with rationale; collect the minimum data
   fields and prefer on-device processing over sending data off the device.
2. **Prune and configure SDKs.** Remove unnecessary analytics/ad/attribution SDKs;
   for those that remain, disable identifier and location collection you don't need and
   confine them to consented purposes.
3. **Gate on consent.** Do not collect or share privacy-sensitive data before
   meaningful, specific, revocable consent; honor opt-out (ATT / consent mode) and
   provide an in-app privacy control and data-deletion path.
4. **Use resettable identifiers.** Use the platform advertising/analytics ID (user-
   resettable), never IMEI/MAC/serial or other stable hardware identifiers, and avoid
   linking identifiers across contexts.
5. **Contain sensitive data locally.** Strip PII/secrets from logs and crash reports;
   set `FLAG_SECURE`/hide sensitive screens from the app switcher; exclude sensitive
   files from cloud backups; keep sensitive values off the clipboard.
6. **Set retention and disclosure.** Define and enforce retention/deletion; keep the
   in-app disclosures and store data-safety/privacy labels accurate to what the app
   actually does.
7. **Verify continuously.** Add a CI check (or periodic review) that flags new
   permissions, new data-collecting SDKs, and PII reaching logs before release.

## Detection engineering notes

- **Minimization is the durable control**: data never collected can't leak, be
  subpoenaed, or be shipped to a third party. Consent and containment matter most for
  the data that genuinely must be handled.
- A **release-time diff of permissions + bundled SDKs + log sinks** catches privacy
  regressions (a new tracker, a new logged field) at the point they're introduced.

## Paired offense / defense

Pairs with **mobile-privacy-exposure**. Run that skill before and after: it should
first inventory excess permissions, third-party data flows, and leaked values, and
afterward find collection minimized, sharing consented and disclosed, and the local
sinks closed.

## Validation

Reproduce against a test app you own:

1. Start from the demo app that over-collects (unneeded permission, advertising ID +
   location to analytics, email in logs); confirm the paired skill inventories it.
2. Drop the permission, minimize/consent-gate the SDK, switch to a resettable ID, and
   remove the log sink.
3. Re-run the paired skill and confirm the data-flow inventory is reduced to what is
   needed, consented, and disclosed.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-PRIVACY and platform privacy guidance._

## References

- OWASP Mobile Top 10 (2024) M6 Inadequate Privacy Controls
- OWASP MASVS-PRIVACY; MASTG privacy tests
- Apple App Tracking Transparency & privacy nutrition labels; Google Play Data Safety;
  platform permission best practices
- MITRE D3FEND D3-ACH (Application Configuration Hardening), D3-DENCR (Disk
  Encryption); ATT&CK T1426, T1636.003; CAPEC-118; CWE-359, CWE-200
