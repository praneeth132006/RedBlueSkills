---
name: network-lateral-movement-detection
description: >-
  Contain and detect lateral movement across an internal network. Use when defending
  an estate: segmenting east-west traffic so a foothold can't reach everything,
  eliminating shared/reused credentials and enforcing tiered admin and MFA, and
  alerting on anomalous remote authentication (SMB/RDP/WinRM/SSH) and
  pass-the-hash/ticket. Pairs with the network lateral-movement offense; anchored on
  NIST AC-4/SC-7/IA-5 and CIS Controls v8 (4, 5/6, 12/13).
version: 1.0.0
team: blue
app_type: network
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1021, T1550, T1570]
  capec: [CAPEC-555, CAPEC-645]
  cwe: [CWE-522, CWE-284, CWE-306]
  owasp: []
  d3fend: [D3-NTA, D3-UBA, D3-NI]
pairs_with: [network-lateral-movement]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Network lateral-movement detection

## Overview

Lateral movement depends on two things the defender controls: whether a foothold can
*reach* other hosts, and whether one credential *works* on them. Take away flat
reachability with segmentation, take away credential reuse with unique credentials
and tiered administration, and the attacker is stuck on the first host. What movement
remains is then loud — cross-host authentication over admin services and
alternate-auth-material reuse are rare in normal operation and highly detectable.
This skill combines those containment controls with the detections that catch what
gets through, the defensive mirror of network lateral movement.

## Authorization & scope

Defensive configuration and monitoring of networks and identity systems your
organization operates. Authentication logs and flow telemetry contain sensitive
identity data — handle under your data-handling and retention policy. No active
movement; coordinate any internal validation through change control.

## Preconditions

- Authority over network segmentation (firewalls/ACLs/microsegmentation), identity/
  account management, and endpoint/authentication logging.
- Centralized authentication and host logs (Windows Security/Sysmon, SSH/WinRM logs)
  feeding a SIEM.
- A model of normal administrative access paths (who administers what, from where).

## Procedure

1. **Segment east-west traffic.** Deny host-to-host traffic by default; allow only
   the specific service+source pairs administration requires, and force admin access
   through jump hosts (NIST AC-4 Information Flow Enforcement, SC-7; CIS Control 12).
   Segmentation caps how far any single foothold can reach.
2. **Eliminate credential reuse.** Ensure local-admin passwords are unique per host
   (LAPS or equivalent), remove shared service accounts, and rotate credentials —
   so one stolen credential doesn't unlock the estate (NIST IA-5; CIS Control 5/6).
3. **Enforce tiered administration and MFA.** Separate admin tiers (workstation /
   server / domain), forbid high-tier credentials from logging into low-tier hosts,
   and require MFA/phishing-resistant auth for administrative access (NIST AC-6,
   IA-2; reduces T1550 value).
4. **Detect anomalous remote authentication.** Alert on a host/account authenticating
   to many hosts in a short window, first-time source→destination admin sessions,
   service-account interactive/remote logons, and off-hours admin access (MITRE
   D3FEND User Behavior Analysis; NIST SI-4).
5. **Detect alternate-auth-material abuse.** Watch for pass-the-hash/over-pass-the-
   hash and pass-the-ticket signatures (NTLM where Kerberos is expected, anomalous
   ticket lifetimes/encryption, logon-type anomalies) and lateral tool transfer
   (unexpected files written over admin shares).
6. **Continuously verify.** Run the paired offense in a controlled window and confirm
   segmentation blocks the reach, unique credentials stop the reuse, and the remote-
   auth/PtH detections fire; feed gaps back into rules and access reviews.

## Detection engineering notes

- The load-bearing controls are **segmentation** and **no credential reuse**: they
  remove reachability and credential validity, the two prerequisites of movement.
  Detection is the backstop for what remains.
- The highest-fidelity alerts are **one credential authenticating to an unusual set
  of hosts** and **NTLM/pass-the-hash where interactive Kerberos is expected** —
  both are rare outside an attack.

## Paired offense / defense

Pairs with **network-lateral-movement**. Run that skill against a monitored lab: with
segmentation the second host is unreachable, with unique local-admin credentials the
reused credential fails, and any authentication that does occur trips the remote-auth
/ pass-the-hash detection — turning silent movement into a blocked, alerted event.

## Validation

Reproduce in a lab you own:

1. Start from the flat lab with a shared local-admin credential; confirm the paired
   skill moves to the second host.
2. Apply east-west segmentation, unique per-host credentials (LAPS), tiered admin,
   and the remote-auth/PtH detections.
3. Re-run the paired skill and confirm the movement is blocked/contained and the
   attempt is alerted, while legitimate admin paths still work.

_Not yet lab-validated end-to-end (no shipped network lab target); authored and
reviewed against MITRE ATT&CK, NIST SP 800-53 Rev 5, and CIS Controls v8._

## References

- MITRE ATT&CK T1021 Remote Services, T1550 Use Alternate Authentication Material, T1570 Lateral Tool Transfer — defensive context; MITRE D3FEND D3-NTA (Network Traffic Analysis), D3-UBA (User Behavior Analysis), D3-NI (Network Isolation)
- NIST SP 800-53 Rev 5: AC-4 Information Flow Enforcement, SC-7 Boundary Protection, AC-6 Least Privilege, IA-2/IA-5, AC-2 Account Management, SI-4 System Monitoring
- NIST CSF 2.0: PR.AA (Authentication), PR.IR (Infrastructure Resilience), DE.CM, DE.AE, RS.MA
- NIST SP 800-207 Zero Trust Architecture; Microsoft tiered-administration / LAPS guidance
- CIS Critical Security Controls v8: 4, 5/6 (Account & Access Management), 12/13 (Network Management & Defense)
- CAPEC-555, CAPEC-645; CWE-522, CWE-284, CWE-306
