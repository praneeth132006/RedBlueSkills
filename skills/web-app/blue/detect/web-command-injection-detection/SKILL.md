---
name: web-command-injection-detection
description: >-
  Detect OS command injection attempts and successful execution against a web
  application using request telemetry, process/EDR events, and outbound network
  logs. Use when building or tuning command-injection detections, triaging a
  suspected RCE alert, or hunting for shell abuse from a web tier.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1190, T1059]
  capec: [CAPEC-248]
  cwe: [CWE-78]
  owasp: ["A03:2021"]
  d3fend: [D3-PSA, D3-NTA]
pairs_with: [web-command-injection]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web OS command injection detection

## Overview

Detect command injection by correlating three layers: request logs (shell
metacharacters in parameters), host process telemetry (unexpected child processes
of the web service account), and egress logs (DNS/HTTP callbacks the app tier
should never make). Payloads may be blind, so process and network signals are
often stronger than request patterns alone.

## Authorization & scope

Passive defensive analysis of telemetry from systems you operate. Request bodies
and command arguments may contain secrets — mask before sharing. Do not replay
captured payloads against production.

## Preconditions

- Web/WAF access logs, plus host EDR/auditd process-creation events for the app
  hosts, and outbound DNS/proxy logs.
- A SIEM for correlation (examples use a generic Splunk/KQL-like syntax).

## Procedure

1. **Request-layer signatures.** URL/case-normalize, then match shell control in
   parameter *values*:
   ```
   index=web sourcetype=access
   | eval q=urldecode(uri_query)
   | where match(q, "(;|\|\||&&|\$\(|`|\|\s*(id|whoami|uname|cat|curl|wget|nslookup))")
   | stats count by src_ip, uri_path, q
   ```
2. **Process-layer (highest fidelity).** Alert when the web service account spawns
   a shell or recon binary:
   ```
   index=edr event=process_start parent_process IN ("php-fpm","node","java","python*","w3wp.exe")
   child_process IN ("sh","bash","cmd.exe","powershell.exe","id","whoami","nslookup","curl","wget")
   | stats count by host, parent_process, child_process, user
   ```
3. **Egress-layer.** Flag DNS lookups / HTTP from app hosts to newly-seen or
   random-looking domains (OOB confirmation channels).
4. **Timing.** A parameter value containing `sleep`/`ping -c` paired with elevated
   response latency indicates blind, time-based injection.
5. **Correlate** request → child process → egress within a short window on one
   host to promote confidence from "attempt" to "successful execution".
6. **Triage & escalate.** On success indicators, isolate the host, preserve
   process/command history, and hand off to the response playbook.

## Detection engineering notes

- Prefer process-creation detection: it catches blind injection that request
  signatures miss and has low false positives when scoped to web service parents.
- Reduce noise by baselining the legitimate child processes each app spawns
  (e.g. image tooling) and alerting on deviations.

## Paired offense / defense

Pairs with **web-command-injection**. Run that skill in the lab and confirm each
proof lights up here: the echoed-token payload matches request signatures, the
`;sleep 5` proof shows as latency, and any OOB `nslookup` appears in egress logs
and as a child process.

## Validation

Reproduce in `_lab/`:

1. `cd _lab && docker compose up -d` with access logging and (if available)
   auditd/EDR on the target host.
2. Run the paired `web-command-injection` procedure against DVWA's command page.
3. Confirm the metacharacter payload matches step 1's rule and the spawned child
   process (e.g. `sh -c ... echo`) matches step 2's rule.

## References

- MITRE ATT&CK T1059; D3FEND D3-PSA (Process Spawn Analysis)
- OWASP: OS Command Injection Defense Cheat Sheet
- Sigma project — web/process command injection rules
