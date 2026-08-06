---
name: ci-dependency-integrity-hardening
description: >-
  Harden builds against dependency confusion / substitution and dependency-chain
  abuse (CICD-SEC-3). Use when securing dependency resolution: pinning internal
  names to a private/mirrored source, reserving public namespaces, enforcing
  integrity-hashed lockfiles, disabling untrusted install scripts, and detecting
  unexpected public resolution of internal packages.
version: 1.0.0
team: blue
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1195.002]
  capec: [CAPEC-538]
  cwe: [CWE-829, CWE-1104]
  owasp: ["A06:2021"]
  d3fend: [D3-ACH, D3-EAL]
pairs_with: [ci-dependency-confusion]
risk:
  level: low
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# CI dependency integrity hardening

## Overview

Dependency confusion is prevented by making resolution deterministic and
source-bound: every internal name resolves only from a trusted private source, the
public namespace for those names is reserved so no one else can claim it, lockfiles
pin exact versions with integrity hashes, and install-time script execution for
untrusted packages is disabled. This skill applies those controls and adds detection
for the residual risk — a build resolving an internal name from a public registry,
or an unexpected version jump.

## Authorization & scope

Defensive configuration of build systems you operate. Dependency manifests and
registry configs may reveal internal package names — treat as sensitive. No active
testing of third-party builds or registries.

## Preconditions

- Access to build configuration, package-manager/registry settings, and CI.
- An inventory of internal package names and the private registry/mirror that serves
  them.

## Procedure

1. **Bind internal names to a trusted source.** Scope internal packages (e.g. npm
   `@org/*`) and configure the resolver so those scopes/names resolve **only** from
   the private registry; route all other dependencies through a single vetted
   mirror/proxy rather than the public registry directly.
2. **Reserve the public namespace.** Register/claim the org's package scopes and
   critical internal names on the public registry so an attacker cannot publish a
   same-named package there.
3. **Pin with integrity.** Commit lockfiles with exact versions and integrity
   hashes; enforce `--frozen-lockfile`/`npm ci`/hash-checking installs in CI so a
   resolved artifact must match the pinned hash.
4. **Disable untrusted install scripts.** Turn off automatic `postinstall`/build
   scripts for third-party packages (`--ignore-scripts` with an allowlist), so a
   confused package cannot execute code at install time.
5. **Prefer-source, not prefer-version.** Ensure the resolver never prefers a
   higher version from a less-trusted source; disable multi-registry
   highest-version resolution.
6. **Detect.** Alert on any build resolving an internal name from a public source,
   an unexpected major-version jump on an internal dependency, or install-time
   network egress from a build.

## Detection engineering notes

- **Namespace reservation + source pinning** together eliminate the attack: the
  public name can't be claimed, and even if it were, the resolver won't consult the
  public source for it.
- The best detection signal is **an internal package name resolving from a public
  registry** — it should never happen once pinning is in place.

## Paired offense / defense

Pairs with **ci-dependency-confusion**. Run that skill against a lab build: source
pinning and namespace reservation should make the resolver keep the private package,
`--ignore-scripts` should stop the install-time beacon, and the "internal name from
public source" detection should flag any attempt.

## Validation

Reproduce in a lab you own with a private and a public-facing registry:

1. Confirm the paired confusion skill can substitute a higher-version public package
   before hardening.
2. Apply scope/source pinning, namespace reservation, frozen integrity-checked
   lockfiles, and `--ignore-scripts`.
3. Re-run and confirm the resolver keeps the private package, no install-time beacon
   fires, and the detection flags the public-resolution attempt.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-3 Dependency Chain Abuse
- OWASP: A06:2021 Vulnerable and Outdated Components
- Dependency Confusion (Birsan, 2021); npm scopes/`.npmrc`; SLSA; lockfile integrity
- MITRE ATT&CK T1195.002; D3FEND D3-ACH, D3-EAL; CAPEC-538; CWE-829, CWE-1104
