---
name: api-mass-assignment
description: >-
  Find and prove mass assignment / Broken Object Property Level Authorization
  (API3:2023) in an API during an authorized test — setting privileged or
  internal object properties by adding them to a request body. Use when a
  create/update endpoint binds request fields to an object and you need to confirm
  it accepts properties the caller should not control.
version: 1.0.0
team: red
app_type: api
killchain:
  framework: mitre-attack
  stage: privilege-escalation
techniques:
  attack: [T1190]
  capec: [CAPEC-137]
  cwe: [CWE-915]
  owasp: ["A08:2021"]
  d3fend: []
pairs_with: [api-mass-assignment-hardening]
risk:
  level: high
  reversible: true
  data_touch: read-write
authorization: required
maturity: validated
validation:
  method: lab
  target: owasp-crapi
  last_validated: 2026-08-05
  validated_by: praneeth132006
license: Apache-2.0
---

# API mass assignment (Broken Object Property Level Authorization)

## Overview

Mass assignment happens when an endpoint binds an incoming JSON/form body directly
to an object's fields, so a client can set properties the server never meant to
expose — `isAdmin`, `role`, `verified`, `balance`, `tenantId`, `price`. It is the
write-side twin of excessive data exposure: the server trusts the shape of the
input. This skill confirms which privileged properties a create/update endpoint
accepts, using **test objects you own** and reversible changes.

## Authorization & scope

**Run only against APIs you are explicitly authorized to test.** Inject extra
properties into requests for **objects you created** under a test account. Prove
the flaw with a **reversible, non-sensitive** property change (e.g. flip a boolean
on your own test record) and restore it. Do not set properties that move money,
grant real entitlements on production, or alter other tenants' objects.

## Preconditions

- A create or update endpoint and a valid body for it.
- Knowledge of the object's privileged/internal properties — from the read
  response (see `api-excessive-data-exposure`), the schema, error messages, or an
  admin response shape.

## Procedure

1. **Learn the full property set.** `GET` the object (or read the schema) and note
   every field, especially ones absent from the create/update form: `role`,
   `isAdmin`, `status`, `owner`, `tenant`, `credit`, timestamps, internal ids.
2. **Baseline a clean write.** Perform a legitimate create/update as the test user
   and record the resulting object.
3. **Inject a privileged property.** Add a candidate field to the body:
   ```bash
   curl -s -X PATCH -H "Authorization: Bearer $USER_TOKEN" \
        -H 'Content-Type: application/json' \
        -d '{"nickname":"test","isAdmin":true}' \
        "https://TARGET/api/v2/user/profile"
   ```
   Re-read the object; if `isAdmin` (or another privileged field) changed, mass
   assignment is confirmed.
4. **Try nested and aliased shapes.** Nested objects (`{"user":{"role":"admin"}}`),
   arrays, and alternate casings/aliases often bypass a partial allowlist.
5. **Try creation vs. update.** A `POST` create path may accept fields the `PATCH`
   path rejects, and vice versa; test both.
6. **Assess impact minimally.** One confirmed privileged property is enough — do
   not chain it into a real privilege grant on production. Restore any changed
   test object.
7. **Record** the endpoint, the accepted property, its effect, and the fix:
   bind only an explicit **allowlist** of client-writable fields (DTO/schema),
   never the raw request body, and authorize sensitive properties server-side.

## Paired defense / offense

Pairs with **api-mass-assignment-hardening**, which removes the class by enforcing
input allowlists and server-authorized property changes. Use this skill to prove
the gap before the fix and to regression-test after: the injected privileged
property should be silently dropped or rejected once hardening lands.

## Validation

Reproduce against **OWASP crAPI** in a lab:

1. Stand up crAPI and authenticate a standard user.
2. On a profile/update endpoint, submit a body containing a privileged property
   (e.g. an elevated role or internal flag) not present in the normal form.
3. Re-read the object and confirm whether the privileged property was applied.

**Validated 2026-08-05 against OWASP crAPI.** `POST /workshop/api/shop/apply_coupon` trusted a client-supplied `amount` property: sending `amount: 9999` for a coupon whose server-side value was 75 drove `available_credit` from `100.0` to `10099.0` — a privileged property set from the request body.

## References

- OWASP API Security Top 10 — API3:2023 Broken Object Property Level Authorization
- OWASP: A08:2021 Software and Data Integrity Failures; Mass Assignment Cheat Sheet
- MITRE ATT&CK T1190
- CWE-915 Improperly Controlled Modification of Dynamically-Determined Object
  Attributes; CAPEC-137 Parameter Injection
