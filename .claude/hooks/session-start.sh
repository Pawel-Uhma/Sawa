#!/usr/bin/env bash
# Na starcie sesji podaje agentowi: kim jest jego człowiek (git user.name → docs/zespol.md),
# jego kartę roli i otwarte zadania z docs/todo.md. Wynik trafia do kontekstu agenta.
set -uo pipefail
dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
who="$(git -C "$dir" config user.name 2>/dev/null || whoami)"
team="$dir/docs/zespol.md"
todo="$dir/docs/todo.md"

echo "## Mózg zespołu: kontekst startowy"
echo "Start od: docs/README.md, potem docs/stan.md i docs/todo.md."
echo "git user.name: $who"

# Wiersz osoby: kolumna 3 tabeli „Osoby” to git user.name, kolumna 4 to kod roli
role="$(awk -F'|' -v w="$who" '/^\|/ { g=$3; gsub(/^ +| +$/, "", g); if (g == w) { r=$4; gsub(/^ +| +$/, "", r); print r; exit } }' "$team" 2>/dev/null)"

if [[ "$role" =~ ^R[1-5]$ ]]; then
  card="$(ls "$dir"/docs/role/"$role"-*.md 2>/dev/null | head -1)"
  echo "Twoja rola: $role. Karta: ${card#"$dir"/}"
  [ -n "$card" ] && sed -n '1,40p' "$card"
  echo ""
  echo "Otwarte zadania Twojej roli (z docs/todo.md):"
  grep -E "^- \[[ ~]\].*\b$role\b" "$todo" 2>/dev/null || echo "(brak)"
else
  echo "Nie rozpoznano roli: git user.name „${who}” nie ma wiersza z rolą w docs/zespol.md."
  echo "Zapytaj użytkownika, jaka jest jego rola (R1–R5), i zaproponuj dopisanie go do docs/zespol.md."
fi
