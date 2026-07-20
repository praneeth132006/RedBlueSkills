---
name: web-sqli-detection
description: >-
  Detect SQL injection attempts and successful exploitation against a web
  application from logs, WAF events, and database telemetry. Use when building or
  tuning detections for injection, triaging a suspected SQLi alert, or threat
  hunting for injection activity.
version: 1.0.0
team: blue
app_type: web-app
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1190]
  capec: [CAPEC-66]
  cwe: [CWE-89]
  owasp: ["A03:2021"]
  d3fend: [D3-NTA, D3-FA]
pairs_with: [web-sql-injection]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: owasp-juice-shop
  last_validated: 2026-07-20
  validated_by: praneeth132006
license: Apache-2.0
---

# Web SQL injection detection

## Overview

Detect both *attempts* at and *success* of SQL injection by correlating three
layers: web-server / WAF request logs (payload patterns), application error logs
(malformed-query signals), and database telemetry (anomalous queries, schema
access, long-running `sleep`-style statements). This skill provides signatures,
log queries, and a triage flow that map directly to the offensive procedure in
its paired skill.

## Authorization & scope

This is passive defensive analysis of telemetry from systems you operate. Handle
logs per your data-classification policy: request bodies may contain credentials
or PII — mask before sharing. No authorization to "attack" is needed; do not
replay captured payloads against production.

## Preconditions

- Access to web/WAF access logs, application logs, and (ideally) DB query logs
  or a database activity monitor.
- A SIEM or log tool for querying (examples below use a generic KQL/Splunk-like
  syntax — adapt to your platform).

## Procedure

1. **Detect injection *attempts*** in request logs. High-signal tokens (URL- and
   case-normalize first to defeat basic evasion):
   - `' OR 1=1`, `" OR "1"="1`, `--`, `/*`, `#` in parameter values
   - `UNION SELECT`, `information_schema`, `@@version`, `pg_sleep`, `sleep(`,
     `benchmark(`, `waitfor delay`
   - Stacked-query separators (`;`) in fields that should be scalar
   ```
   index=web sourcetype=access
   | eval q=urldecode(uri_query)
   | where match(lower(q), "(union\s+select|information_schema|or\s+1=1|pg_sleep|sleep\(|waitfor\s+delay)")
   | stats count by src_ip, uri_path, q
   ```
2. **Detect *breakage*** — 500s and DB errors clustered by source/parameter often
   indicate an operator mapping an injection point.
   ```
   index=app "SQLException" OR "SQLSTATE" OR "syntax error at or near"
   | stats count, values(uri_path) by src_ip
   ```
3. **Detect *success* / impact** from DB telemetry: unusual `information_schema`
   reads, `SELECT` over sensitive tables from the app service account, or query
   durations spiking (time-based blind).
4. **Correlate timing** — a burst of TRUE/FALSE differential requests to one
   parameter (near-identical requests, alternating response sizes) is a strong
   blind-SQLi signal even without obvious keywords.
5. **Triage:** confirm whether payloads reached the DB (not just the WAF-blocked
   edge), scope affected parameters/endpoints, and check for data egress volume.
6. **Escalate** to the response playbook if success indicators are present:
   rotate exposed secrets, patch the parameterization flaw, preserve logs.

## Detection engineering notes

- Prefer **positive validation** at the app (parameterized queries) over pattern
  blocklists — signatures here are for *detection*, not primary prevention.
- Reduce false positives by scoping keyword rules to *parameter values*, not full
  URLs, and by allow-listing legitimate analytics endpoints that use SQL-like text.

## Paired offense / defense

Pairs with **web-sql-injection**. Run that skill against the lab and confirm each
stage lights up here: the quote-break produces app errors (step 2), UNION/schema
enumeration matches keyword rules (step 1), and `pg_sleep` proofs surface in both
request logs and DB duration metrics (steps 3–4).

## Validation

Reproduce against **OWASP Juice Shop** (`_lab/`):

1. `cd _lab && docker compose up -d juice-shop` and enable access logging (or
   front it with the lab's logging proxy).
2. Run the paired `web-sql-injection` procedure against `/rest/products/search`.
3. Confirm the `UNION SELECT` / `information_schema` requests match rule step 1
   and that malformed-quote requests generate observable errors.

## References

- MITRE ATT&CK T1190; MITRE D3FEND D3-NTA (Network Traffic Analysis)
- OWASP: SQL Injection Prevention Cheat Sheet
- Sigma project — web application SQLi detection rules
