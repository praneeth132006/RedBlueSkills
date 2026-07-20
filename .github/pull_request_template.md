<!-- Thanks for contributing! Small, focused PRs merge fastest. -->

## What this changes

<!-- One or two sentences. Which skill(s) or tooling? -->

## Type

- [ ] New skill / skill pair
- [ ] Update to an existing skill
- [ ] Tooling / schema change (opened a discussion issue first)
- [ ] Docs only

## Skill checklist (if adding/updating a skill)

- [ ] Follows [`SKILL-SPEC.md`](../SKILL-SPEC.md) — all required frontmatter + body sections
- [ ] Has a **paired** skill on the other team, cross-linked bidirectionally in `pairs_with`
- [ ] `validation` block filled in (method, target, date, handle) if `maturity: validated`
- [ ] Payloads are illustrative/scoped; no live secrets or real target data
- [ ] Meets the responsible-use standards in [`ETHICS.md`](../ETHICS.md)

## Verification

- [ ] `make check` passes locally (validate + catalog freshness + tests)
- [ ] Ran `make catalog` and committed the regenerated `catalog.json` / `INDEX.md`

## Notes for reviewers

<!-- Anything reviewers should focus on, or context on the validation target. -->
