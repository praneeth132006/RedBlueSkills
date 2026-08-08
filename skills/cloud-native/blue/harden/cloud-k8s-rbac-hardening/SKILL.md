---
name: cloud-k8s-rbac-hardening
description: >-
  Harden Kubernetes RBAC to least privilege and detect abuse. Use when protecting a
  cluster: removing wildcard and escalation-prone grants (pod-create, secret-wide,
  exec, impersonate, role-edit), scoping RoleBindings to namespaces, separating
  workload service accounts, and audit-logging and alerting on the API verbs that
  signal privilege escalation. Pairs with the Kubernetes RBAC-abuse offense; anchored
  on the NSA/CISA Kubernetes Hardening Guide, CIS Kubernetes Benchmark, and NIST
  SP 800-190.
version: 1.0.0
team: blue
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1078.004, T1613, T1610]
  capec: [CAPEC-122]
  cwe: [CWE-269, CWE-284, CWE-668]
  owasp: ["A01:2021"]
  d3fend: [D3-ACH, D3-PH, D3-UBA]
pairs_with: [cloud-k8s-rbac-abuse]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# Kubernetes RBAC hardening

## Overview

Because several ordinary Kubernetes permissions are privilege escalation in disguise,
hardening RBAC means granting the *minimum* verbs on the *narrowest* scope and
treating the escalation-prone ones as privileged: no wildcards, namespace-scoped
bindings over cluster-wide ones, distinct least-privilege service accounts per
workload, and tight control over `pods/exec`, `impersonate`, secret access, and
role-editing rights. This skill lays out that least-privilege model plus the audit
logging and detection that catch abuse of whatever grants remain — the defensive
mirror of Kubernetes RBAC abuse.

## Authorization & scope

Defensive configuration and monitoring of clusters your organization operates. RBAC
manifests and audit logs describe your own cluster — handle under your normal
data-handling policy. Validate changes through your normal cluster change control; no
testing of third-party clusters.

## Preconditions

- Admin access to the cluster's RBAC (Roles, ClusterRoles, RoleBindings,
  ClusterRoleBindings) and to API server audit configuration.
- An inventory of workloads and the specific API rights each legitimately needs.
- Audit logging enabled on the API server and a place to run detections.

## Procedure

1. **Eliminate wildcards and over-broad grants.** Remove `*` verbs/resources and
   cluster-wide `secrets`/`pods` rights; grant only the specific verbs a subject needs
   (NSA/CISA guide; CIS Kubernetes Benchmark RBAC controls). Wildcards are how one
   grant becomes cluster-admin.
2. **Prefer namespace-scoped bindings.** Use Roles + RoleBindings within a namespace
   instead of ClusterRoles/ClusterRoleBindings wherever possible, so a compromised
   identity can't reach other namespaces (NIST AC-6 Least Privilege).
3. **Treat escalation-prone verbs as privileged.** Tightly restrict and review
   `pods/exec`, `pods/attach`, `impersonate`, `escalate`/`bind`, `create` on pods and
   workload controllers, and any secret access; grant them only to the few identities
   that must have them.
4. **Separate and minimize service accounts.** Give each workload its own
   least-privilege service account; disable automounting of the default SA token
   where not needed (`automountServiceAccountToken: false`); never bind workloads to
   `cluster-admin`.
5. **Audit-log and alert on the tells.** Enable API server audit logging and alert on
   escalation-relevant activity: `create pods` with privileged/hostPath/other-SA
   specs, `secrets get/list` outside normal patterns, `exec`/`attach`, `impersonate`,
   and edits to Roles/Bindings (MITRE D3FEND User Behavior Analysis; NIST SI-4).
6. **Continuously verify.** Run RBAC analysis (e.g. `kubectl auth can-i --list` per
   service account, or an RBAC linter) and admission policy (OPA/Gatekeeper/Kyverno)
   in CI to fail any manifest that reintroduces a wildcard or a dangerous grant.

## Detection engineering notes

- The load-bearing control is **least-privilege, namespace-scoped RBAC**: it removes
  the escalation chains outright, so detection only has to cover the few privileged
  grants that must remain.
- The highest-value alerts are **pod creation with a privileged/hostPath spec or a
  different service account**, and **use of `impersonate`** — both are rare in normal
  operation and are direct escalation primitives.

## Paired offense / defense

Pairs with **cloud-k8s-rbac-abuse**. Run that skill before and after: beforehand its
over-broad identity chains pod-create/secret-get/exec into higher privilege; after
hardening `kubectl auth can-i` denies each step, admission policy blocks the
privileged pod, and the audit log alerts on the attempt.

## Validation

Reproduce in a lab cluster you own:

1. Start from the over-permissive service account the paired skill escalates from;
   confirm the escalation works.
2. Apply least-privilege Roles, namespace-scoped bindings, SA separation, admission
   policy, and audit alerting.
3. Re-run the paired skill and confirm the chain is denied and the attempt is logged
   and alerted, while the workload's legitimate access still functions.

_Not yet lab-validated end-to-end (no shipped Kubernetes lab target); authored and
reviewed against the NSA/CISA Kubernetes Hardening Guide, CIS Kubernetes Benchmark,
and NIST SP 800-190._

## References

- MITRE ATT&CK (Containers) T1078.004, T1613, T1610 (defensive context); MITRE D3FEND D3-ACH (Application Configuration Hardening), D3-PH (Platform Hardening), D3-UBA (User Behavior Analysis)
- NSA/CISA Kubernetes Hardening Guide; CIS Kubernetes Benchmark; OWASP Kubernetes Top 10 (K03 Overly Permissive RBAC)
- NIST SP 800-190 Application Container Security; NIST SP 800-53 Rev 5: AC-6 Least Privilege, AC-3 Access Enforcement, AU-2/AU-12 Audit, CM-7 Least Functionality
- NIST CSF 2.0: PR.AA (Authentication/Authorization), PR.PS, DE.CM; admission control via OPA/Gatekeeper / Kyverno
- OWASP A01:2021; CAPEC-122; CWE-269, CWE-284, CWE-668
