---
name: cloud-public-storage-exposure
description: >-
  Discover and prove publicly exposed cloud object storage during an authorized
  assessment — world-readable/writable S3 buckets, GCS buckets, and Azure Blob
  containers, and objects made public by ACLs or bucket policy. Use when an
  organization's data may be reachable without authentication and you need to
  confirm exposure and characterize its sensitivity with minimal, non-exfiltrating
  proof.
version: 1.0.0
team: red
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: collection
techniques:
  attack: [T1530, T1580]
  capec: [CAPEC-150]
  cwe: [CWE-284, CWE-732]
  owasp: ["A05:2021"]
  d3fend: []
pairs_with: [cloud-storage-exposure-monitoring]
risk:
  level: medium
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: minio-s3
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# Cloud public storage exposure

## Overview

Object storage is the most common source of large cloud data leaks: a bucket or
container set to public — or an object made public by an over-broad ACL or bucket
policy — is readable by anyone on the internet, no credentials required. Names are
often guessable (`<org>-backups`, `<app>-assets`, `<env>-logs`), so exposure is
found by enumeration, not just insider knowledge. This skill discovers
organization-linked storage, tests read (and, carefully, write/listing) access
without authentication, and characterizes the sensitivity of what's exposed —
with **minimal proof and no bulk exfiltration**.

## Authorization & scope

**Run only against storage owned by the organization you are authorized to test.**
Bucket enumeration can easily wander onto **third-party** buckets that merely share
a naming pattern — **confirm ownership before accessing any object**, and treat
unaffiliated exposed buckets as out of scope. Prove exposure by **listing keys and
reading a single non-sensitive object header/sample** (or a canary you place if
write is in scope); do **not** download data at scale, and never write to or delete
objects in a bucket you don't own. Redact any real data in the report.

## Preconditions

- The organization's naming conventions, domains, and known cloud footprint to seed
  enumeration.
- Cloud provider CLIs/SDKs configured for **unauthenticated** access tests, plus a
  wordlist of bucket/container name candidates.
- Authorization scoped to the org's storage, and a way to verify bucket ownership
  (e.g. account id, tags) before interacting.

## Procedure

1. **Enumerate candidates.** Generate bucket/container names from the org name,
   products, environments, and known domains; corroborate with passive sources
   (certificate transparency, public code, search) to prioritize likely-owned
   names.
2. **Test anonymous read/listing.** Check each candidate for unauthenticated
   listing:
   ```bash
   # AWS S3 — anonymous list (no credentials)
   aws s3 ls "s3://CANDIDATE-BUCKET/" --no-sign-request
   # GCS — anonymous object list
   curl -s "https://storage.googleapis.com/CANDIDATE-BUCKET/"
   # Azure Blob — anonymous container list
   curl -s "https://ACCOUNT.blob.core.windows.net/CONTAINER?restype=container&comp=list"
   ```
   A successful listing without credentials confirms public read.
3. **Confirm ownership.** Before reading contents, verify the bucket belongs to the
   target (tags, account id, known object names). If it doesn't, stop and report as
   an out-of-scope discovery.
4. **Characterize sensitivity (minimal read).** From the key listing, infer content
   type; read **one** small non-sensitive object (or just its metadata/headers) to
   confirm the data class (backups, PII, secrets, source) — do not bulk-download.
5. **Test write, carefully.** If write exposure is in scope, upload a single inert
   canary object to prove world-writable, then delete it. Never overwrite or delete
   existing objects.
6. **Check policy vs. ACL source.** Determine whether exposure comes from the
   bucket policy, object ACLs, or account-level public-access settings — the fix
   differs.
7. **Record** the bucket, the access proven (list/read/write), the data class, the
   exposure source, and the fix: enable account-level public-access block,
   remediate the policy/ACL, and enforce it in IaC.

## Paired defense / offense

Pairs with **cloud-storage-exposure-monitoring**. The enumeration and anonymous
access you perform is what that skill surfaces from the defender's side — via
public-access-block posture checks and access-log/anonymous-request telemetry —
and the exposure you confirm is exactly what its configuration detections flag.

## Validation

Reproduce in a lab cloud account you own:

1. Create a bucket/container and set it public-read (and optionally public-write),
   seeded with non-sensitive test objects.
2. From an unauthenticated context, confirm listing and single-object read succeed;
   if testing write, upload and then delete a canary.
3. Enable the account-level public-access block and confirm anonymous access now
   fails — demonstrating the exposure and its fix.

**Validated 2026-08-06 against MinIO (S3-compatible, `minio-s3`).** Created a bucket
with a test object and set an anonymous `download` policy. From an **unauthenticated**
context (no credentials), an S3 `GET /rbs-public-bucket/secret.txt` returned **200**
with the object body (`sensitive-lab-data-RBS`) and a `list-type=2` request returned
the `ListBucketResult` XML enumerating keys — public read + listing confirmed. After
removing the anonymous policy (`mc anonymous set none`, the account/bucket
public-access-block equivalent), the same anonymous `GET` returned **403
AccessDenied** and listing was denied — proving the exposure and its fix over the
real S3 API.

## References

- MITRE ATT&CK T1530 Data from Cloud Storage Object; T1580 Cloud Infrastructure Discovery
- OWASP: A05:2021 Security Misconfiguration
- AWS S3 Block Public Access; GCS/Azure public-access controls
- CAPEC-150; CWE-284 Improper Access Control; CWE-732 Incorrect Permission Assignment
