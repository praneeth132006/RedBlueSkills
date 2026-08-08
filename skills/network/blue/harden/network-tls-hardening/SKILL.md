---
name: network-tls-hardening
description: >-
  Bring a network service's TLS to a modern, hardened baseline and keep it there.
  Use when protecting TLS-exposing services (HTTPS, SMTPS, LDAPS, database TLS, VPN):
  disabling deprecated protocols and weak ciphers, enforcing TLS 1.2+/1.3 with
  forward secrecy, maintaining valid short-lived certificates with strong keys, and
  monitoring for configuration and certificate drift. Pairs with the network
  TLS-assessment offense; anchored on NIST SP 800-52r2, SC-8/SC-13, CIS Control 3.
version: 1.0.0
team: blue
app_type: network
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1595.002, T1040]
  capec: [CAPEC-217]
  cwe: [CWE-326, CWE-327, CWE-295]
  owasp: []
  d3fend: [D3-ET, D3-CH, D3-PH]
pairs_with: [network-tls-assessment]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Network TLS hardening

## Overview

Because a TLS connection negotiates down to the weakest option both ends accept,
hardening TLS means removing every weak option from the server so there is nothing
weak to negotiate: disable deprecated protocols, offer only strong forward-secret
ciphers, use valid certificates with strong keys and correct names, and keep the
whole configuration from drifting back over time. This skill defines the modern
baseline (aligned to NIST SP 800-52r2) and the operational controls — certificate
lifecycle, automated renewal, and drift monitoring — that keep the transport secure,
the defensive mirror of network TLS assessment.

## Authorization & scope

Defensive configuration and monitoring of services your organization operates.
Certificates and TLS configs are not sensitive user data. No active testing of
third-party endpoints; validate internal changes through change control.

## Preconditions

- Authority over the TLS-terminating components (web servers, load balancers,
  reverse proxies, mail/LDAP/database servers, VPN concentrators).
- A certificate authority / ACME provider and an inventory of certificates and their
  expiries.
- The target TLS baseline (NIST SP 800-52r2 as default) and a place to run
  configuration/certificate monitoring.

## Procedure

1. **Enforce modern protocols only.** Disable SSLv2/SSLv3/TLS1.0/TLS1.1; require TLS
   1.2 as the floor and prefer TLS 1.3 (NIST SP 800-52r2). Enable
   downgrade-protection (TLS_FALLBACK_SCSV) where 1.3 isn't universal.
2. **Offer only strong, forward-secret ciphers.** Restrict to AEAD suites with ECDHE
   key exchange; remove RC4, 3DES, export/NULL, and weak-DH suites; use DH/EC
   parameters ≥2048-bit/256-bit. Set a sane, server-preferred cipher order.
3. **Use strong, valid certificates.** Issue certificates from a trusted CA with
   ≥2048-bit RSA or ECDSA P-256 keys and SHA-256+ signatures, correct SANs, and
   **short lifetimes** with automated renewal (ACME). Never ship self-signed or
   expired certs on production services (NIST SC-12/SC-17 for key/PKI management).
4. **Add transport-security headers/options where applicable.** For HTTPS, enable
   HSTS with a sensible max-age; enable OCSP stapling; disable insecure
   renegotiation.
5. **Protect and rotate keys.** Store private keys with restricted permissions (or in
   an HSM/KMS), rotate on renewal, and revoke promptly on suspected compromise (NIST
   SC-12 Cryptographic Key Establishment & Management).
6. **Monitor for drift and expiry.** Continuously scan your own endpoints against the
   baseline and alert on any weak protocol/cipher reappearing or any certificate
   nearing expiry, misissued, or unexpected (certificate transparency monitoring;
   NIST SI-4).

## Detection engineering notes

- The load-bearing control is **removing weak options at the server** — an attacker
  can't downgrade to a protocol/cipher the server refuses to offer.
- Certificate expiry and drift are the recurring operational failures; automated
  renewal plus expiry/CT monitoring turns them from outages/exposures into
  non-events.

## Paired offense / defense

Pairs with **network-tls-assessment**. Run that skill before and after: beforehand it
flags TLS 1.0, RC4, and an invalid certificate; after hardening the same scan sees
only TLS 1.2+/1.3 with forward-secret ciphers and a valid, correctly-named
certificate, and the drift monitor would alert if any weak option returned.

## Validation

Reproduce in a lab you own:

1. Start from the service with TLS 1.0 + RC4 and an expired/self-signed cert; confirm
   the paired skill flags them.
2. Apply the modern baseline (TLS 1.2+/1.3, FS ciphers, valid ACME cert) and enable
   drift/expiry monitoring.
3. Re-run the paired skill and confirm only strong options remain and the certificate
   validates.

_Not yet lab-validated end-to-end (no shipped network lab target); authored and
reviewed against NIST SP 800-52 Rev 2 and the OWASP TLS Cheat Sheet._

## References

- NIST SP 800-52 Rev 2 Guidelines for TLS; NIST SP 800-131A Rev 2 Crypto Transitions; NIST SP 800-57 Key Management
- NIST SP 800-53 Rev 5: SC-8 Transmission Confidentiality & Integrity, SC-13 Cryptographic Protection, SC-12 Key Management, SC-17 PKI Certificates, SI-4 System Monitoring
- NIST CSF 2.0: PR.DS (Data Security), PR.PS, DE.CM; MITRE D3FEND D3-ET (Encrypted Tunnels), D3-CH (Certificate/Credential Hardening), D3-PH (Platform Hardening)
- OWASP Transport Layer Security Cheat Sheet; OWASP ASVS V9; CIS Controls v8 Control 3 (Data Protection)
- MITRE ATT&CK T1595.002, T1040; CAPEC-217; CWE-326, CWE-327, CWE-295
