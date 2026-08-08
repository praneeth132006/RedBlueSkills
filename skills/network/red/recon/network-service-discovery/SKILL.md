---
name: network-service-discovery
description: >-
  Enumerate reachable hosts, open ports, and running services during an authorized
  network assessment. Use at the start of an engagement when you need to map the
  live attack surface of an in-scope network range — which hosts respond, which
  TCP/UDP services listen, and their product/version banners — to prioritize targets
  and feed later access, credential, and lateral-movement steps. Maps to MITRE
  ATT&CK T1046/T1595 and the recon phase; the defensive mirror is attack-surface
  reduction (NIST SC-7/CM-7, CIS Control 12/4).
version: 1.0.0
team: red
app_type: network
killchain:
  framework: mitre-attack
  stage: recon
techniques:
  attack: [T1046, T1595, T1595.001]
  capec: [CAPEC-300]
  cwe: [CWE-284, CWE-668]
  owasp: []
  d3fend: []
pairs_with: [network-attack-surface-hardening]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Network service discovery

## Overview

Every network engagement starts by turning an IP range into a map of what is
actually reachable: which hosts are alive, which TCP and UDP ports are open, and
what software (with what version) sits behind each one. That map is the input to
everything downstream — a forgotten management port, an unpatched service banner, or
an unexpected host is where the next step begins. This skill performs host discovery
and service/version enumeration across an authorized scope, records the exposed
surface, and flags the services worth deeper testing, so the defender can reduce
that surface (close ports, segment, patch) and detect the scan itself.

## Authorization & scope

**Run only against IP ranges and hosts explicitly named in a signed rules-of-
engagement**, within the agreed testing window, from an agreed source address.
Scanning is noisy and can disrupt fragile services — throttle rate, avoid
intrusive/UDP-flood options against production, and confirm which hosts are
out-of-scope before you start. The deliverable is the *inventory of exposed
services*, not exploitation; stop at identification. Do not scan third-party or
cloud-provider infrastructure that the ROE does not cover.

## Preconditions

- A signed scope (CIDR ranges / hostnames), a testing window, and an approved
  source IP.
- Reachability to the target network (on-net, VPN, or an agreed jump host).
- Scanning tooling (`nmap` and friends) and a place to record results.

## Procedure

1. **Host discovery.** Identify live hosts in scope before port-scanning everything:
   ```bash
   # ping/ARP sweep of an in-scope range (adjust for ICMP-filtered nets)
   nmap -sn 10.0.0.0/24 -oA discovery-hosts
   ```
2. **Port and service enumeration.** Enumerate open TCP ports and fingerprint the
   services and versions on the live hosts:
   ```bash
   # rate-limited SYN scan + service/version detection on discovered hosts
   nmap -sS -sV --top-ports 1000 --max-rate 200 -iL live-hosts.txt -oA services-tcp
   # targeted UDP for common exposed services (DNS/SNMP/NTP) — slow, scope carefully
   nmap -sU -sV -p 53,123,161 -iL live-hosts.txt -oA services-udp
   ```
3. **Classify the surface.** For each open service record host, port, protocol,
   product/version, and exposure (internet-facing vs. internal). Flag management and
   remote-access services (SSH, RDP, SMB, WinRM, databases, hypervisor/IPMI, admin
   web UIs) that are exposed more widely than they should be.
4. **Prioritize.** Rank targets by exposure × sensitivity × likely weakness (stale
   versions, default-port admin services, unexpected hosts). These feed the
   service-exploitation, TLS-assessment, and credential-access skills.
5. **Record** the full inventory (a machine-readable `nmap -oX`/`-oA` set plus a
   ranked target list) and note discovery method so the defender can correlate the
   scan in their telemetry.

## Paired defense / offense

Pairs with **network-attack-surface-hardening**. The exposed services this skill
inventories are exactly what that skill removes or fences off (close unused ports,
segment management interfaces, restrict source ranges) and detects (scan/enumeration
signatures). Hand the ranked inventory to the blue side as the punch list.

## Validation

Reproduce in a lab network you own:

1. Stand up a small subnet with a mix of services (SSH, a web server, SMB, a
   database) and one deliberately over-exposed management port.
2. Run host discovery then service/version enumeration and confirm the inventory
   captures every listening service and flags the over-exposed one.
3. Apply the paired hardening (close/segment the port) and re-scan to confirm the
   surface shrank.

_Not yet lab-validated end-to-end (no shipped network lab target); authored and
reviewed against NIST SP 800-115 (Technical Guide to Information Security Testing)
and standard `nmap` methodology._

## References

- MITRE ATT&CK T1046 Network Service Discovery; T1595 Active Scanning (T1595.001 Scanning IP Blocks)
- NIST SP 800-115 Technical Guide to Information Security Testing & Assessment
- NIST SP 800-53 Rev 5 CM-7 (Least Functionality), CM-8 (System Component Inventory), SC-7 (Boundary Protection); NIST CSF 2.0 ID.AM, PR.PS
- CIS Critical Security Controls v8: Control 1/2 (Inventory), Control 4 (Secure Configuration), Control 12 (Network Infrastructure Management)
- CAPEC-300 Port Scanning; CWE-284 Improper Access Control; CWE-668 Exposure of Resource to Wrong Sphere
