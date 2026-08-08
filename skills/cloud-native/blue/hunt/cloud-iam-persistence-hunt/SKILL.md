---
name: cloud-iam-persistence-hunt
description: >-
  Proactively hunt for and detect attacker persistence in cloud IAM. Use when
  defending a cloud account: baselining legitimate identities and credentials, then
  hunting the audit trail for the durable-access artifacts attackers plant — second
  access keys, new IAM users/federated identities, added roles/trust policies, and
  resource-policy backdoors — and alerting on the IAM write events that create them.
  Pairs with the cloud IAM-persistence offense; anchored on NIST AC-2/AU-6/SI-4 and
  the MITRE ATT&CK cloud persistence techniques.
version: 1.0.0
team: blue
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: hunt
techniques:
  attack: [T1098, T1098.001, T1098.003, T1136.003]
  capec: [CAPEC-560]
  cwe: [CWE-269, CWE-284]
  owasp: ["A01:2021"]
  d3fend: [D3-UBA, D3-CA, D3-ANCI]
pairs_with: [cloud-iam-persistence]
risk:
  level: low
  reversible: true
  data_touch: read
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Cloud IAM persistence hunt

## Overview

Cloud identity persistence hides in plain sight: a second access key or an extra role
looks just like routine administration, so it is caught not by a single signature but
by *knowing what should exist* and hunting for what shouldn't. This skill baselines
the account's legitimate identities, credentials, roles, and trust relationships, then
hunts the audit trail (CloudTrail / Cloud Audit Logs / Azure Activity) for the
artifacts and events an attacker uses to stay in — surfacing anomalous credential and
identity creation, unexpected trust changes, and dormant-but-privileged principals. It
is the proactive, defender-initiated mirror of cloud IAM persistence.

## Authorization & scope

Threat hunting and monitoring of cloud accounts your organization operates. IAM
inventories and audit logs describe your own identities — handle under your normal
data-handling policy. This is read-only analysis; no changes to identities beyond
your normal remediation process, and no testing of third-party accounts.

## Preconditions

- Read access to IAM configuration (users, roles, keys, trust/resource policies) and
  to the account's audit log (CloudTrail / Cloud Audit Logs / Activity Log).
- A notion of "known good": the set of legitimate identities, their expected
  credentials, and who may create identities.
- A place to run queries and route findings (SIEM / log analytics).

## Procedure

1. **Baseline legitimate identities and credentials.** Inventory users, roles,
   service accounts, access keys (and their age), and federated identity providers;
   record the expected owner and purpose of each (NIST AC-2). You hunt against this
   baseline.
2. **Hunt for anomalous credential creation.** Query the audit trail for
   `CreateAccessKey`, second keys on an identity, and access keys created outside
   normal provisioning — a principal with two active keys, or a key created by an
   unexpected actor, is a lead (MITRE D3FEND Credential Analysis).
3. **Hunt for new/altered identities and trust.** Surface `CreateUser`,
   `CreateLoginProfile`, new federated/OIDC identities, `AttachUserPolicy`/
   `PutRolePolicy` granting broad rights, and `UpdateAssumeRolePolicy`/resource-policy
   edits that add external or unexpected principals (T1098.003) — the quiet backdoors.
4. **Hunt for privilege and dormancy anomalies.** Find highly-privileged identities
   that are newly created, rarely used, or created by a now-departed actor; correlate
   identity creation with the compromise timeline of any incident.
5. **Alert in near-real-time on the write events.** Beyond periodic hunting, wire
   detections on the IAM write events themselves (identity/credential/policy
   creation by non-provisioning principals) so persistence is caught as it's planted
   (NIST SI-4).
6. **Feed findings back to hardening.** Each confirmed gap becomes a control:
   least-privilege IAM, permission boundaries/SCPs restricting `iam:*`, and mandatory
   review for identity creation.

## Detection engineering notes

- The load-bearing move is the **baseline**: persistence artifacts are individually
  legitimate-looking, so the signal is "this identity/credential/trust is not in the
  known-good set", not any single event in isolation.
- The highest-value near-real-time alert is **credential or identity creation by a
  principal that is not the provisioning system** — legitimate identity creation flows
  through known automation, so ad-hoc creation is rare and worth a look.

## Paired offense / defense

Pairs with **cloud-iam-persistence**. Run that skill in a lab account: the planted
second access key / added trust generates the `CreateAccessKey` / `UpdateAssumeRole`
events this skill hunts, and the artifact falls outside the known-good baseline —
confirming both the near-real-time alert and the retrospective hunt find it.

## Validation

Reproduce in a lab cloud account you own:

1. Baseline the account's identities and credentials.
2. Have the paired skill plant a labeled second access key; confirm the hunt query
   surfaces it (outside baseline) and the near-real-time alert fires on
   `CreateAccessKey`.
3. Remove the artifact and confirm the baseline returns to known-good.

_Not yet lab-validated end-to-end (no shipped IAM-write lab target); authored and
reviewed against MITRE ATT&CK cloud persistence detection and cloud-provider audit
guidance._

## References

- MITRE ATT&CK T1098, T1136.003, T1078.004 (defensive context); MITRE D3FEND D3-UBA (User Behavior Analysis), D3-CA (Credential Analysis), D3-ANCI (Authentication Cache Invalidation / anomalous credential context)
- NIST SP 800-53 Rev 5: AC-2 Account Management, AC-6 Least Privilege, AU-6 Audit Record Review/Analysis, SI-4 System Monitoring, IA-4 Identifier Management
- NIST CSF 2.0: DE.CM (Continuous Monitoring), DE.AE (Adverse Event Analysis), ID.AM (Asset/Identity Management), PR.AA
- AWS GuardDuty / CloudTrail IAM analytics; GCP Cloud Audit Logs; Azure AD/Entra sign-in & audit logs; CSA Cloud Controls Matrix (IAM)
- OWASP A01:2021; CAPEC-560; CWE-269, CWE-284
