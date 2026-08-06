---
name: cloud-storage-exposure-monitoring
description: >-
  Detect and prevent publicly exposed cloud object storage (S3/GCS/Azure Blob). Use
  when building continuous posture checks and runtime detections for world-readable/
  writable buckets and objects: enforcing account-level public-access blocks,
  catching policy/ACL drift toward public, and alerting on anonymous access and
  bucket-enumeration patterns in access logs.
version: 1.0.0
team: blue
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: detect
techniques:
  attack: [T1530, T1580]
  capec: [CAPEC-150]
  cwe: [CWE-284, CWE-732]
  owasp: ["A05:2021"]
  d3fend: [D3-ACH, D3-RAPA]
pairs_with: [cloud-public-storage-exposure]
risk:
  level: info
  reversible: true
  data_touch: read
authorization: not-required
maturity: validated
validation:
  method: lab
  target: minio-s3
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# Cloud storage exposure monitoring

## Overview

Public-storage leaks are prevented by defense in depth: a hard account-level block
so a single misconfigured policy can't expose data, continuous posture
reconciliation to catch drift, and runtime detection of the anonymous access and
enumeration that precede or accompany a leak. This skill establishes the
public-access-block baseline for S3/GCS/Azure Blob, checks configuration against
it continuously, and builds detections from storage access logs — anonymous
(unauthenticated) reads, world-writable uploads, and the 404-heavy scanning
pattern of bucket-name enumeration.

## Authorization & scope

Passive posture and log analysis of cloud storage you operate. Access logs record
who read what and may reference sensitive object keys — handle under your normal
data-handling policy. No scanning of third-party buckets.

## Preconditions

- Access to storage configuration (bucket policies, ACLs, account public-access
  settings) and to IaC where storage is defined.
- Storage access logging enabled (S3 server access logs / CloudTrail data events,
  GCS audit logs, Azure Storage logs) into a SIEM.
- A config-posture tool (Config rules / Security Command Center / Defender for
  Cloud, or OPA over IaC) for continuous checks.

## Procedure

1. **Enforce the account-level block.** Turn on S3 Block Public Access at the
   account level (and equivalent GCS "public access prevention" / Azure "allow blob
   public access = disabled"). This is the load-bearing control: it overrides any
   individual bucket policy or ACL that would grant public access.
2. **Reconcile posture continuously.** Run config checks that flag any bucket/
   container whose effective policy or ACL grants `AllUsers`/`AllAuthenticatedUsers`
   /anonymous access, or where the account block is off. Fail the build on public
   storage in IaC (OPA/Checkov) so drift is caught before deploy.
3. **Detect anonymous access.** From access logs, alert on unauthenticated
   (`requester` = anonymous / no principal) `GET`/`LIST` that succeeds — legitimate
   traffic to private data is authenticated:
   ```
   index=s3_access auth=anonymous action IN (REST.GET.OBJECT, REST.GET.BUCKET) status=200
   | stats count, values(key) as keys by bucket, remote_ip
   ```
4. **Detect enumeration.** Flag a source generating many `404`/`403`s across
   distinct bucket/key names in a short window — the footprint of name-guessing —
   even when nothing is found.
5. **Detect world-writable abuse.** Alert on anonymous `PUT`/writes to any bucket;
   public-write is almost never intended.
6. **Attribute exposure source.** For each finding, determine whether it stems from
   bucket policy, object ACL, or the account block being off — and route the
   correct remediation.
7. **Drive remediation.** Auto-remediate where possible (re-enable the block,
   strip the public grant), fix the IaC source so it doesn't reappear, and confirm
   anonymous access fails afterward.

## Detection engineering notes

- The **account-level public-access block** is worth more than any detection — it
  prevents the exposure rather than observing it; treat monitoring as the backstop
  for drift and for buckets outside the block's reach.
- Anonymous-access alerts key on the **absence of an authenticated principal** on a
  successful request; enumeration alerts key on **error-heavy fan-out across
  distinct names** from one source.

## Paired offense / defense

Pairs with **cloud-public-storage-exposure**. Run that skill in the lab: its
anonymous listing/read appears as an anonymous-access alert, its name-guessing
appears as the enumeration pattern, and any world-writable canary upload appears as
an anonymous-write alert — while the account block prevents the exposure entirely
once enabled.

## Validation

Reproduce in a lab cloud account you own:

1. Create a public-read (and optionally public-write) bucket with test objects and
   access logging into your SIEM.
2. Run the paired `cloud-public-storage-exposure` skill (enumeration + anonymous
   read, and a canary write if applicable).
3. Confirm the anonymous-access, enumeration, and anonymous-write detections fire;
   then enable the account-level public-access block and confirm the posture check
   goes green and anonymous access fails.

**Validated 2026-08-06 against MinIO (S3-compatible, `minio-s3`).** The
account/bucket public-access-block control was proven as the load-bearing defense:
with an anonymous `download` policy set, the posture check reads the bucket as
public and an **unauthenticated** `GET`/`LIST` succeeds (200 + `ListBucketResult`);
after removing the anonymous grant (`mc anonymous set none`, the public-access-block
equivalent), the identical anonymous request returns **403 AccessDenied** — the
posture goes from exposed to blocked. The anonymous-access detection keys on exactly
this: a successful S3 request carrying **no authenticated principal**, which the
paired `cloud-public-storage-exposure` run produces.

## References

- MITRE ATT&CK T1530 Data from Cloud Storage Object; T1580 Cloud Infrastructure Discovery
- OWASP: A05:2021 Security Misconfiguration
- D3FEND D3-ACH (Application Configuration Hardening), D3-RAPA (Resource Access Pattern Analysis)
- AWS S3 Block Public Access; GCS public access prevention; Azure blob public access
- CAPEC-150; CWE-284, CWE-732
