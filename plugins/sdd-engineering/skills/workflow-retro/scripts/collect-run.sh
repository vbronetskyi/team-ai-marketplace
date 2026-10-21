#!/usr/bin/env bash
# Facts for a retro of one SDD feature folder, read from the files and git — no model.
set -euo pipefail
dir="${1:?usage: collect-run.sh <specs/feature>}"
spec="$dir/spec.md"; plan="$dir/plan.md"; ver="$dir/verification.md"
[ -f "$spec" ] && [ -f "$plan" ] || { echo "need $spec and $plan" >&2; exit 2; }

acs=$(grep -oE '\bAC-[0-9]+\b' "$spec" | sort -u | wc -l | tr -d ' ')
tasks=$(grep -cE '^\s*- \[( |x|X)\] T[0-9]+' "$plan" || true)
done_=$(grep -cE '^\s*- \[(x|X)\] T[0-9]+' "$plan" || true)
echo "criteria: $acs · tasks: $tasks · done: $done_"

echo; echo "commits from the matrix:"
shas=$(grep -E '^\|' "$plan" | grep -oE '\b[0-9a-f]{7,40}\b' | sort -u || true)
for s in $shas; do git log -1 --format="  %h %ad %s" --date=short "$s" 2>/dev/null || echo "  $s (not in this repo)"; done

echo; echo "spec changelog:"
awk '/^## Changelog/{f=1;next} /^## /{f=0} f && NF' "$spec" | sed 's/^/  /'

if [ -f "$ver" ]; then
  echo; echo "verifier:"
  grep -iE 'verdict|^- \*\*(extra|untested)' "$ver" | sed 's/^/  /' || true
else
  echo; echo "verifier: no verification.md"
fi

first=$(git log --diff-filter=A --format=%ad --date=iso -- "$spec" | tail -1)
last=$(git log -1 --format=%ad --date=iso -- "$dir" .)
echo; echo "spec added: ${first:-unknown} · last commit: ${last:-unknown}"
