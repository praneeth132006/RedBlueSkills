---
name: network-tls-assessment
description: >-
  Assess a network service's TLS/SSL configuration for weaknesses during an
  authorized assessment. Use when a service exposes TLS (HTTPS, SMTPS, LDAPS,
  database TLS, VPN) and you need to prove it permits deprecated protocols, weak
  ciphers/key exchange, or presents an invalid, expired, self-signed, or
  mismatched certificate — the conditions that enable downgrade and
  adversary-in-the-middle. Maps to MITRE ATT&CK T1595.002; the defensive mirror is
  TLS hardening (NIST SP 800-52r2 / SC-8 / SC-13, CIS Control 3).
version: 1.0.0
team: red
app_type: network
killchain:
  framework: mitre-attack
  stage: recon
techniques:
  attack: [T1595.002, T1040]
  capec: [CAPEC-217, CAPEC-620]
  cwe: [CWE-326, CWE-327, CWE-295]
  owasp: []
  d3fend: []
pairs_with: [network-tls-hardening]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Network TLS assessment

## Overview

TLS is only as strong as its weakest permitted option, and services accrete weak
settings over time: a still-enabled SSLv3/TLS1.0, an export or RC4 cipher, weak
Diffie-Hellman parameters, or a certificate that is expired, self-signed, or issued
for the wrong name. Each of these lets an adversary-in-the-middle downgrade, decrypt,
or impersonate the connection. This skill enumerates a service's full TLS
posture — supported protocol versions, cipher suites, key exchange strength, and
certificate validity/chain — against an authorized target and reports every weak
option, so the service can be brought to a modern, hardened baseline. It is passive
and read-only: it negotiates handshakes, it does not exploit users.

## Authorization & scope

**Run only against services explicitly in scope under a signed ROE.** TLS enumeration
is read-only (it completes/attempts handshakes and reads certificates) and low-risk,
but still confine it to authorized hosts and the testing window. The finding is "the
service permits weak protocol/cipher X" or "presents an invalid certificate" —
captured as the negotiated parameters and certificate details, not user traffic. Do
not perform an actual MITM against real users to demonstrate impact; the
misconfiguration itself is the finding (see `network-credential-sniffing` for the
authorized-lab AiTM demonstration).

## Preconditions

- In-scope TLS-exposing services (from `network-service-discovery`) and network
  reachability.
- TLS-scanning tooling (`testssl.sh`, `sslscan`, `nmap --script ssl-*`, or `openssl
  s_client`).
- The organization's target TLS baseline to compare against (or NIST SP 800-52r2 as
  the default).

## Procedure

1. **Enumerate protocols and ciphers.** List every supported protocol version and
   cipher suite and flag deprecated/weak ones:
   ```bash
   # comprehensive TLS posture for a service
   testssl.sh --protocols --ciphers --pfs https://target.example.com:443
   # or targeted checks
   nmap --script ssl-enum-ciphers -p 443 target.example.com
   ```
2. **Check for deprecated protocols.** Confirm whether SSLv2/SSLv3/TLS1.0/TLS1.1 are
   still accepted — any of these should be disabled in favor of TLS 1.2+ (prefer
   1.3).
3. **Check cipher and key-exchange strength.** Flag RC4, 3DES, export/NULL ciphers,
   CBC-only suites where relevant, and weak (<2048-bit) DH parameters; confirm
   forward secrecy (ECDHE) is offered and preferred.
4. **Validate the certificate.** Verify the chain, expiry, key size/algorithm,
   hostname match (SAN), signature algorithm (no SHA-1), and revocation status:
   ```bash
   openssl s_client -connect target.example.com:443 -servername target.example.com </dev/null \
     | openssl x509 -noout -dates -issuer -subject -ext subjectAltName
   ```
5. **Test for known TLS flaws.** Check for the well-known named weaknesses the tools
   flag (e.g. weak-DH/Logjam, RC4, insecure renegotiation, missing
   downgrade-protection) as applicable to the negotiated stack.
6. **Record** per service the supported protocols/ciphers, forward-secrecy status,
   certificate validity, and every deviation from the baseline, plus the fix:
   disable weak protocols/ciphers, enforce TLS 1.2+ with FS, and replace invalid
   certificates.

## Paired defense / offense

Pairs with **network-tls-hardening**. Each weak protocol, cipher, or invalid
certificate this skill reports is exactly what that skill removes by enforcing a
modern TLS baseline (TLS 1.2+/1.3, FS-only ciphers, valid short-lived certs) and
monitoring for drift. Re-run this skill after hardening to confirm only strong
options remain and the certificate validates cleanly.

## Validation

Reproduce in a lab you own:

1. Stand up a service with TLS 1.0 + RC4 enabled and an expired/self-signed cert.
2. Run the TLS assessment and confirm it flags the deprecated protocol, weak cipher,
   and invalid certificate.
3. Apply the paired hardening and re-scan to confirm only TLS 1.2+/1.3 with FS ciphers
   and a valid certificate remain.

_Not yet lab-validated end-to-end (no shipped network lab target); authored and
reviewed against NIST SP 800-52 Rev 2 and the OWASP Transport Layer Security Cheat
Sheet._

## References

- MITRE ATT&CK T1595.002 Vulnerability Scanning; T1040 Network Sniffing (enabling condition)
- NIST SP 800-52 Rev 2 Guidelines for TLS Implementations; NIST SP 800-131A Rev 2 Cryptographic Algorithm Transitions
- NIST SP 800-53 Rev 5: SC-8 Transmission Confidentiality & Integrity, SC-13 Cryptographic Protection, SC-23 Session Authenticity; NIST CSF 2.0 PR.DS
- OWASP Transport Layer Security Cheat Sheet; OWASP ASVS V9 (Communications)
- CIS Critical Security Controls v8: Control 3 (Data Protection); CAPEC-217 Exploiting Incorrectly Configured SSL/TLS, CAPEC-620; CWE-326, CWE-327, CWE-295
