---
name: cloud-imds-hardening
description: >-
  Harden cloud workloads against instance-metadata (IMDS) credential theft and
  detect attempts. Use when protecting EC2/GCE/Azure VMs, ECS/EKS tasks, or Cloud
  Run services from the app-to-cloud pivot: enforcing IMDSv2 with a minimal hop
  limit, blocking app-tier egress to link-local, scoping workload roles to least
  privilege, and alerting on metadata access from unexpected processes or on stolen
  credentials used off-instance.
version: 1.0.0
team: blue
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1552.005, T1078.004]
  capec: [CAPEC-664]
  cwe: [CWE-918, CWE-522]
  owasp: ["A01:2021"]
  d3fend: [D3-PH, D3-OTF, D3-CA]
pairs_with: [cloud-imds-credential-theft]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: validated
validation:
  method: lab
  target: ec2-metadata-mock
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# Cloud IMDS hardening

## Overview

The instance metadata service is defended on two fronts: make the credentials hard
to reach from a compromised app tier, and make stolen credentials useless and
noisy if they are taken. This skill enforces IMDSv2 (a session-token flow that
simple SSRF cannot complete because it can't set request headers) with a hop limit
of 1 so containers can't reach it through the host, blocks egress to
`169.254.169.254` from workloads that don't need it, scopes each workload role to
least privilege so a theft's blast radius is small, and instruments both metadata
access and off-instance credential use for detection.

## Authorization & scope

Defensive configuration and monitoring of cloud accounts you operate. CloudTrail/
audit logs and IAM policies reveal account structure and identities — handle under
your normal data-handling policy. No active testing of third-party accounts.

## Preconditions

- Access to the cloud account's compute configuration (launch templates, task
  definitions, VM metadata options) and IAM.
- Cloud audit logging enabled (CloudTrail / Cloud Audit Logs / Azure Activity) and
  a place to run detections.
- The set of workloads that legitimately need metadata credentials vs. those that
  don't.

## Procedure

1. **Enforce IMDSv2 / metadata protection.** On AWS set instance metadata options
   to `HttpTokens: required` and `HttpPutResponseHopLimit: 1`; bake it into launch
   templates/ASGs so new instances inherit it. GCP/Azure metadata already require a
   custom header — ensure workloads never proxy arbitrary headers to it.
2. **Hop limit for containers.** With hop limit 1, a container using the default
   bridge cannot reach IMDS through the host — preventing container-escape-free
   credential theft. Prefer per-pod/task IAM (IRSA / Workload Identity) so
   containers get scoped credentials without touching node IMDS at all.
3. **Block app-tier egress to link-local.** For workloads that don't need IMDS at
   runtime, deny outbound to `169.254.169.254`/`fd00:ec2::254` via security
   groups/host firewall/network policy — a backstop that also stops SSRF-driven
   access.
4. **Least-privilege roles.** Scope every workload role to only the actions it
   needs; separate roles per workload so a single theft can't move laterally.
   Prefer short credential lifetimes.
5. **Detect metadata access.** Alert when the metadata IP is contacted by an
   unexpected process/container, or when IMDSv1-style (no-token) access is
   attempted on an IMDSv2-required fleet (should be zero).
6. **Detect off-instance use.** Correlate role-credential usage against the
   issuing instance: alert when a role's temporary credentials are used from an IP
   or ASN that isn't the instance — the strongest signal that credentials were
   exfiltrated. (AWS GuardDuty `InstanceCredentialExfiltration` implements this;
   replicate the logic where you don't have it.)
7. **Continuously verify.** Add a config/policy check (Config rules / OPA) that
   fails any instance or launch template not enforcing IMDSv2 + hop limit 1.

## Detection engineering notes

- The highest-fidelity alert is **workload role credentials used from off the
  instance** — legitimate use is on-instance, so an external source IP is a strong
  exfiltration indicator.
- IMDSv2 enforcement is the load-bearing control: it neutralizes the most common
  delivery path (header-less SSRF) even before egress rules apply.

## Paired offense / defense

Pairs with **cloud-imds-credential-theft**. Run that skill in the lab: with IMDSv2
required and hop limit 1, its simple no-token fetch fails; the egress block stops
SSRF-driven access; and if credentials are taken and used, the off-instance-use
detection fires.

## Validation

Reproduce in a lab cloud account you own:

1. Launch an instance with an IAM role and IMDSv1 enabled; confirm the paired skill
   can read the metadata index and credentials.
2. Enforce IMDSv2 (`HttpTokens: required`, hop limit 1), add the link-local egress
   deny, and enable off-instance-use detection.
3. Re-run the paired skill and confirm the no-token fetch fails, container/SSRF
   access is blocked, and (if credentials are exercised off-instance) the alert
   fires — while the workload's own legitimate role use still succeeds.

**Validated 2026-08-06 against a mock EC2 IMDS (`ec2-metadata-mock`).** With IMDSv2
enforcement modeled on the mock, a header-less `GET /latest/meta-data/` — the exact
request a simple, header-unable SSRF issues — returned **401**, blocking the
credential-theft path the paired `cloud-imds-credential-theft` skill uses against
IMDSv1. Only the `PUT /latest/api/token` → token-bearing `GET` session flow returned
**200**, confirming IMDSv2 permits the legitimate on-instance client while denying
the header-less fetch. This demonstrates the load-bearing control (require a session
token); hop-limit-1 and link-local egress denial were validated in the paired
container-escape run and apply as additional layers.

## References

- MITRE ATT&CK T1552.005 Cloud Instance Metadata API; T1078.004 Cloud Accounts
- D3FEND D3-PH (Platform Hardening), D3-OTF (Outbound Traffic Filtering), D3-CA (Credential Analysis)
- AWS IMDSv2 & GuardDuty InstanceCredentialExfiltration; GCP Workload Identity; EKS IRSA
- OWASP A01:2021; CAPEC-664; CWE-918, CWE-522
