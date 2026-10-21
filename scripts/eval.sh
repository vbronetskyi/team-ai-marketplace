#!/usr/bin/env bash
# usage: scripts/eval.sh <plugin> [claude plugin eval options...]
# Runs a plugin's eval suite with its dependencies loaded. A case that lists `plugins:`
# loads exactly those, only from inside the plugin under test and not from a folder that
# contains the case. So the plugin itself (without evals) and the dependencies named in
# plugin.json are copied into .eval-deps/ (git-ignored) first, and cases list all of them.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
plugin="${1:?usage: scripts/eval.sh <plugin> [eval options]}"; shift
dir="$root/plugins/$plugin"
[ -f "$dir/.claude-plugin/plugin.json" ] || { echo "no plugin at $dir" >&2; exit 2; }
deps=$(node -e 'const m=require(process.argv[1]); for (const d of m.dependencies ?? []) console.log(typeof d === "string" ? d.split("@")[0] : d.name)' "$dir/.claude-plugin/plugin.json")
rm -rf "$dir/.eval-deps"; mkdir -p "$dir/.eval-deps"
for d in "$plugin" $deps; do
  rsync -a --exclude evals --exclude .eval-deps "$root/plugins/$d/" "$dir/.eval-deps/$d/"
done
claude_bin="${CLAUDE_BIN:-claude}"
"$claude_bin" plugin eval "$dir" --trust-plugin "$@"
