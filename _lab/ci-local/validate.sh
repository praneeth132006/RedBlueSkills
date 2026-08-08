#!/usr/bin/env bash
# Runs every ci-local scenario and asserts the expected VULN/HARDENED outcomes.
# Exit 0 only if the attack succeeds against the vulnerable config AND is blocked
# by the hardened config, for all three controls. Dependency-free (git + bash 3.2).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
pass=0; fail=0

expect() {  # $1 = human label, $2 = expected token, $3... = actual RESULT line
  label="$1"; want="$2"; shift 2; line="$*"
  if printf '%s' "$line" | grep -q " $want "; then
    echo "  PASS  $label"; pass=$((pass+1))
  else
    echo "  FAIL  $label — got: $line"; fail=$((fail+1))
  fi
}

echo "== flow-control (CICD-SEC-1) =="
out="$(bash "$HERE/scenarios/flow-control.sh")"; printf '%s\n' "$out" | sed 's/^/    /'
expect "vuln: direct push to main accepted"        "ATTACK_SUCCEEDED" "$(printf '%s\n' "$out" | grep ' vuln flow-control ')"
expect "hardened: direct+force push to main blocked" "ATTACK_BLOCKED"  "$(printf '%s\n' "$out" | grep ' hardened flow-control ')"

echo "== pbac (CICD-SEC-5) =="
out="$(bash "$HERE/scenarios/pbac.sh")"; printf '%s\n' "$out" | sed 's/^/    /'
expect "vuln: build job reads foreign DEPLOY_KEY"  "ATTACK_SUCCEEDED" "$(printf '%s\n' "$out" | grep ' vuln pbac ')"
expect "hardened: build job scoped to own secret"  "ATTACK_BLOCKED"   "$(printf '%s\n' "$out" | grep ' hardened pbac ')"

echo "== logging (CICD-SEC-10) =="
out="$(bash "$HERE/scenarios/logging.sh")"; printf '%s\n' "$out" | sed 's/^/    /'
expect "vuln: marker erased from job log"          "ATTACK_SUCCEEDED" "$(printf '%s\n' "$out" | grep ' vuln logging ')"
expect "hardened: marker preserved in audit sink"  "ATTACK_BLOCKED"   "$(printf '%s\n' "$out" | grep ' hardened logging ')"

echo
echo "ci-local: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
