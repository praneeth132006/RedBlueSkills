---
name: cloud-iam-persistence
description: >-
  Demonstrate cloud identity persistence during an authorized cloud assessment. Use
  after you have gained privileged access to a cloud account (via a stolen role, a
  compromised admin, or a misconfiguration) and need to prove that an attacker can
  establish durable, credential-independent access — a second access key on an
  identity, an added trust/role, a new IAM user or federated identity, or a
  resource-policy backdoor — that survives rotating the originally-compromised
  credential. Maps to MITRE ATT&CK T1098 / T1136.003 and the persistence phase; the
  defensive mirror is IAM-persistence threat hunting.
version: 1.0.0
team: red
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: persistence
techniques:
  attack: [T1098, T1098.001, T1098.003, T1136.003]
  capec: [CAPEC-560]
  cwe: [CWE-269, CWE-284]
  owasp: ["A01:2021"]
  d3fend: []
pairs_with: [cloud-iam-persistence-hunt]
risk:
  level: high
  reversible: false
  data_touch: read-write
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Cloud IAM persistence

## Overview

Once an attacker holds privileged access to a cloud account, their next move is to
make that access durable and independent of whatever credential they first used —
so that rotating the compromised key or disabling the phished admin does not evict
them. Cloud IAM offers many quiet ways to do this: add a second access key to an
existing identity, attach an additional role/policy, create a fresh IAM user or
federated (OIDC/SAML) identity, or add the attacker's principal to a
resource/trust policy. Each is a legitimate-looking administrative action that
blends into normal IAM churn. This skill, under explicit authorization, plants and
then removes a single benign persistence artifact to prove the account permits
credential-independent persistence — so the defender can detect and hunt for it.

## Authorization & scope

**Run only against a cloud account you are explicitly authorized to test, under a
rules-of-engagement that covers identity/IAM changes**, in the agreed window.
Creating IAM identities or credentials is a **write** that is not cleanly automatic
to undo — plant exactly **one** clearly-labeled, benign artifact (e.g. an access key
named `rbs-lab-persist-test`), record it, and **remove it during the same session**.
Do not use the planted credential to access data, do not touch real user identities,
and coordinate with the account owner so the artifact is expected. Redact any key
material to a fingerprint in the report; the finding is "credential-independent
persistence is possible", not the key.

## Preconditions

- Prior authorized privileged access to the cloud account (e.g. from
  `cloud-imds-credential-theft` or provided admin test credentials) sufficient to
  perform IAM writes.
- ROE explicitly authorizing IAM identity/credential/policy changes, plus a cleanup
  plan and an owner contact.
- Cloud CLI/API access and a place to record findings without storing live secrets.

## Procedure

1. **Confirm the persistence permission set (read-only first).** Verify the current
   principal can perform IAM writes without actually writing yet:
   ```bash
   aws iam list-attached-user-policies --user-name <current-test-user>   # confirm IAM write perms via policy, read-only
   ```
2. **Plant one benign, labeled artifact.** Demonstrate *one* durable-access primitive
   and stop — for example, add a second access key to an existing test identity:
   ```bash
   # illustrative: a clearly-labeled test key on a test identity, to be deleted this session
   aws iam create-access-key --user-name rbs-lab-persist-test
   ```
   (Other equivalent primitives — an added role/trust, a new federated identity, a
   resource-policy grant — are alternatives, not additional artifacts to plant.)
3. **Prove independence, without using it.** Explain (from the artifact's nature)
   that this access survives rotation of the originally-compromised credential —
   demonstrate the *existence* of the second credential, not its use against data.
4. **Record the detection surface.** Note the exact CloudTrail/audit events the
   action generates (`CreateAccessKey`, `AttachUserPolicy`, `CreateUser`,
   `UpdateAssumeRolePolicy`, `PutRolePolicy`) so the defender can build detections.
5. **Remove the artifact.** Delete the planted key/identity/policy immediately and
   confirm removal:
   ```bash
   aws iam delete-access-key --user-name rbs-lab-persist-test --access-key-id <id>
   ```
6. **Record** which persistence primitives the account permitted, the audit events
   each emits, and the fix: least-privilege IAM (no broad `iam:*`), permission
   boundaries/SCPs, alerting on identity/credential creation, and periodic access
   reviews.

## Paired defense / offense

Pairs with **cloud-iam-persistence-hunt**. The IAM writes this skill performs —
`CreateAccessKey`, `CreateUser`, `AttachUserPolicy`, `UpdateAssumeRolePolicy` — are
exactly the audit events and identity artifacts that skill hunts for and alerts on.
Hand over the exact events and timestamps so the defender can confirm their hunt
query and detection surface the planted artifact.

## Validation

Reproduce in a lab cloud account you own:

1. With authorized admin credentials, add a labeled second access key to a test
   identity and confirm it authenticates independently of the original credential.
2. Rotate/disable the original credential and confirm the second still works
   (persistence proven), then delete it.
3. Enable the paired hunt/detection and confirm the `CreateAccessKey` event is
   surfaced.

_Not yet lab-validated end-to-end (no shipped IAM-write lab target); authored and
reviewed against MITRE ATT&CK cloud persistence techniques and AWS/GCP/Azure IAM
audit behavior._

## References

- MITRE ATT&CK T1098 Account Manipulation (T1098.001 Additional Cloud Credentials, T1098.003 Additional Cloud Roles); T1136.003 Create Account: Cloud Account; T1078.004 Valid Accounts: Cloud
- OWASP A01:2021 Broken Access Control; Cloud Security Alliance Cloud Controls Matrix (IAM domain)
- NIST SP 800-53 Rev 5: AC-2 Account Management, AC-6 Least Privilege, AU-6 Audit Review, SI-4 System Monitoring, CM-5 Access Restrictions for Change
- AWS CloudTrail IAM event reference; GCP Cloud Audit Logs; Azure Activity Log
- CAPEC-560 Use of Known Domain Credentials; CWE-269 Improper Privilege Management, CWE-284
