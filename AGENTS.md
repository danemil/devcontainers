# AGENTS.md

Project instructions for GitHub Copilot and Claude Code. `CLAUDE.md` is a symlink to this file;
edit only this one. Copilot reads `AGENTS.md` directly, on every surface that supports agent
instructions.

## What this repository is

A single portable agent skill, `.github/skills/devcontainers/`, that GitHub Copilot and Claude
Code read **from the same bytes**. No build step, no generator, no tests in the usual sense:
the product is three markdown files, and correctness is enforced by greps, hand-run prompts and
an evaluation gate. `README.md` is the decision record — every claim below is argued there; read
the matching section before changing the thing it governs.

```
.github/skills/devcontainers/        # canonical — Copilot's own project-skill location
├── SKILL.md                  # three modes (AUDIT / AUTHOR / DEBUG), refusals, audit procedure
└── references/
    ├── rules.md              # the twelve cited rules — the ONLY place rule content lives
    └── spec-facts.md         # mechanics; loaded in AUTHOR and DEBUG, NOT in AUDIT

.claude/skills/devcontainers -> ../../.github/skills/devcontainers   # symlink, for Claude Code
```

**The symlink is the whole portability mechanism, and its direction is deliberate.** Copilot
discovers project skills in `.github/skills/`, `.claude/skills/` or `.agents/skills/`; Claude
Code discovers them only in `.claude/skills/`. Canonical therefore lives at the Copilot-native
path, and Claude Code reaches the identical bytes through the link. Never turn the link into a
second real copy — that is the "same bytes" invariant, and nothing checks it for you.

Everything else is workspace configuration or evidence: `docs/` (research brief, cached primary
sources, gate results, `plans/RESUME.md` handoff), `upstream/` (an awesome-copilot payload).

## Checks to run after any edit to the skill

