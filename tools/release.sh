#!/usr/bin/env bash
# Cut a release. Usage: tools/release.sh 1.1.0
#
# Runs every gate locally first, so the Release you publish is one that CI has
# already agreed with. Nothing is pushed until the final confirmation.
set -euo pipefail

version="${1:-}"
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

echo "==> full CI gate (make check + labs)"
make check
python tools/replay_labs.py

echo "==> node smoke test"
node -c bin/cli.js
node -c bin/mcp.js
node bin/cli.js list > /dev/null

echo "==> bumping package.json to $version"
npm version "$version" --no-git-tag-version > /dev/null
npm pack --dry-run > /dev/null

echo
echo "Now edit CHANGELOG.md: move [Unreleased] entries under '## [$version] — $(date +%F)'."
read -r -p "Press enter once CHANGELOG.md is updated (or Ctrl-C to abort). "

grep -q "## \[$version\]" CHANGELOG.md || { echo "CHANGELOG.md has no [$version] section"; exit 1; }

git add package.json package-lock.json CHANGELOG.md
git commit -m "release: $tag"

echo
git --no-pager show --stat HEAD
read -r -p "Push this commit and publish release $tag? [y/N] " ok
[ "$ok" = "y" ] || { echo "aborted (commit kept locally; 'git reset --hard origin/main' to undo)"; exit 1; }

git push origin main
git tag -a "$tag" -m "$tag"
git push origin "$tag"

gh release create "$tag" \
  --title "$tag" \
  --notes "$(awk "/^## \\[$version\\]/{f=1;next} /^## \\[/{f=0} f" CHANGELOG.md)" \
  --verify-tag

echo
echo "Release published. Watching the release workflows:"
gh run list --limit 5
