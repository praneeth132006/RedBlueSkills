---
name: cloud-imds-credential-theft
description: >-
  Demonstrate cloud credential theft via the instance metadata service (IMDS)
  during an authorized cloud assessment. Use when you have code execution, SSRF, or
  a request-proxying primitive on a cloud workload (EC2/GCE/Azure VM, ECS/EKS task,
  Cloud Run) and need to prove that the workload's IAM role credentials are
  reachable through `169.254.169.254` / the metadata endpoint — the classic pivot
  from app compromise to cloud account access.
version: 1.0.0
team: red
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: credential-access
techniques:
  attack: [T1552.005, T1078.004]
  capec: [CAPEC-664]
  cwe: [CWE-918, CWE-522]
  owasp: ["A01:2021"]
  d3fend: []
pairs_with: [cloud-imds-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: ec2-metadata-mock
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# Cloud IMDS credential theft

## Overview

Every major cloud provider exposes an instance metadata service on a link-local
address (`169.254.169.254`, or `metadata.google.internal`) that hands the
workload's temporary IAM/role credentials to anything that can reach it from the
instance. That makes IMDS the single most valuable target after any foothold: a
web app SSRF, a compromised container, or code execution on a VM can request the
role's short-lived keys and assume the workload's cloud permissions. This skill
proves reachability and, within scope, that the returned credentials are usable —
demonstrating the app-to-cloud pivot so the workload can be moved to IMDSv2 and
least-privilege roles.

## Authorization & scope

**Run only against cloud workloads you are explicitly authorized to test, under a
rules-of-engagement that covers the cloud account itself** (not just the app).
Prove reachability with the metadata **index** and, if credential use is in scope,
a **single read-only identity call** (e.g. `sts get-caller-identity`) to confirm
the keys are live — then **stop**. Do **not** enumerate the account, access data,
create resources, or persist the credentials. Redact the actual secret values in
your report; the finding is "role X's credentials are retrievable from the app
tier", not the key material.

## Preconditions

- A foothold on the workload that can issue outbound HTTP from the instance:
  code execution, SSRF against an app on the instance, or shell in a container
  that shares the host network namespace.
- Knowledge of the cloud provider (dictates the metadata address, required
  headers, and whether IMDSv1 or IMDSv2 is in play).
- Authorization covering the cloud account, and a place to record findings without
  storing live secrets.

## Procedure

1. **Confirm reachability (index only).** Request the metadata root for the
   provider:
   ```bash
   # AWS IMDSv1 (no token) — if this returns data, IMDSv1 is enabled
   curl -s http://169.254.169.254/latest/meta-data/
   # GCP (header required)
   curl -s -H 'Metadata-Flavor: Google' \
        http://metadata.google.internal/computeMetadata/v1/
   # Azure (header required)
   curl -s -H 'Metadata: true' \
        'http://169.254.169.254/metadata/instance?api-version=2021-02-01'
   ```
2. **Detect IMDSv2 posture (AWS).** Try the token flow; if a `PUT` token is
   required before data is served, IMDSv2 is enforced and simple SSRF (which can't
   set headers) is blocked:
   ```bash
   TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
     -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
   curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
     http://169.254.169.254/latest/meta-data/iam/security-credentials/
   ```
3. **Locate the role.** Read the role name from the credentials path index (do not
   yet fetch the secret) to identify which IAM principal the workload runs as.
4. **Prove usability (scoped, single call).** If authorized, retrieve the
   credentials and make **one** read-only identity call, then discard them:
   ```bash
   aws sts get-caller-identity   # confirms the stolen role is live; nothing else
   ```
5. **Assess blast radius from policy, not action.** Determine what the role
   *could* do by reviewing its attached IAM policy (read-only), rather than by
   exercising those permissions.
6. **Record** the reachability result, IMDSv1-vs-v2 posture, the role identity,
   and the policy-derived blast radius, plus the fix: enforce IMDSv2 with hop
   limit 1, scope the role to least privilege, and block app-tier egress to
   link-local.

## Paired defense / offense

Pairs with **cloud-imds-hardening**. The request you make to `169.254.169.254`
from the application/container tier — especially an IMDSv1 fetch or an SSRF-driven
metadata hit — is exactly the access that skill blocks (IMDSv2, hop limit, egress
policy) and alerts on (metadata access from an unexpected process/network path).

## Validation

Reproduce in a lab cloud account you own:

1. Launch a VM/instance with an IAM role attached and IMDSv1 **enabled**.
2. From the instance, confirm the metadata index and the credentials path return
   data, then run a single `sts get-caller-identity`.
3. Flip the instance to IMDSv2-required with hop limit 1 and confirm the simple
   (no-token) fetch now fails — demonstrating the control before writing it up.

**Validated 2026-08-06 against a mock EC2 IMDS (`ec2-metadata-mock`).** Against the
IMDSv1-permissive endpoint the procedure walked
`/latest/meta-data/` → `/latest/meta-data/iam/security-credentials/`
(`rbs-lab-workload-role`) → the role's credentials document, retrieving the
(placeholder, redacted) `AccessKeyId`/`SecretAccessKey`/`Token` with **no
authentication** — the app-to-cloud pivot. Against the IMDSv2-enforced endpoint the
header-less `GET /latest/meta-data/` returned **401** (the path a simple SSRF would
hit), and only the `PUT /latest/api/token` → token-bearing `GET` flow succeeded
(200) — demonstrating that IMDSv2 neutralizes the common delivery path. No real
cloud credentials were used or retrieved; the mock returns clearly-labeled
placeholders.

## References

- MITRE ATT&CK T1552.005 Cloud Instance Metadata API; T1078.004 Cloud Accounts
- OWASP: A01:2021 Broken Access Control; SSRF Prevention Cheat Sheet
- AWS IMDSv2, GCP metadata `Metadata-Flavor`, Azure IMDS header docs
- CAPEC-664; CWE-918, CWE-522
