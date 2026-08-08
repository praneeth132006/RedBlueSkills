---
name: network-attack-surface-hardening
description: >-
  Reduce and fence off a network's exposed attack surface so discovery and
  exploitation have little to reach. Use when hardening a network estate: inventory
  every listening service, close or restrict what isn't needed, segment management
  and sensitive services behind boundary controls, enforce default-deny ingress and
  egress, and detect scanning/enumeration. Pairs with the network service-discovery
  offense; anchored on NIST SP 800-53 SC-7/CM-7 and CIS Controls v8.
version: 1.0.0
team: blue
app_type: network
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1046, T1595]
  capec: [CAPEC-300]
  cwe: [CWE-284, CWE-668]
  owasp: []
  d3fend: [D3-NTF, D3-PH, D3-ACH]
pairs_with: [network-service-discovery]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Network attack-surface hardening

## Overview

An attacker can only reach what is exposed, so the primary network control is to
minimize and fence the listening surface: know every service, remove the ones that
don't need to run, and put boundary controls in front of the ones that do so only
authorized sources can reach them. This skill covers building an authoritative
service inventory, enforcing least-functionality and default-deny at the network
boundary, segmenting management and sensitive services, and instrumenting the
enumeration attempts that precede an intrusion — the defensive mirror of network
service discovery.

## Authorization & scope

Defensive configuration and monitoring of networks your organization operates.
Firewall rules, segmentation policy, and flow logs describe your own estate — handle
under normal data-handling policy. No active scanning of third-party networks
(coordinate any internal scanning through change control).

## Preconditions

- Authority over the network boundary devices (firewalls, security groups, ACLs,
  NAC) and host firewalls.
- An asset/service inventory source (or the mandate to build one) and network flow/
  telemetry for detection.
- Knowledge of which services are legitimately required and from which sources.

## Procedure

1. **Inventory every listening service.** Maintain an authoritative inventory of
   hosts, open ports, and the owning service/business purpose (NIST CM-8, CIS Control
   1/2). You cannot defend a surface you cannot see; reconcile it against your own
   periodic scan.
2. **Enforce least functionality.** Disable or uninstall services that aren't
   needed, bind services to the narrowest interface, and remove default/listening
   daemons (NIST CM-7, CIS Control 4). Every closed port is one the paired offense
   can't find.
3. **Default-deny at the boundary.** Firewalls/security groups should deny all
   ingress except explicitly allowed service+source pairs, and restrict egress to
   what workloads need (NIST SC-7 Boundary Protection; CIS Control 4/13). Never
   expose management/remote-access services (SSH, RDP, SMB, WinRM, DBs, IPMI) to the
   internet or a flat internal network.
4. **Segment.** Place management interfaces, sensitive data stores, and crown-jewel
   systems in separate segments/VLANs with tightly scoped inter-segment rules and
   jump-host access (NIST SC-7, AC-4 Information Flow Enforcement; CIS Control 12).
   Segmentation caps the blast radius of any single foothold.
5. **Detect scanning and enumeration.** Alert on horizontal/vertical port sweeps,
   spikes in blocked-connection attempts, and access to services from unexpected
   sources (NIST SI-4 System Monitoring; MITRE D3FEND Network Traffic Analysis) —
   these precede exploitation and give early warning.
6. **Continuously verify.** Re-scan your own ranges on a schedule and diff against the
   inventory; fail change control on any newly-exposed service that isn't approved.

## Detection engineering notes

- The load-bearing control is **default-deny boundary + segmentation**: it shrinks
  what discovery can even see and contains what any exploit can reach.
- Scan detection is the early-warning backstop — a rising count of blocked
  connections across many ports/hosts from one source is enumeration, not normal
  traffic.

## Paired offense / defense

Pairs with **network-service-discovery**. Run that skill before and after: beforehand
it inventories a broad exposed surface including an over-exposed management port;
after hardening the same scan sees only the intended services, the management port is
unreachable from the test source, and the scan trips the enumeration alert.

## Validation

Reproduce in a lab network you own:

1. Start from the lab subnet with an over-exposed management port; confirm the paired
   skill discovers it.
2. Apply least-functionality, default-deny boundary rules, and segmentation, and
   enable scan detection.
3. Re-run the paired skill and confirm the surface shrank to the intended services
   and the scan generated an alert.

_Not yet lab-validated end-to-end (no shipped network lab target); authored and
reviewed against NIST SP 800-53 Rev 5 and CIS Controls v8._

## References

- MITRE ATT&CK T1046, T1595 (defensive context); MITRE D3FEND D3-NTF (Network Traffic Filtering), D3-PH (Platform Hardening), D3-ACH (Application Configuration Hardening)
- NIST SP 800-53 Rev 5: SC-7 Boundary Protection, CM-7 Least Functionality, CM-8 System Component Inventory, AC-4 Information Flow Enforcement, SI-4 System Monitoring
- NIST CSF 2.0: ID.AM (Asset Management), PR.PS/PR.IR (Platform/Infrastructure Resilience), DE.CM (Continuous Monitoring)
- CIS Critical Security Controls v8: 1/2 (Inventory), 4 (Secure Configuration), 12 (Network Infrastructure Management), 13 (Network Monitoring & Defense)
- CAPEC-300; CWE-284, CWE-668
