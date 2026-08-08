---
name: network-egress-filtering-hardening
description: >-
  Harden the outbound network boundary against exfiltration and C2 over permitted
  channels. Use when constraining egress: default-deny outbound with an allowlist,
  forcing web traffic through a logging proxy and DNS through controlled resolvers,
  inspecting TLS where lawful, and detecting DNS tunneling, ICMP payloads, and anomalous
  outbound volume — so a foothold host cannot move data past the boundary unseen.
version: 1.0.0
team: blue
app_type: network
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1048.003, T1071.004]
  capec: [CAPEC-116]
  cwe: [CWE-200, CWE-923]
  owasp: []
  d3fend: [D3-NTA, D3-OTF]
pairs_with: [network-egress-exfiltration]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Network egress filtering hardening

## Overview

Most networks default-allow outbound, which hands attackers a free exfiltration and C2
path over whatever protocol blends in. The defense is to treat egress like ingress:
**default-deny with an allowlist.** This skill hardens the outbound boundary on four
axes: **filtering** (deny outbound by default; allow only the specific destinations/
ports each segment needs), **chokepoints** (force web egress through an authenticated,
logging proxy and DNS through controlled internal resolvers — no direct port 53/443 to
the internet), **inspection** (TLS inspection where lawful and DLP on the proxy so
content, not just connections, is examined), and **detection** (alert on DNS tunneling,
ICMP payloads, alternative-port egress, new external destinations, and anomalous
outbound volume). It closes the channels the paired exfiltration skill exploits.

## Authorization & scope

Defensive configuration of egress controls you operate. Proxy/DNS/flow logs contain
sensitive browsing and data-flow information — handle under your data-handling and
privacy policy, and apply TLS inspection only where lawful and disclosed. No active
testing of third-party systems.

## Preconditions

- Admin access to egress firewalls, the web proxy, DNS resolvers, and flow/DNS logging.
- An inventory of the legitimate outbound destinations each network segment needs.

## Procedure

1. **Default-deny egress.** Set outbound firewall policy to deny by default and allow
   only required destinations/ports per segment; remove blanket "any/any" outbound
   rules, especially from servers.
2. **Force a web proxy.** Route all web egress through an authenticated, logging proxy;
   block direct outbound 80/443 that bypasses it; categorize and allowlist destinations,
   deny uncategorized/newly-registered domains.
3. **Control DNS.** Require internal resolvers with query logging; block direct external
   DNS (port 53) and DoH bypass to public resolvers; enable DNS filtering for known-bad
   and tunneling-indicative domains.
4. **Inspect where lawful.** Apply TLS inspection and DLP at the proxy so exfiltration
   content and data patterns are examined, not just connection metadata — within legal/
   privacy constraints.
5. **Restrict other channels.** Block or tightly limit outbound ICMP payloads and
   non-standard ports; deny egress from segments that have no business talking to the
   internet at all.
6. **Detect tunneling and anomalies.** Alert on high-entropy/high-volume DNS to a single
   domain (tunneling), large ICMP payloads, alternative-port egress, new external
   destinations from servers, and outbound volume spikes.
7. **Review egress allowlists.** Periodically prune allowed destinations and confirm
   segments still need their outbound reach.

## Detection engineering notes

- **Default-deny egress + forced proxy/resolver** is the structural win: it collapses
  dozens of possible exfil channels into a few inspected chokepoints.
- **DNS tunneling detection** (entropy/volume per domain) is the highest-value single
  analytic, because DNS is the channel most often left fully open and unlogged.

## Paired offense / defense

Pairs with **network-egress-exfiltration**. Run that skill before and after: it should
first move a benign marker out over DNS/HTTPS/alt-port, and afterward find egress
default-denied, forced through logging chokepoints, with the marker blocked and the
tunneling attempt alerted.

## Validation

Reproduce in a lab network you own:

1. Confirm the paired skill exfiltrates a marker over DNS and HTTPS from an
   open-egress host.
2. Apply default-deny egress, a forced logging proxy/resolver, and DNS-tunnel/anomaly
   detection.
3. Re-run the paired skill and confirm the marker no longer leaves and the attempt is
   alerted, while legitimate allowlisted egress still works.

## References

- MITRE ATT&CK T1048.003, T1071.004; MITRE D3FEND D3-NTA (Network Traffic Analysis),
  D3-OTF (Outbound Traffic Filtering)
- NIST SP 800-53 Rev 5 (SC-7 Boundary Protection, AU-6 Audit Review); NIST CSF 2.0
  (PR.IR, DE.CM); CIS Controls v8 (13 Network Monitoring & Defense, 3 Data Protection)
- CAPEC-116; CWE-200, CWE-923
