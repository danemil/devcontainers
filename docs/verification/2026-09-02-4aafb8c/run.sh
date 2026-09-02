#!/bin/bash
# $1 = run id, $2 = host (claude|copilot), $3 = prompt
R=/tmp/verify-4aafb8c; D=$R/runs/$1
rm -rf "$D"; mkdir -p "$D"
cp -R "$R/fixture/." "$D/"
mkdir -p "$D/.github/skills" "$D/.claude/skills"
cp -R "$R/skill" "$D/.github/skills/devcontainers"
ln -s ../../.github/skills/devcontainers "$D/.claude/skills/devcontainers"
cd "$D" || exit 1
git init -q && git add -A && git commit -qm init
if [ "$2" = "claude" ]; then
  claude -p "$3" > "$R/out/$1.stdout" 2> "$R/out/$1.stderr"
else
  copilot -p "$3" -s --allow-all-tools > "$R/out/$1.stdout" 2> "$R/out/$1.stderr"
fi
echo "exit=$? id=$1"
