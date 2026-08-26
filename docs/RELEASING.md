# Releasing

RedBlueSkills releases are cut from a **GitHub Release**. Publishing that Release
is the single trigger — three workflows fan out from it:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `release.yml` | Release published | Attaches the install tarball to the Release + publishes to GitHub Packages (`GITHUB_TOKEN`, no secret needed) |
| `provenance.yml` | Release published | Regenerates + cosign-signs `sbom.cdx.json` / `provenance.json`, attaches them |
| `npm-publish.yml` | Release published | Publishes to npmjs.com — **only works once npm auth is fixed** (see below) |

## Distribution channels

1. **Release tarball** (`redblueskills-<version>.tgz`, attached to every Release).
   Needs no account and no auth:
   ```bash
   npm i -g https://github.com/praneeth132006/RedBlueSkills/releases/download/v1.0.0/redblueskills-1.0.0.tgz
   ```
2. **GitHub Packages** — `@praneeth132006/redblueskills`. Consumers must
   authenticate with a GitHub PAT (`read:packages`) **even though the package is
   public**; that is a registry limitation, not a misconfiguration:
   ```bash
   npm config set @praneeth132006:registry https://npm.pkg.github.com
   npm login --registry=https://npm.pkg.github.com   # username + PAT as password
   npm i -g @praneeth132006/redblueskills
   ```
3. **npmjs.com** — `redblueskills`, the only channel that gives a bare
   `npx redblueskills`. Blocked today; see below.

## Cutting a release

```bash
tools/release.sh 1.1.0
```

The script refuses to continue unless main is clean and in sync, runs `make check`
plus the lab replay and the Node smoke tests, bumps `package.json`, waits for you
to move the `[Unreleased]` CHANGELOG entries under the new version heading,
commits, and — after one confirmation — pushes the tag and creates the Release
with the CHANGELOG section as its notes.

Doing it by hand is the same five steps:

1. `make check && python tools/replay_labs.py` — must be green.
2. `npm version <version> --no-git-tag-version`.
3. Move `## [Unreleased]` entries under `## [<version>] — YYYY-MM-DD` in `CHANGELOG.md`.
4. `git commit -m "release: v<version>" && git push origin main`.
5. `git tag -a v<version> -m v<version> && git push origin v<version>` then
   `gh release create v<version> --verify-tag --notes-file <notes>`.

The tag **must** match `package.json` — every publish workflow asserts it and
fails the run otherwise.

## After publishing

```bash
gh run list --limit 5
```

Expect `Release (GitHub Packages)` and `Sign provenance` green. The Release should
end up carrying the `.tgz`, `sbom.cdx.json`, `provenance.json`, and a `.sig`/`.pem`
pair for each of the two JSON files.

## npmjs.com is still blocked

`npm-publish.yml` will keep failing with `npm error code EOTP` until one of these
is done — both need a person on npmjs.com, neither can be done from CI:

- **Preferred — trusted publishing (OIDC), no secret at all.** Only configurable
  once the package name exists on the registry, so it needs one manual
  `npm publish` from a laptop first. Then: npmjs.com → the package → Settings →
  Trusted publishing → GitHub Actions, repo `praneeth132006/RedBlueSkills`,
  workflow `npm-publish.yml`. Afterwards delete the `NPM_TOKEN` secret.
- **Or — replace the token.** npmjs.com → Access Tokens → Generate → **Granular
  access token**, with **Bypass 2FA enabled** (it defaults to off — this is the
  step that is easy to miss, and without it CI is challenged for an OTP and dies
  with `EOTP` even though the token type is correct). The account has
  `two-factor auth: auth-and-writes`, so nothing else gets through. Classic
  automation/publish tokens were removed from npm in November 2025. Until this is
  set, `npx redblueskills` will not resolve.

Nothing else in the release flow depends on npmjs.com — the tarball and GitHub
Packages channels work today.
