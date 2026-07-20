---
name: REPLACE-with-kebab-case-name
description: >-
  REPLACE. One or two sentences an agent reads to decide WHEN to use this skill.
  Lead with the action, then the trigger conditions. Keep under 1024 characters.
version: 0.1.0
team: red                      # red | blue | purple
app_type: web-app              # must match the parent <app-type> directory
killchain:
  framework: mitre-attack      # mitre-attack | unified-kill-chain
  stage: recon                 # must match the parent <killchain-stage> directory
techniques:
  attack: []                   # e.g. [T1190]
  capec: []                    # e.g. [CAPEC-66]
  cwe: []                      # e.g. [CWE-89]
  owasp: []                    # e.g. ["A03:2021"]
  d3fend: []                   # blue skills: e.g. [D3-IAA]
pairs_with: []                 # names of complementary skills; cross-team pairs must be bidirectional
risk:
  level: low                   # info | low | medium | high | critical
  reversible: true
  data_touch: read             # none | read | read-write
authorization: required        # required | not-required
maturity: draft                # draft | reviewed | validated | stale
# validation:                  # uncomment and fill when maturity == validated
#   method: lab
#   target: owasp-juice-shop
#   last_validated: 2026-01-01
#   validated_by: your-handle
license: Apache-2.0
---

# Skill title

## Overview

One paragraph: what this skill does and the conditions under which it applies.

## Authorization & scope

State plainly that this is for authorized testing only. List the scope checks the
operator must confirm before acting (target in scope, written authorization on
file, testing window). Blue skills: state data-handling boundaries instead.

## Preconditions

- What must be true before starting.
- What inputs the skill needs.

## Procedure

1. Step one.
   ```bash
   # illustrative, scoped command
   ```
2. Step two.

## Paired defense / offense

Explain the `pairs_with` relationship: what signal this skill emits (red) or
consumes (blue), and how the complementary skill closes the loop.

## Validation

How to reproduce the result against the named target.

## References

- Authoritative source 1
- Authoritative source 2
