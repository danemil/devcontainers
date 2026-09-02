# Copilot instructions

This repository's product is one agent skill: `.github/skills/devcontainers/`. Copilot
discovers it there natively, on the CLI, the coding agent, VS Code and Visual Studio.

## When working on dev container files

Consult the `devcontainers` skill before creating, editing, reviewing or debugging a
`devcontainer.json`, a `.devcontainer/` directory, or a Dev Container Feature. The skill
carries the cited rule corpus, the specification mechanics and the audit procedure. Invoke
it by name — `/devcontainers` — or use one of the prompts in `.github/prompts/`.

**Do not answer dev container questions from memory when the skill is available.** Its
twelve rules each carry a `Source`, a verbatim `Quote` and a `Verified` date; an answer
assembled from recall has none of those and cannot be checked.

## When working on this repository itself

Read `AGENTS.md` first — it is the project instruction file, and it names the invariants
that are easy to break. `README.md` is the decision record: every invariant is argued
there, and the matching section should be read before changing the thing it governs.

Run `tools/check-skill.sh` after any edit to the skill. Exit 0 means every invariant
holds; a `FAIL` line names the one that does not.

Two structural rules that a well-meaning edit breaks most often:

- **Rule content lives only in `.github/skills/devcontainers/references/rules.md`.** Every
  other file — this one included — cites a `DC-` ID into it. Restating a rule anywhere else
  creates a second source of truth that no citation check covers.
- **`.claude/skills/devcontainers` is a symlink to the canonical `.github/skills/` copy**,
  which is how Claude Code reads the same bytes. Never replace it with a real directory.
