---
name: cloud-k8s-rbac-abuse
description: >-
  Escalate privileges in a Kubernetes cluster by abusing over-permissive RBAC during
  an authorized assessment. Use when you have access to a service account or user
  with more Kubernetes API rights than it needs, and you need to prove that those
  rights — creating pods, reading secrets, using `exec`, impersonation, or editing
  RBAC — can be chained to reach cluster-admin or another namespace's data. Maps to
  MITRE ATT&CK (Containers) T1078.004 / T1613 and the privilege-escalation phase; the
  defensive mirror is Kubernetes RBAC hardening.
version: 1.0.0
team: red
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1078.004, T1613, T1610]
  capec: [CAPEC-122]
  cwe: [CWE-269, CWE-284, CWE-668]
  owasp: ["A01:2021"]
  d3fend: []
pairs_with: [cloud-k8s-rbac-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Kubernetes RBAC abuse

## Overview

Kubernetes RBAC is powerful and easy to over-grant, and several individually-innocent
permissions are privilege escalation in disguise: the right to create pods lets you
mount a privileged pod or another service account's token; `secrets:get` hands you
credentials; `pods/exec` gives a shell in a running workload; `impersonate` lets you
act as any user/group; and edit rights on Roles/RoleBindings let you grant yourself
more. This skill, from an authorized starting identity, enumerates the effective
permissions and demonstrates one escalation chain — reaching cluster-admin, another
namespace's secrets, or the node — to prove the RBAC grant is too broad, so it can be
tightened to least privilege.

## Authorization & scope

**Run only against a cluster you are explicitly authorized to test, under a ROE that
covers the Kubernetes control plane**, in the agreed window. Prefer a non-production
cluster or namespace. Demonstrate the escalation *path* with the least-invasive proof
(enumerate rights, then a single scoped action such as reading a benign test secret or
confirming `exec` works against a test pod) and **stop** — do not read real workload
secrets, deploy persistent workloads, alter production RBAC, or move to the node
beyond proof. Delete any test pods/objects you create during the same session and
record everything for cleanup and attribution.

## Preconditions

- Access to a Kubernetes service-account token or user context that is in scope
  (e.g. from an app compromise, a leaked kubeconfig, or provided test credentials).
- `kubectl` (or API) reachability to the cluster and ROE covering control-plane
  testing.
- A test namespace / benign test secret and a cleanup plan.

## Procedure

1. **Enumerate effective permissions.** Ask the API what the current identity can do
   before doing anything:
   ```bash
   kubectl auth can-i --list                          # effective verbs/resources for this identity
   kubectl auth can-i create pods -n <ns>             # spot-check escalation-relevant rights
   kubectl auth can-i get secrets --all-namespaces
   ```
2. **Identify escalation-relevant grants.** Flag the dangerous ones: `create/patch`
   on pods (esp. with hostPath/privileged/serviceAccountName), `get/list` on secrets,
   `pods/exec`, `impersonate`, `escalate`/`bind` on roles, and workload-controller
   create rights (Deployments/DaemonSets/Jobs) that indirectly create pods.
3. **Demonstrate one chain, minimally.** Prove a single path to higher privilege —
   for example, use `secrets:get` to read a benign test secret in another namespace,
   or schedule a scoped test pod that mounts a more-privileged service account token —
   capturing evidence, then delete the artifact:
   ```bash
   # illustrative: confirm cross-namespace secret read is possible against a TEST secret
   kubectl get secret rbs-lab-test-secret -n <other-ns> -o jsonpath='{.metadata.name}'
   ```
4. **Do not expand.** Halt at the proven escalation; container escape to the node is a
   separate objective (`cloud-privileged-container-escape`) run under its own sign-off,
   and persistence is out of scope here.
5. **Assess blast radius from RBAC, not by exercising it.** Determine what the
   escalated rights *could* reach (cluster-admin, all secrets, all namespaces) by
   reading the bindings, not by using them.
6. **Record** the starting identity, the over-broad grant, the demonstrated chain,
   and the fix: least-privilege Roles (no wildcards), namespace-scoped RoleBindings
   over ClusterRoleBindings, removal of `exec`/`impersonate`/secret-wide grants, and
   audit-logging of the escalation-relevant verbs.

## Paired defense / offense

Pairs with **cloud-k8s-rbac-hardening**. Each over-broad verb this skill chains —
pod-create, secret-get, exec, impersonate, role-edit — is exactly what that skill
scopes down to least privilege and audits. Hand over the starting identity and the
chain so the defender can confirm the tightened RBAC denies it and the audit log
records the attempt.

## Validation

Reproduce in a lab cluster you own:

1. Create a namespaced service account granted an over-broad Role (e.g. `secrets:*`
   cluster-wide or `create pods` + `pods/exec`).
2. From that identity, enumerate rights and demonstrate one escalation (read a test
   secret in another namespace, or exec into a test pod), then clean up.
3. Apply the paired hardening (least-privilege Role, drop the dangerous verbs) and
   confirm `kubectl auth can-i` now denies the chain and the API audit log recorded
   the attempt.

_Not yet lab-validated end-to-end (no shipped Kubernetes lab target); authored and
reviewed against the NSA/CISA Kubernetes Hardening Guide and the CIS Kubernetes
Benchmark._

## References

- MITRE ATT&CK (Containers) T1078.004 Valid Accounts: Cloud, T1613 Container and Resource Discovery, T1610 Deploy Container
- OWASP A01:2021 Broken Access Control; OWASP Kubernetes Top 10 (K01 Insecure Workload Config, K03 Overly Permissive RBAC)
- NSA/CISA Kubernetes Hardening Guide; CIS Kubernetes Benchmark (RBAC section)
- NIST SP 800-190 Application Container Security; NIST SP 800-53 Rev 5 AC-6 Least Privilege, AC-3 Access Enforcement, AU-2/AU-12 Audit
- CAPEC-122 Privilege Abuse; CWE-269 Improper Privilege Management, CWE-284, CWE-668
