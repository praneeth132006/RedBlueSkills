---
name: network-intrusion-detection
description: >-
  Detect and contain exploitation of exposed network services. Use when defending a
  network estate: closing the vulnerabilities that make services exploitable (patch,
  configuration, authentication), and instrumenting IDS/IPS, protocol-anomaly, and
  server-behavior monitoring to catch and block exploitation attempts and the
  foothold that follows. Pairs with the network service-exploitation offense;
  anchored on NIST SI-2/SI-4 and CIS Controls v8 (7, 13).
version: 1.0.0
team: blue
app_type: network
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1190, T1210]
  capec: [CAPEC-100]
  cwe: [CWE-1035, CWE-284, CWE-306]
  owasp: []
  d3fend: [D3-NTA, D3-ISVA, D3-PH]
pairs_with: [network-service-exploitation]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Network intrusion detection

## Overview

Service exploitation is defended on two fronts: remove the vulnerability so there is
nothing to exploit, and watch for the attempt and the foothold in case something was
missed. This skill pairs vulnerability and configuration management (patch, secure
config, require authentication) with network detection — IDS/IPS signatures,
protocol/behavior anomaly analysis, and monitoring of the server's own behavior
(unexpected child processes, new outbound connections) — so an exploitation attempt
is blocked or caught early and contained by segmentation. It is the defensive mirror
of network service exploitation.

## Authorization & scope

Defensive monitoring and remediation of networks and hosts your organization
operates. Packet captures and IDS logs may contain sensitive payloads — handle under
your data-handling and retention policy. No active exploitation; coordinate any
internal validation testing through change control.

## Preconditions

- A vulnerability-management program (or the mandate to run one) and authority to
  patch/reconfigure services.
- Network sensor placement (IDS/IPS, NetFlow/packet capture) at boundaries and key
  internal chokepoints, plus host telemetry (EDR) on servers.
- Segmentation in place so a foothold can be contained (see
  `network-attack-surface-hardening`).

## Procedure

1. **Remove the vulnerability first.** Prioritize and remediate known-vulnerable
   services (patch/upgrade), correct default/weak configurations, and require
   authentication on every sensitive service (NIST SI-2 Flaw Remediation, RA-5
   Vulnerability Monitoring, CM-6; CIS Control 7). The best exploit detection is a
   service that isn't vulnerable.
2. **Deploy signature detection/prevention.** Run IDS/IPS (Suricata/Snort/Zeek-based)
   at boundaries and internal chokepoints with maintained rulesets for known exploit
   traffic; run in prevention mode where the risk of disruption is acceptable (NIST
   SI-4; CIS Control 13).
3. **Add protocol and behavior anomaly detection.** Beyond signatures, alert on
   protocol anomalies and on servers behaving abnormally — a web/database server
   spawning a shell, making unexpected outbound connections, or transferring tooling
   inbound (MITRE D3FEND Network Traffic Analysis; T1210 detection).
4. **Monitor the foothold indicators.** Correlate IDS hits with host EDR: new
   processes, new listening ports, or new persistence right after an inbound hit to a
   vulnerable service is a strong post-exploitation signal.
5. **Contain by segmentation and response.** Ensure a detected foothold can be
   isolated quickly (segment/NAC quarantine, block egress) and wire alerts into an
   incident-response runbook (NIST CSF RS.*; IR-4).
6. **Continuously verify.** Replay the paired offense's exploit traffic (in a lab or
   controlled window) and confirm the signature/anomaly detection fires and, where
   enabled, prevention blocks it.

## Detection engineering notes

- Layer signature + anomaly + host behavior: signatures catch the known, anomaly
  catches the variant, and host behavior (a server suddenly acting like a client)
  catches what got through.
- The highest-fidelity post-exploitation signal is **a server making unexpected
  outbound connections or spawning interactive processes** right after inbound
  traffic to a vulnerable port.

## Paired offense / defense

Pairs with **network-service-exploitation**. Run that skill against a monitored lab:
the exploit traffic trips the IDS/IPS signature, the resulting shell/outbound trips
the behavior anomaly, and — with the vulnerability patched — the exploit fails
outright, demonstrating both prevention and detection.

## Validation

Reproduce in a lab you own:

1. Deploy the vulnerable service from the paired skill behind an IDS/IPS with host
   EDR; confirm the exploit succeeds and generates detections.
2. Patch/reconfigure the service and enable prevention.
3. Re-run the paired skill and confirm the exploit is blocked/patched and the attempt
   is alerted and contained.

_Not yet lab-validated end-to-end (no shipped network lab target); authored and
reviewed against NIST SP 800-53 Rev 5, NIST SP 800-94 (IDPS), and CIS Controls v8._

## References

- MITRE ATT&CK T1190, T1210 (defensive context); MITRE D3FEND D3-NTA (Network Traffic Analysis), D3-ISVA (Inbound Session Volume Analysis), D3-PH (Platform Hardening)
- NIST SP 800-94 Guide to Intrusion Detection and Prevention Systems; NIST SP 800-40 Patch Management
- NIST SP 800-53 Rev 5: SI-2 Flaw Remediation, SI-4 System Monitoring, RA-5 Vulnerability Monitoring, CM-6 Configuration Settings, IR-4 Incident Handling
- NIST CSF 2.0: PR.PS, DE.CM (Continuous Monitoring), DE.AE (Adverse Event Analysis), RS.MA/RS.AN (Response)
- CIS Critical Security Controls v8: 7 (Continuous Vulnerability Management), 13 (Network Monitoring & Defense)
- CAPEC-100; CWE-1035, CWE-284, CWE-306
