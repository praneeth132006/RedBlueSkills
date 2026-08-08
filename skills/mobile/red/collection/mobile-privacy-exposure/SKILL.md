---
name: mobile-privacy-exposure
description: >-
  Demonstrate Inadequate Privacy Controls (OWASP Mobile Top 10 M6) during an
  authorized mobile assessment — showing that an app collects, retains, exposes, or
  shares personal and device data beyond what it discloses or needs: over-broad
  permissions, PII/identifiers sent to third-party SDKs and analytics/ad networks,
  sensitive data in logs/clipboard/screenshots, and trackable persistent identifiers.
  Use to inventory what personal data an app actually handles and where it goes,
  versus its stated purpose and consent.
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: collection
techniques:
  attack: [T1426, T1636.003]
  capec: [CAPEC-118]
  cwe: [CWE-359, CWE-200]
  owasp: []
  d3fend: []
pairs_with: [mobile-privacy-hardening]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile privacy exposure

## Overview

A mobile app sits on top of the most sensitive data a person carries — location,
contacts, health, identifiers, behavior — and **inadequate privacy controls** (M6) is
the gap between what an app *should* collect and what it actually does: permissions
far beyond the feature that needs them, PII and stable device identifiers shipped to
third-party analytics/ad SDKs, sensitive values leaking into logs, the clipboard,
screenshots, or crash reports, and data retained or shared without meaningful consent.
This skill inventories, on an app you are authorized to assess, what personal and
device data the app collects and where it flows — comparing that reality against the
app's disclosures — so the privacy exposure is measured, not assumed.

## Authorization & scope

**Run only against an app you are explicitly authorized to assess**, on a device/
emulator you own, using **test/dummy personal data** — never real users' data. The
deliverable is an inventory of data classes and destinations (e.g. "advertising ID +
coarse location sent to analytics SDK X"), redacted to categories, not captured
personal records. Do not intercept other people's traffic or exfiltrate real user
data. Report over-collection and undisclosed sharing promptly.

## Preconditions

- The app on a test device/emulator you own and permission to run it with dummy data.
- Tooling: `apktool`/`jadx` (static), a proxy (mitmproxy/Burp) with a CA you control on
  a test device, `adb logcat`, and permission/manifest inspection.

## Procedure

1. **Enumerate requested permissions.** From the manifest/Info.plist, list every
   permission and privacy-sensitive entitlement (location, contacts, camera, mic,
   health) and map each to the feature that justifies it; flag permissions with no
   corresponding feature.
2. **Inventory bundled SDKs and their data appetite.** Identify analytics, crash,
   advertising, and attribution SDKs and what each is configured to collect (device
   identifiers, location, usage events).
3. **Observe data in transit (test data only).** Route the app through your proxy and
   catalog what personal/device data is sent, to which hosts (first- vs. third-party),
   and whether it is minimized:
   ```
   # with your own CA trusted on a test device, browse the app's flows in mitmproxy
   # record: destination host, data class (advertising-id, location, email), purpose
   ```
4. **Check local leakage sinks.** Inspect logs, clipboard, screenshots/backgrounding
   snapshots, and crash reports for sensitive values:
   ```bash
   adb logcat | grep -iE 'email|token|lat=|lon=|imei|advertising'   # test data
   ```
5. **Assess identifiers & consent.** Determine whether the app uses resettable
   identifiers appropriately or ties data to stable/hardware identifiers, and whether
   collection happens before/without meaningful consent.
6. **Record** a data-flow inventory: for each data class, what is collected, why (or if
   there is no need), where it goes, retention, and consent state — plus the fix:
   minimize collection, drop unnecessary permissions/SDKs, gate on consent, use
   resettable identifiers, and keep sensitive data out of logs/clipboard/backups.

## Paired defense / offense

Pairs with **mobile-privacy-hardening**. The over-collection, undisclosed third-party
sharing, and leakage sinks this skill inventories are exactly what that skill removes —
data minimization, permission/SDK pruning, consent gating, and closing the local
leakage sinks.

## Validation

Reproduce against a test app you own:

1. Build a demo app that requests an unneeded permission and sends an advertising ID +
   coarse location to a mock analytics endpoint, and logs an email.
2. Enumerate the excess permission, observe the third-party data flow through your
   proxy, and find the value in logs — using dummy data.
3. Apply the paired hardening (drop the permission, gate/minimize the SDK, remove the
   log) and confirm the data-flow inventory shrinks to what is needed and disclosed.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASVS-PRIVACY and MASTG privacy test procedures._

## References

- OWASP Mobile Top 10 (2024) M6 Inadequate Privacy Controls
- OWASP MASVS-PRIVACY; MASTG data-collection & privacy tests
- Android/iOS privacy & permissions guidance; advertising-identifier and consent
  requirements (ATT, Play Data Safety)
- MITRE ATT&CK Mobile T1426 System Information Discovery, T1636.003 Protected User
  Data: Contact List; CAPEC-118; CWE-359, CWE-200
