#!/usr/bin/env bash
# The package invariants, runnable.   tools/check-skill.sh
#
# These are the checks README.md ("Body portability", "The frontmatter contract",
# "upstream/") and CLAUDE.md ("Checks to run after any edit to the skill") spell
# out as shell one-liners. This script is the single executable copy; the prose
# explains WHY each check exists, this file is WHAT runs. Exit 0 = all pass.
#
#   1. portability      no host-specific syntax in the shared skill body
#   2. rule fields      every rule carries every required field (counts agree)
#   3. version          SKILL.md's corpus_version mirror equals rules.md's declaration
#   4. upstream         upstream/.generated-from was generated from the current corpus
#   5. citations        every DC- id cited inside the package resolves to a rule heading
#   6. label list       the not-label-storable list is thirteen items in both files and identical
#   7. inputs coverage  every rule's Inputs line names the image metadata label iff it must
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_DIR="$ROOT/.claude/skills/devcontainers"
SKILL="$SKILL_DIR/SKILL.md"
RULES="$SKILL_DIR/references/rules.md"
SPEC_FACTS="$SKILL_DIR/references/spec-facts.md"
LABEL_LIST_SIZE=13   # spec-facts.md §4 argues the number; this pins it
UPSTREAM_MARKER="$ROOT/upstream/.generated-from"
RULE_FIELDS=(Severity Tier Source Quote Verified Inputs Detect Fix)

status=0
ok()   { printf 'OK    %s\n' "$*"; }
fail() { printf 'FAIL  %s\n' "$*"; status=1; }

# rules.md documents its own rule template inside a fenced block. Without this
# strip every count silently reads one too high. Load-bearing; do not remove.
outside_fences() { awk '/^```/{f=!f; next} !f' "$1"; }

# --- 1. portability ----------------------------------------------------------
# grep exits 1 for "no match" (pass), 0 for "matched" (real finding), and 2 for
# a read failure (e.g. an input file missing or unreadable) — the last of
# those is not "no match" and must not print OK.
grep -nE '^\s*!`|```!|\$ARGUMENTS|\$\{CLAUDE_' "$SKILL" "$SKILL_DIR"/references/*.md
case $? in
  1) ok "portability" ;;
  0) fail "portability: host-specific syntax above" ;;
  *) fail "portability: could not read $SKILL or $SKILL_DIR/references/*.md" ;;
esac

# --- 2. rule-field counting --------------------------------------------------
# Per-rule, not per-total: a total-vs-total comparison passes when one rule's
# Severity is deleted and another rule's Severity is duplicated, since both
# totals still equal the rule count. Walk rule blocks and require each of the
# eight fields exactly once per block.
awk_out=$(outside_fences "$RULES" | awk -v fields="${RULE_FIELDS[*]}" '
  BEGIN { n = split(fields, want, " ") }
  function flush(   i, f) {
    if (rule_id == "") return
    rule_count++
    for (i = 1; i <= n; i++) {
      f = want[i]
      if (cnt[f] != 1) printf "BAD %s %s %d\n", rule_id, f, cnt[f]
    }
  }
  /^### DC-/ {
    flush()
    rule_id = $0
    sub(/^### /, "", rule_id)
    sub(/ ·.*/, "", rule_id)
    for (i = 1; i <= n; i++) cnt[want[i]] = 0
    next
  }
  {
    for (i = 1; i <= n; i++) {
      f = want[i]
      if ($0 ~ "^- \\*\\*" f ":\\*\\*") cnt[f]++
    }
  }
  END {
    flush()
    print "COUNT " rule_count
  }
')
rule_count=$(printf '%s\n' "$awk_out" | sed -n 's/^COUNT //p')
bad_lines=$(printf '%s\n' "$awk_out" | grep '^BAD ' || true)
if [ -z "$bad_lines" ]; then
  ok "rule fields: $rule_count rules, each carries all eight"
else
  while read -r _ rid field n; do
    [ -z "$rid" ] && continue
    if [ "$n" -eq 0 ]; then
      fail "rule fields: $rid is missing $field"
    else
      fail "rule fields: $rid carries $field $n times, expected 1"
    fi
  done <<<"$bad_lines"
