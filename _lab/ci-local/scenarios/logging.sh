#!/usr/bin/env bash
# Scenario: CICD-SEC-10 Insufficient Logging & Visibility — log suppression.
#
# A malicious step emits a marker (the trace a defender would key on) and then
# erases its own job log. VULN (inline log = a workspace file the step can reach)
# lets the step wipe the record. HARDENED (out-of-band append-only audit sink the
# step has no handle to) preserves the marker even though the step still wipes its
# decoy log.
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
. "$HERE/runner.sh"

# Malicious step: leave a marker, do "work", then suppress + wipe the log it can see.
ATTACK='echo "RBS-LOG-MARKER attacker-was-here"; : do-malicious-thing;
        : > "$JOBLOG"; exec >/dev/null 2>&1; echo "this line is hidden"'

# VULN: inline logging — the job log IS the record and the step wiped it.
AUDIT_V="$(mktemp "${TMPDIR:-/tmp}/ci-local-logv.XXXXXX")"
out_vuln="$(run_job deploy global inline DEPLOY_KEY "$AUDIT_V" "$ATTACK")"
if printf '%s\n' "$out_vuln" | grep -q 'RBS-LOG-MARKER'; then
  echo "RESULT vuln logging ATTACK_FAILED marker-survived-in-inline-log"
else
  echo "RESULT vuln logging ATTACK_SUCCEEDED marker-erased-from-job-log"
fi
rm -f "$AUDIT_V"

# HARDENED: out-of-band audit sink — check the sink, not the step's stdout.
AUDIT_H="$(mktemp "${TMPDIR:-/tmp}/ci-local-logh.XXXXXX")"
run_job deploy global oob DEPLOY_KEY "$AUDIT_H" "$ATTACK" >/dev/null
if grep -q 'RBS-LOG-MARKER' "$AUDIT_H"; then
  echo "RESULT hardened logging ATTACK_BLOCKED marker-preserved-in-oob-audit-sink"
else
  echo "RESULT hardened logging NOT_BLOCKED marker-missing-from-audit-sink"
fi
rm -f "$AUDIT_H"
