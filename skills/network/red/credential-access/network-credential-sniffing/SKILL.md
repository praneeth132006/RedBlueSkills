---
name: network-credential-sniffing
description: >-
  Capture credentials and sensitive data from network traffic during an authorized
  assessment, including via layer-2 adversary-in-the-middle. Use on an internal
  engagement when you need to prove that cleartext protocols leak credentials, or
  that LLMNR/NBT-NS/mDNS name-resolution poisoning or ARP spoofing lets you coerce
  and relay authentication on the local segment. Maps to MITRE ATT&CK T1040/T1557;
  the defensive mirror is traffic encryption, protocol disablement, and AiTM
  detection (NIST SC-8/SI-4, CIS Control 3/13).
version: 1.0.0
team: red
app_type: network
killchain:
  framework: mitre-attack
  stage: credential-access
techniques:
  attack: [T1040, T1557, T1557.001, T1557.002]
  capec: [CAPEC-158, CAPEC-94]
  cwe: [CWE-319, CWE-522, CWE-294]
  owasp: []
  d3fend: []
pairs_with: [network-mitm-detection]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Network credential sniffing

## Overview

On a local network, authentication material leaks two ways: some services still send
credentials in cleartext (HTTP basic, FTP, Telnet, unencrypted LDAP/SMTP/SNMPv1/2),
and even when they don't, layer-2 trust weaknesses let an attacker become the
adversary-in-the-middle. Windows name-resolution fallbacks (LLMNR, NBT-NS, mDNS) can
be poisoned so a victim sends authentication to the attacker, and ARP spoofing lets
the attacker sit between hosts and the gateway. This skill, on an authorized internal
engagement, demonstrates that credentials or authentication challenges are capturable
on the segment — proving the exposure so the traffic can be encrypted, the legacy
protocols disabled, and the poisoning detected.

## Authorization & scope

**Run only on internal segments explicitly in scope under a signed ROE that
authorizes traffic interception and AiTM.** Layer-2 attacks affect *other hosts* on
the segment, so scope is critical: confirm which VLANs/hosts are in bounds, prefer an
isolated test segment, and coordinate timing to avoid disrupting production. Capture
only what proves the finding, redact captured credentials to a fingerprint
(protocol, account, hash type) in the report, and **do not** relay/crack captured
material to access systems unless a separate, explicit objective authorizes it. Flush
poisoning/ARP state and restore the segment when finished.

## Preconditions

- An authorized position on an internal segment (physical/VLAN access) and ROE
  covering interception and AiTM.
- Interception tooling (`tcpdump`/Wireshark for passive capture; Responder/`bettercap`
  for poisoning/ARP, used only in scope).
- A monitored, ideally isolated, test segment and a place to store evidence securely.

## Procedure

1. **Passive capture first (least invasive).** Observe the segment for cleartext
   credentials before doing anything active:
   ```bash
   # passively look for cleartext auth (HTTP basic, FTP, Telnet, SNMP community strings)
   tcpdump -i eth0 -s0 -w capture.pcap 'tcp port 21 or port 23 or port 80 or port 143'
   # inspect in Wireshark: follow streams / credential dissectors
   ```
2. **Identify cleartext-protocol exposure.** From the passive capture, list which
   services carry credentials or sensitive data unencrypted — these are findings on
   their own (fix: switch to TLS/SSH equivalents).
3. **Test name-resolution poisoning (scoped).** If in scope, run an LLMNR/NBT-NS/mDNS
   responder to show that a mistyped/misconfigured lookup causes a victim to send
   authentication to you, capturing the (redacted) challenge/response:
   ```bash
   responder -I eth0 -wv   # authorized internal segment only; capture, don't relay
   ```
4. **Test ARP spoofing (scoped).** Where authorized, demonstrate an on-path position
   between a host and the gateway to show unencrypted traffic is interceptable — then
   restore ARP state immediately.
5. **Demonstrate impact, minimally.** Prove that a credential/hash/challenge is
   capturable and stop; do not relay (e.g. SMB relay) or crack unless a separate
   objective authorizes it.
6. **Record** each exposure as (protocol/technique, what was capturable, affected
   hosts), plus the fix: encrypt all authentication (TLS/SSH/SMB signing), disable
   LLMNR/NBT-NS/mDNS where unneeded, enable Dynamic ARP Inspection / DHCP snooping,
   and segment.

## Paired defense / offense

Pairs with **network-mitm-detection**. The cleartext leakage and the poisoning/ARP
activity this skill demonstrates are exactly what that skill removes (encrypt
traffic, disable legacy name resolution, switch/port security) and detects (LLMNR/
NBT-NS responses, ARP anomalies, gratuitous ARP storms). Provide the exact technique
and timing so the defender can confirm their detection fired.

## Validation

Reproduce in an isolated lab segment you own:

1. Stand up a host using a cleartext protocol (e.g. FTP/Telnet) and a Windows-style
   client that falls back to LLMNR/NBT-NS.
2. Passively capture the cleartext credentials, then (in the isolated lab) show
   LLMNR/NBT-NS poisoning coercing an authentication challenge — captured and
   redacted.
3. Apply the paired defenses (encrypt, disable LLMNR/NBT-NS, ARP inspection) and
   confirm the capture and poisoning no longer succeed and the attempts are detected.

_Not yet lab-validated end-to-end (no shipped network lab target); authored and
reviewed against NIST SP 800-115 and standard internal-assessment AiTM methodology._

## References

- MITRE ATT&CK T1040 Network Sniffing; T1557 Adversary-in-the-Middle (T1557.001 LLMNR/NBT-NS Poisoning & SMB Relay, T1557.002 ARP Cache Poisoning)
- NIST SP 800-53 Rev 5: SC-8 Transmission Confidentiality & Integrity, SC-23 Session Authenticity, IA-2/IA-5 Authentication, SI-4 System Monitoring
- NIST CSF 2.0: PR.DS (Data Security), PR.AA (Authentication), DE.CM
- CIS Critical Security Controls v8: 3 (Data Protection), 13 (Network Monitoring & Defense)
- CAPEC-158 Sniffing Network Traffic, CAPEC-94 Adversary in the Middle; CWE-319 Cleartext Transmission, CWE-522 Insufficiently Protected Credentials, CWE-294 Authentication Bypass by Capture-Replay