fi

# --- 3. version agreement ----------------------------------------------------
skill_version=$(sed -n 's/^[[:space:]]*corpus_version:[[:space:]]*"\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' "$SKILL")
rules_version=$(sed -n 's/^corpus_version:[[:space:]]*//p' "$RULES")
if [ -n "$rules_version" ] && [ "$skill_version" = "$rules_version" ]; then
  ok "version: corpus $rules_version"
else
  fail "version: SKILL.md=$skill_version rules.md=$rules_version"
fi

# --- 4. upstream projection currency -----------------------------------------
upstream_version=$(sed -n 's/^corpus_version:[[:space:]]*//p' "$UPSTREAM_MARKER")
if [ -n "$upstream_version" ] && [ "$upstream_version" = "$rules_version" ]; then
  ok "upstream: projection generated from $upstream_version"
else
  fail "upstream: generated from $upstream_version, corpus is $rules_version — regenerate upstream/"
fi

# --- 5. citation integrity ---------------------------------------------------
# Rule IDs are a published interface: any DC- id the shipped package cites must
# be a heading in rules.md. Placeholder ids in the template (DC-XXX-NNN) are skipped.
defined=$(grep -oE '^### DC-[A-Z]+-[0-9]+' "$RULES" | sed 's/^### //' | sort -u)
cited=$(grep -rhoE 'DC-[A-Z]+-[0-9]+' "$SKILL_DIR" "$ROOT/upstream" | sort -u)
dangling=$(comm -13 <(printf '%s\n' "$defined") <(printf '%s\n' "$cited"))
if [ -z "$dangling" ]; then
  ok "citations: every cited id is defined"
else
  fail "citations: cited but not defined in rules.md: $(echo "$dangling" | tr '\n' ' ')"
fi

# --- 6. label-list agreement -------------------------------------------------
# The not-label-storable list is deliberately duplicated: AUDIT reads it from
# SKILL.md and never loads spec-facts.md. Both copies are prose lists ending in
# a period. Extract, sort, compare.
skill_list=$(sed -n '/Not label-storable:/,/`\.$/p' "$SKILL" | sed 's/.*Not label-storable://' | grep -oE '`[^`]+`' | sort)
facts_list=$(sed -n '/^`name`, `initializeCommand`/,/`\.$/p' "$SPEC_FACTS" | grep -oE '`[^`]+`' | sort)
skill_n=$(printf '%s\n' "$skill_list" | grep -c .)
if [ "$skill_n" -ne "$LABEL_LIST_SIZE" ]; then
  fail "label list: SKILL.md copy has $skill_n items, expected $LABEL_LIST_SIZE"
elif [ "$skill_list" != "$facts_list" ]; then
  fail "label list: SKILL.md and spec-facts.md copies differ: $(comm -3 <(printf '%s\n' "$skill_list") <(printf '%s\n' "$facts_list") | tr -s '\t\n' ' ')"
else
  ok "label list: $skill_n items, both copies agree"
fi

# --- 7. Inputs coverage ------------------------------------------------------
# tools/check-inputs.mjs asserts that every rule carries an `Inputs` line and
# that the line names the image metadata label IFF the rule reads a property
# SKILL.md's not-label-storable list does not attest. It parses that list and
# the rule set out of the package at run time — nothing is copied into it — so
# it is kept as its own file and invoked here, which keeps this script the
# single entry point. Its Detect-vs-Inputs comparison is advisory and prints
# `warning` without failing.
if inputs_out=$(cd "$ROOT" && node tools/check-inputs.mjs 2>&1); then
  ok "inputs coverage: $(printf '%s\n' "$inputs_out" | tail -1)"
  # Advisory Detect-vs-Inputs lines are continuation lines under their rule in
  # the checker's own output; re-attach the rule id so they stand alone here.
  printf '%s\n' "$inputs_out" | awk '/^DC-/ { r = $1 } /warning/ { sub(/^ +/, ""); print "      " r "  " $0 }'
else
  fail "inputs coverage: tools/check-inputs.mjs exited non-zero"
  printf '%s\n' "$inputs_out"
fi

exit "$status"
