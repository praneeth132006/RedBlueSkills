#!/usr/bin/env python3
"""Re-prove the validated skills by replaying their labs.

A `validated` maturity stamp is only worth something if it can be re-checked.
This runner discovers every lab under `_lab/*/` that ships a `validate.sh` or
`validate.py`, runs it, and reports pass/fail. Each lab asserts that the paired
attack SUCCEEDS against the vulnerable config and is BLOCKED by the hardened one.

Labs are discovered dynamically — drop a new `_lab/<name>/validate.{sh,py}` and
it is picked up with no edit here. Labs that need external infrastructure
(Docker, cloud) are marked `offline: false` in `_lab/labs.json` and skipped
unless `--all` is passed, so CI can run the self-contained ones on every push.

Usage:
    python tools/replay_labs.py [--all] [--list] [--lab NAME]
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LAB_DIR = REPO / "_lab"
MANIFEST = LAB_DIR / "labs.json"


def _manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {}


def discover() -> list[dict]:
    """Every _lab/<name> that has a validate.sh or validate.py, sorted by name."""
    manifest = _manifest()
    labs = []
    for child in sorted(LAB_DIR.iterdir()):
        if not child.is_dir():
            continue
        runner = None
        if (child / "validate.sh").exists():
            runner = ("bash", str(child / "validate.sh"))
        elif (child / "validate.py").exists():
            runner = (sys.executable, str(child / "validate.py"))
        if not runner:
            continue
        meta = manifest.get(child.name, {})
        labs.append({
            "name": child.name,
            "dir": child,
            "runner": runner,
            "offline": meta.get("offline", True),
            "description": meta.get("description", ""),
        })
    return labs


def run_lab(lab: dict) -> bool:
    print(f"\n=== {lab['name']} " + "=" * max(0, 40 - len(lab["name"])))
    proc = subprocess.run(lab["runner"], cwd=str(lab["dir"]))
    ok = proc.returncode == 0
    print(f"--- {lab['name']}: {'PASS' if ok else 'FAIL'} (exit {proc.returncode})")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--all", action="store_true",
                    help="also run labs that need external infra (Docker, cloud)")
    ap.add_argument("--list", action="store_true", help="list discovered labs and exit")
    ap.add_argument("--lab", help="run only the named lab")
    args = ap.parse_args()

    labs = discover()
    if args.lab:
        labs = [l for l in labs if l["name"] == args.lab]
        if not labs:
            print(f"no lab named '{args.lab}'", file=sys.stderr)
            return 1

    if args.list:
        for l in labs:
            scope = "offline" if l["offline"] else "needs-infra"
            print(f"  {l['name']:<12} [{scope}] {l['description']}")
        return 0

    selected = labs if args.all else [l for l in labs if l["offline"]]
    skipped = [l for l in labs if l not in selected]

    if not selected:
        print("no runnable labs selected", file=sys.stderr)
        return 1

    results = {l["name"]: run_lab(l) for l in selected}

    print("\n" + "=" * 52)
    for name, ok in results.items():
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
    for l in skipped:
        print(f"  SKIP  {l['name']} (needs external infra; use --all)")
    failed = [n for n, ok in results.items() if not ok]
    print("=" * 52)
    if failed:
        print(f"replay FAILED: {', '.join(failed)}")
        return 1
    print(f"replay OK: {len(results)} lab(s) re-proven"
          + (f", {len(skipped)} skipped" if skipped else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
