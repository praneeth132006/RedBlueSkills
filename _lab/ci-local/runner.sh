#!/usr/bin/env bash
# Minimal CI runner that models the two pipeline controls under test:
#
#   SCOPE   = global   -> every job's environment receives ALL pipeline secrets
#             per-job   -> a job receives only the secrets it declares (uses_secrets)
#
#   LOGMODE = inline    -> the job log is a workspace file the running step can reach
#                          (and therefore truncate/tamper after acting)
#             oob       -> the runner streams step output to an append-only audit sink
#                          the step has no handle to; the step's own decoy log is
#                          irrelevant to the record
#
# This is a faithful model of how a real runner injects secrets and captures logs;
# it is intentionally tiny, dependency-free (bash 3.2), and deterministic.
set -u

# Secret table (name<TAB>value), kept out of any per-job default environment.
_secret_value() {  # $1 = name
  case "$1" in
    DEPLOY_KEY)    printf 'rbs-deploy-s3cr3t' ;;
    ANALYTICS_KEY) printf 'rbs-analytics-k3y' ;;
    *) return 1 ;;
  esac
}
ALL_SECRETS="DEPLOY_KEY ANALYTICS_KEY"

# run_job NAME SCOPE LOGMODE USES_SECRETS AUDIT_LOG STEP
# Prints the step's captured output on stdout. Returns the step's status.
run_job() {
  name="$1"; scope="$2"; logmode="$3"; uses="$4"; audit="$5"; step="$6"

  # Build the environment assignments for `env`.
  if [ "$scope" = "global" ]; then
    inject="$ALL_SECRETS"
  else
    inject="$uses"
  fi
  env_args=""
  for k in $inject; do
    v="$(_secret_value "$k")" || continue
    env_args="$env_args $k=$v"
  done

  work="$(mktemp -d "${TMPDIR:-/tmp}/ci-local-job.XXXXXX")"
  joblog="$work/$name.log"
  : > "$joblog"

  if [ "$logmode" = "inline" ]; then
    # Step's stdout is appended to a workspace file the step also knows ($JOBLOG),
    # so a malicious step can erase the evidence after acting.
    # shellcheck disable=SC2086
    env $env_args JOBLOG="$joblog" bash -c "$step" >>"$joblog" 2>&1
    st=$?
    cat "$joblog"
  else
    # Out-of-band: the runner captures each line and appends it to an audit sink the
    # step cannot reach. The step gets a *decoy* JOBLOG it may tamper harmlessly.
    # shellcheck disable=SC2086
    env $env_args JOBLOG="$joblog" bash -c "$step" 2>&1 \
      | while IFS= read -r line; do
          printf '%s\n' "$line"
          printf '%s\n' "$line" >> "$audit"
        done
    st=0
  fi
  rm -rf "$work"
  return $st
}
