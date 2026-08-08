---
name: network-mitm-detection
description: >-
  Stop and detect layer-2 adversary-in-the-middle and credential sniffing on
  internal networks. Use when defending an internal estate: encrypting all
  authentication and sensitive traffic, disabling legacy name-resolution
  (LLMNR/NBT-NS/mDNS), enabling switch protections (Dynamic ARP Inspection, DHCP
  snooping, port security), and alerting on ARP anomalies and rogue name-resolution
  responders. Pairs with the network credential-sniffing offense; anchored on NIST
  SC-8/SI-4 and CIS Controls v8 (3, 13).
version: 1.0.0
team: blue
app_type: network
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1040, T1557, T1557.001, T1557.002]
  capec: [CAPEC-158, CAPEC-94]
  cwe: [CWE-319, CWE-522, CWE-294]
  owasp: []
  d3fend: [D3-NTA, D3-ET, D3-NTF]
pairs_with: [network-credential-sniffing]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Network MITM detection

## Overview

Layer-2 adversary-in-the-middle works because the local segment extends trust it
shouldn't — cleartext protocols expose credentials, legacy name resolution answers
any responder, and ARP has no authentication. The defense removes that trust and
watches what's left: encrypt everything so a captured packet is useless, disable the
legacy fallbacks an attacker abuses, turn on the switch features that authenticate
layer-2, and alert on the tell-tale poisoning and ARP anomalies. This skill lays out
those controls and detections — the defensive mirror of network credential sniffing.

## Authorization & scope

Defensive configuration and monitoring of internal networks your organization
operates. Packet/flow telemetry may contain sensitive data — handle under your data-
handling and retention policy. No active AiTM; coordinate any internal validation
through change control on an isolated segment.

## Preconditions

- Authority over switching/network infrastructure (managed switches, DHCP), host
  configuration (name-resolution settings, SMB signing), and monitoring.
- Segment telemetry (span/tap, switch logs, NetFlow) and a detection/alerting
  pipeline.
- An inventory of legacy/cleartext protocols still in use and a migration plan.

## Procedure

1. **Encrypt all authentication and sensitive traffic.** Replace cleartext protocols
   (Telnet→SSH, FTP→SFTP/FTPS, HTTP→HTTPS, LDAP→LDAPS, SNMPv1/2→v3); require SMB
   signing and channel encryption. A captured packet then yields nothing (NIST SC-8;
   CIS Control 3).
2. **Disable legacy name resolution.** Turn off LLMNR, NBT-NS, and mDNS where they
   aren't required (GPO/registry/host config) so there is no fallback for a responder
   to poison — this single change neutralizes the most common internal AiTM.
3. **Authenticate layer-2 on switches.** Enable Dynamic ARP Inspection (with DHCP
   snooping), port security, and where feasible 802.1X/NAC so ARP spoofing and rogue
   devices are blocked at the switch (NIST SC-7; CIS Control 13).
4. **Detect poisoning and ARP anomalies.** Alert on LLMNR/NBT-NS/mDNS responses on
   segments where they should be silent, on gratuitous-ARP storms and MAC/IP binding
   changes, and on a host answering for many names/IPs — the signatures of Responder
   and ARP spoofing (MITRE D3FEND Network Traffic Analysis; NIST SI-4).
5. **Detect cleartext credentials in flight.** Where lawful and scoped, alert on
   credential patterns over cleartext protocols on the monitored segment — both a
   detection and a migration backlog.
6. **Continuously verify.** Run the paired offense on an isolated lab segment and
   confirm the capture yields only ciphertext, poisoning finds no fallback, ARP
   spoofing is blocked by DAI, and the detections fire.

## Detection engineering notes

- The two highest-leverage controls are **disabling LLMNR/NBT-NS/mDNS** and
  **encrypting authentication** — together they remove the coercion path and make any
  intercept worthless, even before switch-level protections.
- The clearest AiTM alert is **a name-resolution response where none should exist**,
  or a host suddenly claiming to be the gateway (ARP binding change) — neither occurs
  in normal operation.

## Paired offense / defense

Pairs with **network-credential-sniffing**. Run that skill on a monitored lab segment:
with traffic encrypted the capture is useless, with LLMNR/NBT-NS disabled the
responder gets no victims, with DAI enabled the ARP spoof is dropped, and every
attempt trips a detection.

## Validation

Reproduce in an isolated lab you own:

1. Start from the segment with a cleartext protocol and LLMNR/NBT-NS enabled; confirm
   the paired skill captures credentials and coerces a challenge.
2. Encrypt the protocol, disable LLMNR/NBT-NS, enable DAI/DHCP snooping, and add the
   poisoning/ARP detections.
3. Re-run the paired skill and confirm the capture is ciphertext-only, poisoning
   fails, ARP spoofing is blocked, and the alerts fire.

_Not yet lab-validated end-to-end (no shipped network lab target); authored and
reviewed against NIST SP 800-53 Rev 5 and CIS Controls v8._

## References

- MITRE ATT&CK T1040, T1557 (T1557.001 LLMNR/NBT-NS, T1557.002 ARP) — defensive context; MITRE D3FEND D3-NTA (Network Traffic Analysis), D3-ET (Encrypted Tunnels), D3-NTF (Network Traffic Filtering)
- NIST SP 800-53 Rev 5: SC-8 Transmission Confidentiality & Integrity, SC-7 Boundary Protection, SC-23 Session Authenticity, IA-2/IA-5, SI-4 System Monitoring
- NIST CSF 2.0: PR.DS, PR.AA, DE.CM (Continuous Monitoring), DE.AE (Adverse Event Analysis)
- CIS Critical Security Controls v8: 3 (Data Protection), 13 (Network Monitoring & Defense); Microsoft guidance on disabling LLMNR/NBT-NS and requiring SMB signing
- CAPEC-158, CAPEC-94; CWE-319, CWE-522, CWE-294
