---
name: api-mass-assignment-hardening
description: >-
  Harden an API against mass assignment / Broken Object Property Level
  Authorization (API3:2023) by binding only allowlisted, client-writable fields
  and authorizing sensitive property changes server-side. Use when designing or
  reviewing create/update endpoints that bind request bodies to objects.
version: 1.0.0
team: blue
app_type: api
killchain:
  framework: mitre-attack
  stage: harden
techniques:
  attack: [T1190]
  capec: [CAPEC-137]
  cwe: [CWE-915]
  owasp: ["A08:2021"]
  d3fend: []
pairs_with: [api-mass-assignment]
risk:
  level: info
  reversible: true
  data_touch: none
authorization: not-required
maturity: reviewed
license: Apache-2.0
---

# API mass-assignment hardening

## Overview

Mass assignment exists because a write endpoint binds the whole request body to an
object and trusts its shape. The durable fix is structural: accept only an
explicit **allowlist** of client-writable fields into a typed input object, and
authorize any sensitive property change against the caller's server-side role.
This skill hardens create/update endpoints so injected privileged properties are
dropped or rejected regardless of body shape.

## Authorization & scope

Design/configuration guidance for APIs you operate; it changes no target data and
requires no special authorization. Roll changes out behind tests, since tightening
input binding can affect clients that (incorrectly) relied on setting extra
fields.

## Preconditions

- Access to the endpoint's request-binding layer (serializer/DTO/schema,
  ORM model binding, or framework model-binding config).
- The intended list of client-writable fields per endpoint, and the set of
  server-controlled/privileged properties.

## Procedure

1. **Bind to an allowlist, not the model.** Deserialize into an explicit input
   type that contains **only** client-writable fields; map to the persistence
   model server-side. Never pass the raw body to an ORM `update`/`create`.
   - Rails: `params.permit(:nickname, :email)` (strong parameters), never
     `permit!`.
   - Node/TypeScript: validate+strip with a schema (`zod`/`joi`) using
     `.strict()` so unknown keys are rejected, then map named fields.
   - Spring: bind to a DTO with only writable fields, or restrict
     `@InitBinder setAllowedFields(...)`.
   - Django REST: set serializer `fields`/`read_only_fields` explicitly; avoid
     `fields = '__all__'`.
2. **Reject unknown properties.** Prefer schemas that **fail** on unexpected keys
   over ones that silently ignore them, so probing is visible and clients stay
   honest.
3. **Authorize sensitive changes separately.** Properties like `role`, `status`,
   `verified`, `owner`, `tenant`, and `price` must be changed only through
   server-side, role-checked paths — never via the generic update binder.
4. **Separate read and write shapes.** Use distinct input and output types; do not
   round-trip the read model back into a writable binder.
5. **Default deny for new fields.** Ensure adding a column to a model does **not**
   automatically make it client-writable — the allowlist is opt-in per field.
6. **Regression-test with the paired skill.** Wire `api-mass-assignment`'s injected
   privileged property into an automated test that asserts the property is
   unchanged after the request.

## Paired offense / defense

Pairs with **api-mass-assignment**. Run that skill before and after this hardening:
the privileged property it injects must apply before the fix and be dropped or
rejected after. Keep it as a regression test so the class cannot silently return.

## Validation

Reproduce against **OWASP crAPI** (or a staging build of your API) in a lab:

1. Apply allowlist binding to a profile/update endpoint.
2. Run the paired `api-mass-assignment` injection against it.
3. Confirm the privileged property is no longer applied and, ideally, that the
   request is rejected with a clear 4xx.

Promote to `validated` once the before/after behaviour is reproduced and recorded.

## References

- OWASP API Security Top 10 — API3:2023 Broken Object Property Level Authorization
- OWASP: Mass Assignment Cheat Sheet; A08:2021 Software and Data Integrity Failures
- MITRE ATT&CK T1190; CAPEC-137 Parameter Injection
- CWE-915 Improperly Controlled Modification of Object Attributes