From the repo root: `tools/check-skill.sh`. Exit 0 means every invariant holds; a `FAIL` line
names the one that does not. It runs seven checks — portability (no host-specific syntax in the
shared body), rule-field counting (every rule carries every field, fence-stripped), version
agreement (`SKILL.md` frontmatter mirrors `rules.md`), upstream currency (`upstream/` was
generated from the current corpus), citation integrity (every `DC-` id the package cites is a
heading in `rules.md`), label-list agreement (the not-label-storable list is thirteen items
in both files that carry it) and Inputs coverage (`node tools/check-inputs.mjs`: every rule
carries an `Inputs` line, and that line names the image metadata label **iff** it reads a
property `SKILL.md`'s not-label-storable list does not attest). `README.md` argues checks 1-3
under "Body portability, and the two greps that enforce it" and check 4 under "The verification
harness this package specifies"; check 5's invariant is argued under "Tiers and the citation
invariant" and check 6's under "The verification harness this package specifies" again, in the
`label-safe` bullet; check 7 is argued in both places — the runnable form under "Body
portability", the reason it exists in the `Inputs` bullet beside `label-safe`. The script is
the only executable copy, and `.github/workflows/checks.yml` runs it with the tool tests on
every push. The checker reads the canonical `.github/skills/` path; it never reads through the
`.claude/` symlink, so a symlink replaced by a stale copy would not be caught by it.

The `awk` fence-strip inside the rule-field check is load-bearing: `rules.md` documents its own
rule template inside a fenced block, and without the strip every count silently reads 13.

**Firing check** (does the skill still get selected?): the six `claude -p` / `copilot -p`
prompts under "Cross-host verification prompts" in `README.md`, run against a scratch repo with a
deliberately flawed `devcontainer.json`. Baseline in `docs/VERIFICATION.md`, pinned to commit
`8d1f9c6`; re-run before citing it as current.

**Gate E** (does the skill change answers, and is it safe to follow?): `docs/gates/usefulness/`
carries the twelve tasks and every round of results. Any run must disable network-reachable
tooling in **both** arms and must say how — the repo is public, so a control that can search the
web reaches this repo's own research. Do not reach for `--disable-builtin-mcps` /
`--strict-mcp-config`: round 4 measured them and **they blocked egress on neither surface** —
Copilot's own `web_search` / `web_fetch` survived and one run reached upstream documentation, and
the one block on `claude` came from an unrelated local hook. A future run needs an egress block it
actually controls; `README.md` carries the measurement.

## Invariants that are easy to break

- **Never mechanically re-flow `SKILL.md`.** It runs over the 500-line guideline on purpose, and
  the overage grows with the file — `wc -l` it rather than trusting a number written anywhere.
  A reflow has silently dropped an item from an inline enumeration four times. Resolve budget
  pressure by moving content into a reference the mode *already loads*, or by accepting the
  overage.
- **The not-label-storable list in `SKILL.md`** (under "My changes aren't taking effect") **is
  not movable.** AUDIT's bucket table reads it and AUDIT does not load `spec-facts.md`.
- **Rules live only in `rules.md`.** Every other file cites a `DC-` ID into it. Restating a rule
  anywhere in the package creates a second source of truth no citation pass covers. The one
  sanctioned exception is `upstream/`, because that file leaves the repo; it has no checker, so
  regenerate it from `rules.md` and bump `upstream/.generated-from` whenever the corpus changes.
- **`.github/instructions/devcontainers.instructions.md` stays contentless.** It is a pointer
  whose mechanism is unproven; adding a rule, default, severity or example to it is a
  review-blocking change. The same rule binds `.github/prompts/*.prompt.md` and
  `.github/copilot-instructions.md`: they route to the skill and carry no rule content.
- **Two versions, not one.** `metadata.version` in `SKILL.md` is the package; `corpus_version`
  (authoritative in `rules.md`, mirrored in the frontmatter) is the rule corpus, and it bumps
  independently. A `Detect` edit that changes what the corpus emits for an unchanged config is a
  **minor** corpus bump, however small it looks, and re-runs Gate E's "safe to follow" fixtures.
- **Frontmatter is four top-level keys**: `name`, `description`, `license`, `metadata`. Author,
  email and versions go *inside* `metadata`. `allowed-tools` is deliberately omitted because its
  value grammar differs per host. Of the four, Copilot documents `name`, `description` and
  `license`; `metadata` is a Claude Code extension that Copilot ignores. Keep `name` lowercase
  and matching the directory — Copilot requires that, and requires the file be named `SKILL.md`.
- **Rule IDs are a published interface.** Never reuse one; a retired rule keeps its ID and gains
  `superseded_by`. Every finding line prints the tier: `DC-XXX-NNN [SPEC|OPINION] SEVERITY …`.
- **Every rule needs `Source` (URL), `Quote` (verbatim, under 300 chars) and `Verified` (date).**
  A claim with no supporting quote is not a rule. Label-immunity of a property is read off a
  positive marker in the spec's JSON reference, never inferred from absence.
- **Do not write a count into prose that neither a check nor its own list verifies.** "Twelve"
  appears in the README only because check 2 prints it.
- **Severities are provisional.** Gate D (false-positive calibration on real configs) has not
  run; `docs/gates/fp-measure.mjs` and the `.harvest/` scripts are its deferred harness.
- **The skill never installs tooling.** Supporting tools are probed with `command -v` and
  reported absent if absent. `docker scout` is a Docker CLI plugin, so probe it as a subcommand.

## Workspace configuration

- `AGENTS.md` is the single source of project instructions and `CLAUDE.md` is a symlink to it.
  On Windows, clone with `core.symlinks=true` or `CLAUDE.md` and `.claude/skills/devcontainers`
  check out as one-line text files — which for the skill link means Claude Code silently sees
  no skill at all.
- `.github/copilot-instructions.md` and `.github/prompts/*.prompt.md` are Copilot-native
  surfaces that route to the skill. Like `.github/instructions/`, they stay contentless of rules.
- `docs/sources/devcontainer.md` is gitignored on purpose: a cached third-party docs page kept
  for offline citation checks but not redistributed. `DC-CLAUDE-001` cites the live URL.
