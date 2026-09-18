# Releasing

The npm package contains CLI/MCP binaries, the complete skill catalog and
provenance, documentation, and three offline labs. It has no runtime npm
dependencies or postinstall scripts. Node.js 16+ runs the CLI/MCP; labs require
Python 3.10+ or bash/git as listed by `redblueskills lab --list`.

## Prepare and test

Commit a versioned CHANGELOG section and merge the tested release PR into main.
Then, from a clean main checkout in sync with origin:

```bash
tools/release.sh 1.1.0            # confirm before pushing
# tools/release.sh 1.1.0 --yes    # only when publication is already authorized
```

The script updates the package version, rebuilds catalog/site/provenance,
runs `make check`, offline labs, and npm packing, and commits generated changes.
It then pushes the tag and creates the GitHub Release. Every publishing workflow
checks the tag version; release and npm workflows run the full test gate including
an actual tarball install in a temporary consumer project. `prepack` independently
checks bundled hashes and versions. Test changes before choosing an immutable
release version.

## Distribution

- **npmjs.com:** `npm install -g redblueskills@1.1.0`, or
  `npx --package redblueskills@1.1.0 redblueskills verify` after a successful npm publish.
- **GitHub Release:** auth-free npm tarball, available once the release workflow succeeds:
  `npm install -g https://github.com/praneeth132006/RedBlueSkills/releases/download/v1.1.0/redblueskills-1.1.0.tgz`.
- **GitHub Packages:** `@praneeth132006/redblueskills`, published with the workflow's
  repository token. Consumers need GitHub package-read authentication.

`release.yml` attaches the tarball and publishes GitHub Packages.
`provenance.yml` attaches signed SBOM/provenance and attestations.
`npm-publish.yml` publishes the unscoped package to npmjs.com.

## npm authentication

For the initial npm publication, authenticate locally with `npm login` and publish
with the account's required second factor. Never commit npm credentials.
For subsequent CI publishing, configure the package's trusted publisher for
`praneeth132006/RedBlueSkills`, workflow `npm-publish.yml`. The workflow grants
`id-token: write` and uses Node 24. npm trusted publishing requires npm >=11.5.1
and Node >=22.14.0; see [npm's official guide](https://docs.npmjs.com/trusted-publishers/).
An existing `NPM_TOKEN` secret is a fallback where the account's policy permits it.
An E401/ENEEDAUTH is an authentication problem; an EOTP needs the account's
verification flow. Do not infer token settings from an error code alone or weaken
account protections to force publication.

## Verify the public artifact

Check the release workflow results with `gh run list`. Download/install the actual
published tarball in a temporary project, run `redblueskills verify`, execute
`redblueskills lab security-controls`, and retrieve the catalog through MCP.
For npm, also confirm `npm view redblueskills@1.1.0 version dist.integrity` and test
an exact-version install in a fresh consumer. A passing checkout test alone does
not establish that the public artifact is correct.
