---
name: mobile-insecure-transport
description: >-
  Intercept and read a mobile app's network traffic during an authorized mobile
  assessment. Use when you have a test device you control and need to prove that the
  app talks to its backend over cleartext, accepts a proxy/user-added CA, or fails
  to pin/validate the server certificate — letting an adversary-in-the-middle read
  or tamper with credentials, tokens, and API traffic on hostile networks. Maps to
  OWASP Mobile Top 10 M5 Insecure Communication / MASVS-NETWORK.
version: 1.0.0
team: red
app_type: mobile
killchain:
  framework: mitre-attack
  stage: credential-access
techniques:
  attack: [T1638, T1557]
  capec: [CAPEC-94, CAPEC-609]
  cwe: [CWE-319, CWE-295]
  owasp: []
  d3fend: []
pairs_with: [mobile-transport-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Mobile insecure transport

## Overview

Mobile apps run on untrusted networks by default — cafe Wi-Fi, cellular, captive
portals — so transport security is the only thing standing between the app's traffic
and an adversary-in-the-middle. Three failures recur: sending anything over cleartext
`http://`, trusting user-added / proxy CAs (so a test or malicious CA can decrypt
TLS), and shipping no certificate pinning (so any CA the device trusts, including a
compromised or coerced one, can impersonate the backend). This skill sets up a
controlled MITM against a test device and proves which of these hold — demonstrating
that credentials, tokens, and API bodies are readable or tamperable in transit so
the transport can be hardened.

## Authorization & scope

**Run only against an app, backend, and test device you are explicitly authorized to
assess**, on a network you control. Use a seeded test account; the finding is "the
app's TLS can be intercepted / it uses cleartext", captured as redacted evidence
(endpoint, whether pinning is present, a fingerprint of the exposed field) — not a
dump of real user traffic. Do not intercept other users' traffic or run this on
shared/production networks. Remove any test CA and proxy settings from the device
when finished.

## Preconditions

- A test device/emulator you control and can configure (proxy, CA trust) or
  root/jailbreak for pinning bypass.
- An intercepting proxy (mitmproxy/Burp/ZAP) and the ability to route the device
  through it; optionally Frida/objection for pinning bypass on a rooted/jailbroken
  device.
- A seeded test account to generate authenticated traffic.

## Procedure

1. **Route the device through a proxy and watch for cleartext.** Point the test
   device at your proxy and look for any `http://` request or plaintext protocol:
   ```bash
   mitmproxy --mode regular --listen-port 8080
   # exercise login + core flows; flag any cleartext request or credential in the clear
   ```
2. **Test user-added CA trust (no pinning).** Install the proxy's CA on the test
   device and re-run flows. If HTTPS traffic now decrypts, the app trusts user-added
   CAs and does not pin — an AiTM with any trusted CA can read it. On Android, confirm
   whether `network_security_config` opts into user CAs; on iOS, whether ATS
   exceptions weaken TLS.
3. **Test for certificate pinning.** With the CA installed, if HTTPS still fails to
   decrypt, pinning is likely present. Attempt a scoped bypass on a
   rooted/jailbroken test device to characterize its strength:
   ```bash
   objection -g com.example.app explore --startup-command 'android sslpinning disable'
   # or a Frida pinning-bypass script; note whether the bypass succeeds
   ```
4. **Check TLS quality.** Confirm the app rejects weak TLS versions/ciphers and an
   invalid/expired/hostname-mismatched certificate (present a bad cert via the proxy
   and verify the app refuses to connect).
5. **Demonstrate impact, scoped.** With interception working, capture a single
   redacted example showing a credential/token/API body is readable (and, if in
   scope, that a tampered response is accepted) — then stop.
6. **Record** per endpoint: cleartext yes/no, user-CA trusted yes/no, pinning
   present and bypass difficulty, and TLS validation behavior, plus the fix: TLS
   everywhere, no user-CA trust, certificate/public-key pinning, and strict
   validation.

## Paired defense / offense

Pairs with **mobile-transport-hardening**. The interception this skill achieves — via
cleartext, user-CA trust, or missing pinning — is exactly what that skill closes by
enforcing TLS for all traffic, rejecting user-added CAs, pinning the server's
key/cert, and validating certificates strictly. Re-run this skill after hardening to
confirm the MITM no longer decrypts or tampers with traffic.

## Validation

Reproduce against a test app you own:

1. Build a demo app that calls its backend, initially with an `http://` endpoint and
   default (no-pinning) TLS.
2. Route a test device through mitmproxy, install the CA, and confirm you can read
   credentials/tokens and modify a response.
3. Apply the paired hardening (TLS-only, no user CAs, pinning) and confirm the same
   MITM setup can no longer decrypt or tamper with the traffic.

_Not yet lab-validated end-to-end (no shipped mobile lab target); authored and
reviewed against OWASP MASTG network-communication test procedures._

## References

- OWASP Mobile Top 10 M5 Insecure Communication; OWASP MASVS-NETWORK; MASTG network tests
- MITRE ATT&CK Mobile T1638 Adversary-in-the-Middle; ATT&CK T1557
- Android Network Security Configuration; Apple App Transport Security; OWASP certificate pinning guidance
- CAPEC-94 Adversary in the Middle, CAPEC-609; CWE-319, CWE-295
