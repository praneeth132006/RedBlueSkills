# Governance

RedBlueSkills is an open-source project. This document describes how decisions are
made so the project stays trustworthy as it grows.

## Roles

- **Users** — anyone using skills under the [responsible-use policy](ETHICS.md).
- **Contributors** — anyone who opens a PR or issue.
- **Maintainers** — trusted contributors with merge rights, listed in
  [`.github/CODEOWNERS`](.github/CODEOWNERS). They review for correctness, safety,
  and adherence to the spec.
- **Lead maintainer** — breaks ties and stewards the roadmap. Currently
  [@praneeth132006](https://github.com/praneeth132006).

## How a skill gets merged

1. CI must be green (schema validation, bidirectional pairing, catalog freshness,
   tests).
2. At least **one maintainer approval** to merge as `draft`/`reviewed`.
3. **Two maintainer approvals** for a skill to be marked `validated` — one of whom
   confirms the validation was reproduced.
4. Content is checked against [`ETHICS.md`](ETHICS.md). Anything failing the
   responsible-use standards is declined regardless of technical quality.

## Schema & tooling changes

Changes to [`SKILL-SPEC.md`](SKILL-SPEC.md) or `tools/` affect every skill and
require:

- An issue describing the change and its migration impact, discussed before a PR.
- Tests for any new validation rule.
- Lead-maintainer sign-off.

## Becoming a maintainer

Contributors who land several high-quality, validated skill pairs and show good
judgment on safety may be invited to maintain. Maintainers are added to
`CODEOWNERS` by the lead maintainer.

## Decision-making

We favour lazy consensus: proposals proceed unless a maintainer objects with
reasoning. Unresolved disagreements are decided by the lead maintainer. Major
direction changes (new top-level app types, licensing, scope) are announced via
an issue tagged `rfc` with at least 7 days for comment.

## Code of conduct

All participation is governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
