---
name: network-lateral-movement
description: >-
  Move laterally from an initial foothold to additional hosts during an authorized
  assessment. Use when you hold access to one system plus valid or reusable
  credential material and need to prove that flat networks and reused credentials let
  you reach further hosts via remote services (SMB/RDP/SSH/WinRM) or alternate
  authentication material (pass-the-hash/ticket). Maps to MITRE ATT&CK
  T1021/T1550/T1570; the defensive mirror is segmentation, credential hygiene, and
  lateral-movement detection (NIST AC-4/SC-7/IA-5, CIS Control 4/6/13).
version: 1.0.0
team: red
app_type: network
killchain:
  framework: mitre-attack
  stage: lateral-movement
techniques:
  attack: [T1021, T1021.001, T1021.002, T1550, T1570]
  capec: [CAPEC-555, CAPEC-645]
  cwe: [CWE-522, CWE-284, CWE-306]
  owasp: []
  d3fend: []
pairs_with: [network-lateral-movement-detection]
risk:
  level: high
  reversible: false
  data_touch: read-write
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Network lateral movement

## Overview

A single foothold becomes an enterprise compromise through lateral movement: using
valid credentials (or reusable authentication material like NTLM hashes and Kerberos
tickets) to authenticate to *other* hosts over legitimate remote-access services —
SMB, RDP, SSH, WinRM. Two weaknesses make it work: **flat networks** where any host
can reach any other, and **credential reuse** where one account (especially a shared
local admin) works everywhere. This skill, under explicit authorization, demonstrates
reaching additional in-scope hosts from a foothold to prove those weaknesses exist —
so the defender can segment, break credential reuse, and detect the movement. It is
high-risk and destructive-capable; scope and restraint are essential.

## Authorization & scope

**Run only under a signed ROE that explicitly authorizes lateral movement and names
the hosts/segments in bounds.** This step authenticates to and can alter additional
production systems, so: confirm each target host is in scope before touching it, use
provided test credentials where possible, prove reach with the least-invasive action
(authenticate + read the host identity), and **do not** access real data, deploy
persistence, or move to out-of-scope hosts. Movement is not cleanly reversible —
record every host touched and action taken for attribution and cleanup. Do not crack
or relay credentials beyond what the ROE authorizes.

## Preconditions

- An authorized foothold plus valid or reusable credential material, and ROE that
  explicitly covers lateral movement to named targets.
- Reachability to candidate hosts over remote-access services (from
  `network-service-discovery`).
- A record-keeping process and a cleanup/contact plan for any changes.

## Procedure

1. **Enumerate reachable remote-access services and privileges.** From the foothold,
   identify which in-scope hosts expose SMB/RDP/SSH/WinRM and where the held
   credentials are likely to be valid (e.g. shared local-admin reuse):
   ```bash
   # example: check which hosts a credential can authenticate to (illustrative, in-scope only)
   crackmapexec smb 10.0.0.0/24 -u svc_test -p '<provided-test-cred>' --shares
   ```
2. **Authenticate to an in-scope target.** Use the credential over a legitimate
   service to reach one additional host, proving the account is valid there — prefer a
   read-only identity check to confirm access:
   ```bash
   # confirm remote access, then stop (illustrative)
   crackmapexec smb host2.in.scope -u svc_test -p '<provided-test-cred>' -x 'hostname'
   ```
3. **Demonstrate alternate-auth-material reuse (if authorized).** Where the ROE
   covers it, show that captured NTLM hashes or Kerberos tickets authenticate without
   the plaintext password (pass-the-hash / pass-the-ticket), proving credential
   material is reusable across hosts — then stop.
4. **Map the reachable blast radius.** From what authenticated successfully, document
   which hosts/segments a single credential reaches — the measure of flat-network and
   credential-reuse risk — without exercising further access.
5. **Do not persist or collect.** Halt at demonstrated reach; persistence, collection,
   and exfiltration are separate objectives requiring their own explicit sign-off.
6. **Record** each hop as (source, target, service, credential/material used, proof),
   the reachable blast radius, and the fix: segment east-west traffic, eliminate
   shared/reused local-admin credentials (LAPS/unique creds), enforce MFA and tiered
   admin, and detect anomalous remote authentication.

## Paired defense / offense

Pairs with **network-lateral-movement-detection**. The cross-host authentications and
remote-service sessions this skill produces are exactly what that skill contains
(east-west segmentation, credential-reuse elimination, tiered admin) and detects
(anomalous SMB/RDP/WinRM auth, pass-the-hash/ticket signatures, service-account logon
anomalies). Hand over each hop and its timing so the defender can confirm detection.

## Validation

Reproduce in a lab you own:

1. Build a small flat lab with a shared local-admin credential across two hosts and
   remote services enabled.
2. From a foothold, authenticate to the second host with the reused credential
   (and, if modeling AD, demonstrate pass-the-hash) — proving reach with a read-only
   check.
3. Apply the paired defenses (segmentation, unique local-admin creds/LAPS, detection)
   and confirm the movement is blocked/contained and alerted.

_Not yet lab-validated end-to-end (no shipped network lab target); authored and
reviewed against MITRE ATT&CK lateral-movement guidance and NIST SP 800-115._

## References

- MITRE ATT&CK T1021 Remote Services (T1021.001 RDP, T1021.002 SMB/Admin Shares, T1021.004 SSH); T1550 Use Alternate Authentication Material (T1550.002 Pass-the-Hash, T1550.003 Pass-the-Ticket); T1570 Lateral Tool Transfer
- NIST SP 800-53 Rev 5: AC-4 Information Flow Enforcement, SC-7 Boundary Protection, AC-6 Least Privilege, IA-2/IA-5 Authentication & Authenticators, AC-2 Account Management
- NIST CSF 2.0: PR.AA (Authentication), PR.IR (Infrastructure Resilience), DE.CM
- CIS Critical Security Controls v8: 4 (Secure Configuration), 5/6 (Account & Access Management), 12/13 (Network Management & Defense)
- CAPEC-555 Remote Services with Stolen Credentials, CAPEC-645 Use of Captured Tickets (Pass-the-Ticket); CWE-522, CWE-284, CWE-306
