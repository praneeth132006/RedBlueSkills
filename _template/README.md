# Skill template

Copy this directory to start a new skill:

```bash
cp -r _template skills/web-app/red/initial-access/my-new-skill
```

Then:

1. Rename the directory to your kebab-case skill name.
2. Fill in `SKILL.md` frontmatter — every REQUIRED field in [`SKILL-SPEC.md`](../SKILL-SPEC.md).
3. Write the body sections in the order the spec requires.
4. If your skill has a `pairs_with` counterpart on the other team, add this
   skill to *its* `pairs_with` list too — the validator enforces bidirectional
   pairing.
5. Run the validator locally before opening a PR:
   ```bash
   make validate      # or: python tools/validate.py
   ```
6. Regenerate the catalog so CI stays green:
   ```bash
   make catalog       # or: python tools/build_catalog.py
   ```

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the full review and validation flow.
