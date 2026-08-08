---
name: network-remote-access-abuse
description: >-
  Demonstrate abuse of exposed remote-access services during an authorized network
  assessment — gaining a foothold through internet-facing VPN, RDP, SSH, or remote-
  management endpoints via weak/default/reused credentials, missing MFA, or an
  unpatched appliance. Use when remote-access services are reachable from untrusted
  networks and you need to prove that the external access boundary can be crossed with
  valid-account or known-vulnerability techniques (not brute-force flooding).
version: 1.0.0
team: red
app_type: network
killchain:
  framework: mitre-attack
  stage: initial-access
techniques:
  attack: [T1133, T1078, T1021.001]
  capec: [CAPEC-560, CAPEC-70]
  cwe: [CWE-287, CWE-1392]
  owasp: []
  d3fend: []
pairs_with: [network-remote-access-hardening]
risk:
  level: high
  reversible: true
  data_touch: read
authorization: required
maturity: reviewed
license: Apache-2.0
---

# Network remote-access abuse

## Overview

Remote-access services — corporate VPN gateways, RDP, SSH, and web management consoles
— are the front door to internal networks, and when they are exposed to untrusted
networks they become the most direct initial-access vector. **External remote
services** abuse is crossing that boundary without an exploit chain: authenticating
with weak, default, or previously-breached credentials, reaching a service that lacks
MFA, or hitting an unpatched VPN/appliance with a known authentication-bypass or RCE.
This skill proves, on infrastructure you are authorized to test, that a reachable
remote-access endpoint can be entered — using scoped, authorized credential checks and
known-CVE verification, not credential-stuffing at scale — and characterizes what that
foothold reaches.

## Authorization & scope

**Run only against remote-access endpoints explicitly in scope**, with the
rules-of-engagement's approval for authentication testing. Use **provided or
low-volume, targeted** credential checks (a small set of known/default pairs, or
credentials issued for the test) — never large-scale brute force or stuffing that
could lock accounts or degrade the service. Verify known-CVE exposure by version/banner
where possible before any exploit, and only run an authenticated-bypass PoC if the ROE
permits. Stop at proof of access; do not pivot beyond scope. Report exposed endpoints
and weak auth promptly.

## Preconditions

- Authorization and an explicit target list of remote-access endpoints and any
  test/known credentials permitted by the ROE.
- Tooling: a port/service scanner, version/banner identification, an MFA-state check,
  and a credential-check tool used within the ROE's volume limits.

## Procedure

1. **Discover exposed remote-access services.** From an untrusted vantage in scope,
   identify reachable VPN/RDP/SSH/management endpoints and fingerprint product and
   version:
   ```bash
   nmap -Pn -p 22,443,3389,500,4500 --open -sV <in-scope-range>
   ```
2. **Assess the auth boundary.** Determine whether each endpoint enforces MFA, whether
   default/self-service accounts exist, and whether the login is rate-limited/lockout-
   protected.
3. **Check for known appliance CVEs.** Match the VPN/gateway product+version against
   known authentication-bypass/RCE advisories; confirm exposure by version (and, only
   if ROE permits, a non-destructive PoC).
4. **Targeted credential check.** With provided or a small known/default set, test
   authentication within the ROE's volume limits — proving valid-account access, not
   flooding:
   ```bash
   # low-volume, authorized check only — respect lockout/ROE
   ssh -o PreferredAuthentications=password <user>@<host>
   ```
5. **Confirm foothold and reach.** On success, confirm the session and enumerate — read
   only — what the foothold can reach internally (which segments, hosts), without
   pivoting beyond scope.
6. **Record** each exposed endpoint (product/version, MFA state, patch state, weak/
   default creds, reachable internal scope) and the fix: remove direct exposure behind
   VPN/ZTNA, enforce phishing-resistant MFA, patch appliances, disable defaults, and
   restrict source IPs.

## Paired defense / offense

Pairs with **network-remote-access-hardening**. The exposed endpoints, missing MFA,
default credentials, and unpatched appliances this skill finds are exactly what that
skill removes — minimizing exposure, enforcing MFA, patching, and restricting who can
reach remote access at all.

## Validation

Reproduce in a lab network you own:

1. Stand up an SSH/RDP or VPN endpoint reachable from an untrusted segment with a weak
   password and no MFA.
2. Discover it, confirm the missing MFA/patch state, and gain access with an authorized
   low-volume credential check; enumerate reachable scope read-only.
3. Apply the paired hardening (place behind VPN/ZTNA, enforce MFA, patch, restrict
   source IPs) and confirm the endpoint is no longer directly reachable/enterable.

## References

- MITRE ATT&CK T1133 External Remote Services, T1078 Valid Accounts, T1021.001 Remote
  Desktop Protocol
- NIST SP 800-53 Rev 5 (AC-17 Remote Access, IA-2 MFA); CISA guidance on securing VPNs
  and RDP; CIS Controls v8 (12 Network Infrastructure, 6 Access Control)
- CAPEC-560, CAPEC-70; CWE-287, CWE-1392
