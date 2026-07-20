---
name: web-sql-injection
description: >-
  Confirm, characterize, and demonstrate the impact of SQL injection in a web
  application during an authorized assessment. Use when a request parameter,
  header, or body field appears to reach a SQL query and you need to prove the
  flaw and its blast radius without damaging data.
version: 1.0.0
team: red
app_type: web-app
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1190]
  capec: [CAPEC-66]
  cwe: [CWE-89]
  owasp: ["A03:2021"]
  d3fend: []
pairs_with: [web-sqli-detection]
risk:
  level: high
  reversible: true
  data_touch: read-write
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-20
  validated_by: praneeth132006
license: Apache-2.0
---

# Web SQL injection

## Overview

SQL injection occurs when untrusted input is concatenated into a SQL statement,
letting an attacker alter the query's logic. This skill takes a *candidate*
injection point and walks from detection → characterization → controlled proof
of impact, favouring read-only and boolean/time-based evidence over destructive
payloads. It targets classic, blind (boolean and time), and error-based variants.

## Authorization & scope

**Run only against systems you are explicitly authorized to test.** Before acting,
confirm:

- The target host/URL is inside the engagement's written scope.
- Authorization (SOW, rules of engagement, or bug-bounty program policy) is on
  file and the testing window is open.
- You will avoid `UNION`/stacked queries that write or delete, and avoid dumping
  real customer PII beyond the minimum needed to prove impact. Prefer counting
  rows over exfiltrating them.

Stop and report immediately if you encounter data suggesting you are outside
scope (unexpected tenant, production PII, third-party systems).

## Preconditions

- A reachable input that plausibly reaches a SQL query (login form, search,
  `id=` parameter, JSON field, `X-Forwarded-For`-style header).
- Ability to observe responses (status, body length, timing, error text).
- Recommended tooling: an intercepting proxy, `curl`, and `sqlmap` for
  confirmed points.

## Procedure

1. **Baseline.** Capture the normal response (status, body length, timing) for a
   benign value.
2. **Break the query.** Submit a single quote and a syntactically balanced value;
   watch for a 500, a SQL error string, or a changed body length.
   ```bash
   curl -s "https://TARGET/rest/products/search?q=test'"      # error / anomaly?
   curl -s "https://TARGET/rest/products/search?q=test' --"    # comment tail
   ```
3. **Boolean differential.** Compare a TRUE vs FALSE condition; a stable
   difference confirms boolean-blind injection.
   ```bash
   # TRUE  -> normal-length body,  FALSE -> empty/short body
   curl -s "https://TARGET/item?id=1 AND 1=1"
   curl -s "https://TARGET/item?id=1 AND 1=2"
   ```
4. **Time-based confirmation** (when responses are indistinguishable):
   ```bash
   # DB-specific sleep; measure round-trip time
   curl -s -o /dev/null -w '%{time_total}\n' "https://TARGET/item?id=1'||pg_sleep(5)--"
   ```
5. **Characterize** the DBMS, current user, and version with read-only queries
   (`version()`, `current_user`) via UNION or blind extraction. Enumerate schema
   from `information_schema` before touching any application table.
6. **Prove impact minimally.** Demonstrate access with a row *count* of a
   sensitive table, or retrieval of a single non-PII marker row. Do not dump
   full tables.
7. **Automate carefully** once a point is confirmed:
   ```bash
   sqlmap -u "https://TARGET/item?id=1" --batch --level 2 --risk 1 \
          --technique=BT --dbs           # enumerate, no writes
   ```
8. **Record** the exact request, evidence of the differential, extracted metadata,
   and remediation guidance (parameterized queries / prepared statements).

## Paired defense / offense

Pairs with **web-sqli-detection**. Every step above produces a detectable signal:
malformed-input errors, `information_schema` access, `OR 1=1`/`sleep()` tokens,
and anomalous query timing. When validating both skills together (a purple-team
exercise), run this skill and confirm the detection skill's signatures and log
queries fire on the traffic you generate.

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. Bring up the lab: `cd _lab && docker compose up -d juice-shop`.
2. The product search (`/rest/products/search?q=`) is injectable. A `'))--`
   style payload returns extra columns, confirming UNION-based injection.
3. Confirm you can read the `Users` table schema via `information_schema`
   without modifying data.

## References

- OWASP: SQL Injection Prevention Cheat Sheet
- MITRE ATT&CK T1190 — Exploit Public-Facing Application
- CWE-89 — Improper Neutralization of Special Elements used in an SQL Command
- PortSwigger Web Security Academy — SQL injection
