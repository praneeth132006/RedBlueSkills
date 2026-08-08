#!/usr/bin/env bash
# Scenario: CICD-SEC-5 Insufficient PBAC — cross-job secret exposure.
#
# The `build` job legitimately needs only ANALYTICS_KEY. A poisoned step in it
# enumerates which pipeline secrets are present in its environment. VULN (global
# scope) leaks the unrelated DEPLOY_KEY into build; HARDENED (per-job scope) does not.
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
. "$HERE/runner.sh"

# Poisoned step: report which *foreign* secret names are visible (names only).
POISON='echo "RBS-PBAC build sees:"; for k in DEPLOY_KEY ANALYTICS_KEY; do
  eval "v=\${$k:-}"; [ -n "$v" ] && echo "  present:$k"; done'

AUDIT="$(mktemp "${TMPDIR:-/tmp}/ci-local-pbac.XXXXXX")"

# VULN: global secret injection
out_vuln="$(run_job build global inline ANALYTICS_KEY "$AUDIT" "$POISON")"
if printf '%s\n' "$out_vuln" | grep -q 'present:DEPLOY_KEY'; then
  echo "RESULT vuln pbac ATTACK_SUCCEEDED build-job-can-read-foreign-DEPLOY_KEY"
else
  echo "RESULT vuln pbac ATTACK_FAILED foreign-secret-not-exposed"
fi

# HARDENED: per-job secret injection
out_hard="$(run_job build per-job inline ANALYTICS_KEY "$AUDIT" "$POISON")"
if printf '%s\n' "$out_hard" | grep -q 'present:DEPLOY_KEY'; then
  echo "RESULT hardened pbac NOT_BLOCKED foreign-secret-still-exposed"
elif printf '%s\n' "$out_hard" | grep -q 'present:ANALYTICS_KEY'; then
  echo "RESULT hardened pbac ATTACK_BLOCKED only-own-ANALYTICS_KEY-present"
else
  echo "RESULT hardened pbac ERROR no-secrets-visible-at-all"
fi
rm -f "$AUDIT"
