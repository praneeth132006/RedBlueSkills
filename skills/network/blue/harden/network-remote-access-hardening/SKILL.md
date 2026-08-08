---
name: network-remote-access-hardening
description: >-
  Harden remote-access services against external-foothold abuse. Use when securing
  internet-facing VPN, RDP, SSH, and management endpoints: minimizing direct exposure
  behind VPN/ZTNA, enforcing phishing-resistant MFA, patching remote-access appliances,
  disabling default accounts, restricting source networks, and monitoring authentication
  so the external access boundary can't be crossed with valid-account or known-CVE
  techniques.
version: 1.0.0
team: blue
app_type: network
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1133, T1078, T1021.001]
  capec: [CAPEC-560]
  cwe: [CWE-287, CWE-1392]
  owasp: []
  d3fend: [D3-MFA, D3-NTA]
pairs_with: [network-remote-access-abuse]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Network remote-access hardening

## Overview

Remote access is the front door, so the defense is to make that door small, strongly
locked, and watched. This skill hardens on four axes: **exposure** (remove direct
internet-facing RDP/SSH/management; put remote access behind a VPN or Zero-Trust
Network Access broker so services aren't reachable from the open internet), **identity**
(phishing-resistant MFA on every remote-access path, no default/self-service accounts,
least-privilege and just-in-time access), **currency** (patch VPN/gateway appliances
promptly — they are prime known-CVE targets — and remove end-of-life devices), and
**scoping + monitoring** (restrict source networks, rate-limit/lockout, and alert on
anomalous authentication). It closes the valid-account and known-CVE foothold the paired
offense proves.

## Authorization & scope

Defensive configuration of remote-access infrastructure you operate. Access logs and
gateway configs contain sensitive topology and identity data — handle under your
data-handling policy. No active testing of third-party systems.

## Preconditions

- Admin access to VPN/ZTNA, remote-access endpoints, the identity provider, and network
  firewalls.
- An inventory of every internet-reachable remote-access service.

## Procedure

1. **Eliminate direct exposure.** Remove RDP/SSH/management interfaces from the public
   internet; require a VPN or ZTNA broker to reach them. Inventory and close anything
   still directly reachable.
2. **Enforce phishing-resistant MFA.** Require MFA (prefer FIDO2/WebAuthn or
   certificate-based) on all remote access; disable password-only and legacy auth paths
   that bypass MFA.
3. **Remove weak/default accounts.** Disable vendor defaults and self-service/local
   accounts on appliances; enforce strong, unique credentials and least-privilege roles;
   use just-in-time elevation for admin access.
4. **Patch and retire appliances.** Track VPN/gateway advisories and patch promptly;
   replace end-of-life devices; subscribe to vendor security notifications for the
   remote-access stack.
5. **Restrict and rate-limit.** Allowlist source networks/geos where feasible, apply
   lockout/rate-limiting to defeat credential attacks, and use short session lifetimes.
6. **Segment the landing zone.** Ensure a remote-access foothold lands in a limited
   segment with least-privilege onward reach, not flat access to the internal network.
7. **Monitor authentication.** Alert on logins from new geos/impossible travel, MFA
   fatigue/denials, auth against unpatched endpoints, and successful logins to
   default/service accounts (see `network-intrusion-detection`).

## Detection engineering notes

- **No direct exposure + phishing-resistant MFA** together defeat the two most common
  footholds (a reachable service and a stuffed/weak credential) at once.
- **Appliance patch latency** is the recurring root cause of VPN compromises — tracking
  and alerting on unpatched, internet-facing remote-access devices is high-value.

## Paired offense / defense

Pairs with **network-remote-access-abuse**. Run that skill before and after: it should
first find an exposed, MFA-less, or unpatched endpoint and gain a foothold, and afterward
find remote access only reachable via VPN/ZTNA, MFA-gated, patched, and source-restricted.

## Validation

Reproduce in a lab network you own:

1. Start from an internet-reachable SSH/RDP/VPN endpoint with a weak password and no
   MFA; confirm the paired skill gains access.
2. Place it behind VPN/ZTNA, enforce MFA, patch, disable defaults, and restrict source
   IPs.
3. Re-run the paired skill and confirm the endpoint is no longer directly reachable or
   enterable, while a legitimate MFA'd user still connects.

## References

- MITRE ATT&CK T1133, T1078, T1021.001; MITRE D3FEND D3-MFA (Multi-factor
  Authentication), D3-NTA (Network Traffic Analysis)
- NIST SP 800-53 Rev 5 (AC-17, IA-2), SP 800-207 Zero Trust Architecture; CISA VPN/RDP
  hardening guidance; CIS Controls v8 (6, 12)
- CAPEC-560; CWE-287, CWE-1392
