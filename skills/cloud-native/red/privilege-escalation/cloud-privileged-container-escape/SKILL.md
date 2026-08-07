---
name: cloud-privileged-container-escape
description: >-
  Demonstrate container-to-host escape from an over-privileged container during an
  authorized assessment — privileged mode, host namespace sharing, dangerous
  capabilities (CAP_SYS_ADMIN), sensitive host mounts (docker.sock, host root), or
  writable cgroup/procfs paths. Use when you have execution inside a container and
  need to prove it can break isolation to reach the node, other tenants' workloads,
  or node credentials.
version: 1.0.0
team: red
app_type: cloud-native
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1611, T1610]
  capec: [CAPEC-233]
  cwe: [CWE-269, CWE-250]
  owasp: ["A04:2021"]
  d3fend: []
pairs_with: [cloud-container-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: validated
validation:
  method: lab
  target: docker-colima
  last_validated: 2026-08-06
  validated_by: praneeth132006
license: Apache-2.0
---

# Cloud privileged container escape

## Overview

Container isolation is a configuration property, not a guarantee: a container run
`--privileged`, sharing the host PID/network namespace, holding `CAP_SYS_ADMIN`,
or mounting sensitive host paths (`/var/run/docker.sock`, the host root filesystem,
writable `cgroup`/`procfs`) can cross from the container to the node. On a
multi-tenant node or a Kubernetes cluster, that escape reaches other tenants'
workloads, the kubelet, and node IAM credentials (chaining into
`cloud-imds-credential-theft`). This skill enumerates the isolation-weakening
misconfigurations present and demonstrates a **single, contained** escape to prove
the boundary is broken — without disrupting the host or other workloads.

## Authorization & scope

**Run only against nodes/clusters you are explicitly authorized to test, with
rules of engagement that cover the host and any co-tenants.** A real escape touches
the **shared node** — get explicit approval for host-level impact, and prefer a
**read-only proof** (e.g. read a host-only file, or `docker ps` via a mounted
socket) over any host modification. Do **not** disrupt other workloads, exhaust
node resources, install persistence, or pivot to node cloud credentials unless
that pivot is separately authorized. Restore any state you touch and never run this
on a production node without written sign-off for host impact.

## Preconditions

- Execution inside a container on the target node (a foothold from an app compromise
  or a provisioned test container).
- Authorization covering the node/cluster and co-tenants.
- The ability to inspect the container's security context (capabilities, mounts,
  namespaces) from inside.

## Procedure

1. **Inventory the security context.** From inside the container, enumerate what
   isolation is (not) in place:
   ```bash
   cat /proc/self/status | grep -i cap       # effective capabilities (CapEff)
   mount | grep -E 'docker.sock|/host|cgroup'  # sensitive host mounts
   ls -la /var/run/docker.sock 2>/dev/null    # mounted container runtime socket
   ip addr; ps aux                            # host network/PID namespace sharing?
   ```
2. **Score the escape surface.** Map each finding to a known escape primitive:
   privileged/`CAP_SYS_ADMIN` → many; mounted `docker.sock` → control the runtime;
   host-root mount → direct host FS access; host PID namespace → access other
   processes; writable release_agent/cgroup → classic notify-on-release escape.
3. **Pick one contained proof.** Choose the least-disruptive available primitive.
   For a mounted runtime socket, prove control read-only:
   ```bash
   # docker.sock mounted into the container → talk to the host daemon (read-only)
   curl -s --unix-socket /var/run/docker.sock http://localhost/containers/json \
     | head -c 400          # listing host containers proves runtime control
   ```
   For a host-root mount, read a host-only file (e.g. `/host/etc/hostname`) to prove
   filesystem crossing. Stop at the minimal evidence.
4. **Confirm the boundary crossed.** Demonstrate that what you accessed lives on the
   **host / another tenant**, not inside your container (different hostname, other
   containers, node-only files).
5. **Map the onward blast radius (describe, don't execute).** Note what the escape
   *would* enable — node IAM credentials via IMDS, other pods' secrets, kubelet
   access — from configuration review rather than by performing it.
6. **Record** the exact misconfiguration (privileged flag, capability, mount,
   namespace), the proof of crossing, the described blast radius, and the fix:
   drop privileges/capabilities, remove sensitive mounts, enforce a restricted Pod
   Security Standard, and use user namespaces / rootless runtimes.

## Paired defense / offense

Pairs with **cloud-container-hardening**. Every misconfiguration you enumerate maps
to a control that skill enforces (Pod Security admission, dropped capabilities, no
host mounts, seccomp/AppArmor), and the runtime behaviour of an escape — a
container process touching host namespaces or the runtime socket — is what its
runtime detection flags.

## Validation

Reproduce in a lab cluster/host you own:

1. Run a container deliberately misconfigured (`--privileged` or with
   `/var/run/docker.sock` mounted) on a disposable node.
2. From inside, enumerate the security context and perform one contained proof
   (list host containers via the socket, or read a host-only file).
3. Apply a restricted Pod Security Standard / drop the privilege and mount, re-run,
   and confirm the escape primitive is no longer available.

**Validated 2026-08-06 against Docker (Colima VM host).** Two escape primitives were
proven from inside a container: (1) a `--privileged` container with
`/var/run/docker.sock` bind-mounted listed the **host's** containers via
`curl --unix-socket /var/run/docker.sock http://localhost/containers/json` —
full control of the host runtime; and (2) a `--privileged --pid=host` container ran
`nsenter -t 1 -m -u -i -n -p cat /etc/hostname` and read the **host** hostname
(`colima`, not the container id) — a mount/PID-namespace crossing to the node. The
hardened control run (`--cap-drop ALL --security-opt no-new-privileges --read-only`,
no socket) had no `docker.sock` and failed `nsenter` with
`setns(): Operation not permitted` — the escape primitives were unavailable.

## References

- MITRE ATT&CK T1611 Escape to Host; T1610 Deploy Container
- OWASP: A04:2021 Insecure Design; NIST SP 800-190 Container Security
- Kubernetes Pod Security Standards; seccomp/AppArmor; user namespaces
- CAPEC-233; CWE-269 Improper Privilege Management; CWE-250 Execution with Unnecessary Privileges
