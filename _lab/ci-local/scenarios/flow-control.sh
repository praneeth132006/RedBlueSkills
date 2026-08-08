#!/usr/bin/env bash
# Scenario: CICD-SEC-1 Insufficient Flow Control — server-side branch protection.
#
# Models the load-bearing control with a real git server: a bare repo whose
# pre-receive hook rejects writes to a protected ref (and non-fast-forward/force
# updates). VULN = no hook (direct push to main lands); HARDENED = hook installed
# (direct push and force-push to main rejected; a feature-branch push still works).
#
# Prints RESULT lines consumed by validate.sh. No network, no Docker.
set -u

WORK="$(mktemp -d "${TMPDIR:-/tmp}/ci-local-flow.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK" || exit 2

mk_client() {  # $1 = remote path
  rm -rf client && git clone -q "$1" client 2>/dev/null && cd client || return 1
  git config user.email tester@example-lab.local
  git config user.name  tester
  git commit -q --allow-empty -m "seed" && git branch -M main
  git push -q origin main 2>/dev/null
  cd "$WORK"
}

install_protection() {  # $1 = bare repo path
  cat > "$1/hooks/pre-receive" <<'HOOK'
#!/usr/bin/env bash
# Protected-branch policy: no direct or force pushes to main.
status=0
while read -r old new ref; do
  if [ "$ref" = "refs/heads/main" ]; then
    echo "policy: direct pushes to 'main' are blocked (protected branch)" >&2
    status=1
  fi
done
exit $status
HOOK
  chmod +x "$1/hooks/pre-receive"
}

# ---- VULN: unprotected remote, direct push to main ----
git init -q --bare vuln.git
mk_client "$WORK/vuln.git"
cd client
git commit -q --allow-empty -m "RBS-FLOW-marker direct-to-main"
if git push -q origin HEAD:main 2>/dev/null; then
  echo "RESULT vuln flow-control ATTACK_SUCCEEDED direct-push-to-main-accepted"
else
  echo "RESULT vuln flow-control ATTACK_FAILED unexpected-rejection"
fi
cd "$WORK"

# ---- HARDENED: protected remote, same attack + a force push ----
git init -q --bare hardened.git
install_protection "$WORK/hardened.git"
# seed via a permitted feature-branch path (hook only guards main)
rm -rf client && git clone -q "$WORK/hardened.git" client 2>/dev/null && cd client
git config user.email tester@example-lab.local; git config user.name tester
git commit -q --allow-empty -m "seed"
git branch -M main
seeded_direct=1
git push -q origin main 2>/dev/null || seeded_direct=0   # expected to be rejected

git checkout -q -b feature/x
git commit -q --allow-empty -m "RBS-FLOW-marker via feature branch"
feature_ok=1
git push -q origin feature/x 2>/dev/null && feature_ok=1 || feature_ok=0

git checkout -q main 2>/dev/null || git checkout -q -B main
git commit -q --allow-empty -m "RBS-FLOW-marker direct-to-main (should be blocked)"
direct_blocked=1
if git push -q origin HEAD:main 2>/dev/null; then direct_blocked=0; fi

force_blocked=1
git commit -q --allow-empty -m "force"
if git push -q --force origin HEAD:main 2>/dev/null; then force_blocked=0; fi
cd "$WORK"

if [ "$direct_blocked" = 1 ] && [ "$force_blocked" = 1 ] && [ "$feature_ok" = 1 ]; then
  echo "RESULT hardened flow-control ATTACK_BLOCKED direct+force-rejected feature-branch-ok"
else
  echo "RESULT hardened flow-control NOT_BLOCKED direct=$direct_blocked force=$force_blocked feature=$feature_ok"
fi
