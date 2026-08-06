---
name: cloud-container-hardening
description: >-
  Harden containerized workloads against container-to-host escape and detect
  attempts. Use when protecting Docker/Kubernetes nodes from over-privileged
  containers: enforcing restricted Pod Security Standards, dropping capabilities,
  forbidding privileged mode/host namespaces/sensitive host mounts, applying
  seccomp/AppArmor, and detecting the runtime behaviour of an escape.
version: 1.0.0
team: blue
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1611, T1610]
  capec: [CAPEC-233]
  cwe: [CWE-269, CWE-250]
  owasp: ["A04:2021"]
  d3fend: [D3-PH, D3-EAL, D3-PSMD]
pairs_with: [cloud-privileged-container-escape]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: validated
validation:
  method: lab
  target: docker-colima
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# Cloud container hardening

## Overview

Container escapes are almost always the result of granting a workload isolation-
breaking privileges it never needed. This skill removes those privileges by
default and makes it impossible to re-add them without an explicit exception:
enforce a restricted Pod Security Standard at admission, drop all Linux
capabilities and add back only what's required, forbid `privileged`, host
namespaces, host-path mounts and the container runtime socket, run as non-root with
a read-only root filesystem, and apply seccomp/AppArmor profiles. It pairs those
preventive controls with runtime detection of the syscalls and access patterns an
escape produces.

## Authorization & scope

Defensive configuration and monitoring of clusters/nodes you operate. Runtime and
admission logs may reveal workload and tenant structure — handle under your normal
data-handling policy. No active testing of third-party clusters.

## Preconditions

- Admission control available (Kubernetes Pod Security admission, or an OPA
  Gatekeeper/Kyverno policy engine) and the ability to set pod security contexts.
- An inventory of workloads and the few that legitimately need elevated privileges
  (so they can be granted narrow, audited exceptions).
- A runtime-security sensor (Falco/eBPF/EDR) feeding a SIEM for detection.

## Procedure

1. **Enforce restricted Pod Security.** Apply the Kubernetes **restricted** Pod
   Security Standard at the namespace/admission layer so pods that request
   `privileged`, host namespaces, `hostPath` mounts, or extra capabilities are
   rejected at creation — not merely audited.
2. **Drop capabilities.** Set `drop: ["ALL"]` and add back only the specific
   capabilities a workload needs; forbid `CAP_SYS_ADMIN`, `CAP_SYS_PTRACE`,
   `CAP_NET_ADMIN` unless justified by an exception.
3. **Forbid host coupling.** Deny `privileged: true`, `hostPID`/`hostNetwork`/
   `hostIPC`, mounting the container runtime socket (`/var/run/docker.sock`,
   `containerd.sock`), and `hostPath` mounts of sensitive host directories.
4. **Minimize the runtime.** Run as a non-root user, set
   `allowPrivilegeEscalation: false`, use a read-only root filesystem, and prefer
   user namespaces / rootless or sandboxed runtimes (gVisor/Kata) for higher-risk
   workloads.
5. **Apply seccomp/AppArmor.** Enforce the runtime-default (or a tighter) seccomp
   profile and an AppArmor/SELinux policy to block the syscalls escapes rely on.
6. **Gate in CI and admission.** Scan manifests/IaC (OPA/Kyverno/Checkov) so a
   privileged or host-mounting pod spec fails the pipeline, and enforce the same at
   admission so nothing bypasses CI.
7. **Detect at runtime.** Alert on the escape signature — a container process
   accessing the runtime socket, writing to `cgroup` `release_agent`, entering host
   namespaces, spawning a shell as root in a normally non-interactive container, or
   an unexpected `mount`/`setns`. Route high-severity hits to incident response.

## Detection engineering notes

- **Admission enforcement is the load-bearing control**: a rejected privileged pod
  never runs, so most escape primitives never exist. Treat runtime detection as the
  safety net for exception-workloads and zero-days.
- The highest-fidelity runtime alerts are **runtime-socket access from an app
  container** and **namespace-entering (`setns`) syscalls** — both are near-zero in
  normal operation.

## Paired offense / defense

Pairs with **cloud-privileged-container-escape**. Run that skill against a
disposable node: restricted Pod Security admission should refuse the privileged/
host-mounting pod outright, and if an exception workload is targeted, the runtime
detection (socket access, namespace crossing) should fire.

## Validation

Reproduce in a lab cluster you own:

1. Confirm the paired skill can escape from a privileged / `docker.sock`-mounting
   container on an unhardened node.
2. Enforce the restricted Pod Security Standard, drop capabilities, forbid the
   host mounts, and enable the runtime sensor.
3. Re-run the paired skill: confirm the privileged pod is rejected at admission
   (and, for any allowed exception, that the runtime escape behaviour alerts) —
   while a compliant workload still schedules and runs.

**Validated 2026-08-06 against Docker (Colima VM host).** The container-level
equivalents of the restricted controls were proven to remove the escape primitives
that the paired `cloud-privileged-container-escape` skill exploits: a container run
with `--cap-drop ALL --security-opt no-new-privileges --read-only` and **no**
`docker.sock` mount had no runtime socket to reach (`ls /var/run/docker.sock`: No
such file or directory) and could not cross namespaces
(`nsenter -t 1 -m … → setns(): Operation not permitted`), whereas the unhardened
`--privileged` + mounted-socket container escaped to the host in the same test.
Dropping privileges/capabilities and forbidding the runtime-socket mount is the
load-bearing control; a Kubernetes cluster additionally enforces this at admission
via the restricted Pod Security Standard.

## References

- MITRE ATT&CK T1611 Escape to Host; T1610 Deploy Container
- D3FEND D3-PH (Platform Hardening), D3-EAL (Executable Allowlisting), D3-PSMD (Process Self-Modification Detection)
- Kubernetes Pod Security Standards; NIST SP 800-190; Falco default ruleset
- OWASP A04:2021; CAPEC-233; CWE-269, CWE-250
