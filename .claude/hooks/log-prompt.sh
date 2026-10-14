#!/usr/bin/env bash
# Dopisuje każdy prompt wysłany do Claude Code do docs/ai-log.md
# (regulamin §4 ust. 4 wymaga opisu użycia AI w dokumentacji).
set -euo pipefail
dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
log="$dir/docs/ai-log.md"
prompt="$(jq -r '.prompt // empty')"
[ -z "$prompt" ] && exit 0
who="$(git -C "$dir" config user.name 2>/dev/null || whoami)"
{
  printf '\n### %s · %s\n\n' "$(date '+%Y-%m-%d %H:%M')" "$who"
  printf '%s\n' "$prompt" | sed 's/^/> /'
  printf '\n'
} >> "$log"
