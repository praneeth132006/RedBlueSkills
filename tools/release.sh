#!/usr/bin/env bash
# Cut a release. Usage: tools/release.sh 1.1.0
#
# Runs every gate locally first, so the Release you publish is one that CI has
# already agreed with. Nothing is pushed until the final confirmation.
set -euo pipefail

version="${1:-}"
confirm="${2:-}"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "version must be X.Y.Z"; exit 1; }
[ -z "$confirm" ] || [ "$confirm" = "--yes" ] || { echo "unknown option: $confirm"; exit 1; }
[ -n "$version" ] || { echo "usage: tools/release.sh <version>   (e.g. 1.1.0)"; exit 1; }
case "$version" in v*) echo "pass the bare version, no leading v"; exit 1;; esac
tag="v$version"

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

# The Makefile targets call `python`; CI gets that from setup-python, locally it
# usually only exists inside the venv.
if ! command -v python >/dev/null 2>&1; then
  [ -x "$root/.venv/bin/python" ] || { echo "no 'python' on PATH and no .venv — run: make install"; exit 1; }
  PATH="$root/.venv/bin:$PATH"
  export PATH
fi

echo "==> preflight"
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "not on main"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "working tree is dirty"; exit 1; }
git fetch --tags --quiet origin
git diff --quiet HEAD origin/main || { echo "main is not in sync with origin/main"; exit 1; }
git rev-parse -q --verify "refs/tags/$tag" >/dev/null && { echo "$tag already exists"; exit 1; } || true

grep -Fq "## [$version]" CHANGELOG.md || { echo "commit CHANGELOG.md with a [$version] section first"; exit 1; }

echo "==> update package version and all derived metadata"
current="$(node -p 'require("./package.json").version')"
if [ "$current" != "$version" ]; then
  npm version "$version" --no-git-tag-version > /dev/null
fi
make site-build

echo "==> full CI gate (make check + labs)"
make check
python tools/replay_labs.py

echo "==> node smoke test"
node -c bin/cli.js
node -c bin/mcp.js
node bin/cli.js list > /dev/null

npm pack --dry-run > /dev/null

git add package.json package-lock.json CHANGELOG.md catalog.json INDEX.md COVERAGE.md README.md \
  sbom.cdx.json provenance.json site/catalog.json site/content.json site/coverage.svg \
  site/badges site/sbom.cdx.json site/provenance.json
if ! git diff --cached --quiet; then
  git commit -m "release: $tag"
fi

echo
git --no-pager show --stat HEAD
if [ "$confirm" != "--yes" ]; then
  read -r -p "Push this commit and publish release $tag? [y/N] " ok
  [ "$ok" = "y" ] || { echo "aborted; local commit retained"; exit 1; }
fi

git push origin main
git tag -a "$tag" -m "$tag"
git push origin "$tag"

notes="$(mktemp)"
trap 'rm -f "$notes"' EXIT
awk -v heading="## [$version]" 'index($0, heading)==1 {f=1;next} /^## \[/{f=0} f' CHANGELOG.md > "$notes"
gh release create "$tag" --title "$tag" --notes-file "$notes" --verify-tag

echo
echo "Release published. Watching the release workflows:"
gh run list --limit 5
