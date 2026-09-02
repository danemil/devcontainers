# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A single portable agent skill, `.claude/skills/devcontainers/`, that Claude Code and GitHub
Copilot read **from the same bytes**. No build step, no generator, no tests in the usual sense:
the product is three markdown files, and correctness is enforced by greps, hand-run prompts and
an evaluation gate. `README.md` is the decision record — every claim below is argued there; read
the matching section before changing the thing it governs.

```
.claude/skills/devcontainers/
├── SKILL.md                  # three modes (AUDIT / AUTHOR / DEBUG), refusals, audit procedure
└── references/
    ├── rules.md              # the twelve cited rules — the ONLY place rule content lives
    └── spec-facts.md         # mechanics; loaded in AUTHOR and DEBUG, NOT in AUDIT
```

Everything else is workspace configuration or evidence: `docs/` (research brief, cached primary
sources, gate results, `plans/RESUME.md` handoff), `upstream/` (an unsubmitted awesome-copilot
payload), `tools/wf-preflight.mjs` (unrelated to the skill — see below).

## Checks to run after any edit to the skill

From the repo root. Every check below currently passes; a failure is the signal, not the
numbers.

```sh
# 1. Portability — must print OK. Both hosts read the same file, so no host-specific syntax.
grep -nE '^\s*!`|```!|\$ARGUMENTS|\$\{CLAUDE_' \
  .claude/skills/devcontainers/SKILL.md .claude/skills/devcontainers/references/*.md \
  && echo "FAIL: host-specific syntax" || echo "OK"

# 2. Rule-field counting — the header and every field must print the same number (12 today).
R=.claude/skills/devcontainers/references/rules.md
awk '/^```/{f=!f; next} !f' "$R" | grep -c '^### DC-'
for fld in Severity Tier Source Quote Verified Inputs Detect Fix; do
  printf '%-9s %s\n' "$fld" "$(awk '/^```/{f=!f; next} !f' "$R" | grep -c "^- \*\*$fld:\*\*")"
done

# 3. Version agreement — SKILL.md frontmatter copy must equal rules.md's declaration.
S=.claude/skills/devcontainers/SKILL.md
SV=$(sed -n 's/^[[:space:]]*corpus_version:[[:space:]]*"\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' "$S")
RV=$(sed -n 's/^corpus_version:[[:space:]]*//p' "$R")
[ "$SV" = "$RV" ] && echo "OK $SV" || echo "FAIL: SKILL=$SV rules=$RV"

# 4. Upstream projection currency — the two lines must match, else upstream/ is stale.
grep '^corpus_version:' upstream/.generated-from "$R"

# 5. Inputs coverage — exits 0 when every rule passes. Parses the not-label-storable list out
#    of SKILL.md at runtime and asserts each rule's Inputs line names the image metadata label
#    iff it reads a property that list does not attest. `warning` lines are advisory.
node tools/check-inputs.mjs
```

The `awk` fence-strip in check 2 is load-bearing: `rules.md` documents its own rule template
inside a fenced block, and without the strip every count silently reads 13.

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

- **Never mechanically re-flow `SKILL.md`.** It is 502 lines against a 500-line guideline on
  purpose. A reflow has silently dropped an item from an inline enumeration four times. Resolve
  budget pressure by moving content into a reference the mode *already loads*, or by accepting
  the overage.
- **The not-label-storable list in `SKILL.md`** (under "My changes aren't taking effect") **is
  not movable.** AUDIT's bucket table reads it and AUDIT does not load `spec-facts.md`.
- **Rules live only in `rules.md`.** Every other file cites a `DC-` ID into it. Restating a rule
  anywhere in the package creates a second source of truth no citation pass covers. The one
  sanctioned exception is `upstream/`, because that file leaves the repo; it has no checker, so
  regenerate it from `rules.md` and bump `upstream/.generated-from` whenever the corpus changes.
- **`.github/instructions/devcontainers.instructions.md` stays contentless.** It is a pointer
  whose mechanism is unproven; adding a rule, default, severity or example to it is a
  review-blocking change.
- **Two versions, not one.** `metadata.version` in `SKILL.md` is the package; `corpus_version`
  (authoritative in `rules.md`, mirrored in the frontmatter) is the rule corpus, and it bumps
  independently. A `Detect` edit that changes what the corpus emits for an unchanged config is a
  **minor** corpus bump, however small it looks, and re-runs Gate E's "safe to follow" fixtures.
- **Frontmatter is four top-level keys**: `name`, `description`, `license`, `metadata`. Author,
  email and versions go *inside* `metadata`. `allowed-tools` is deliberately omitted because its
  value grammar differs per host.
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

- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `QODER.md`, `.windsurfrules` and `.kiro/steering/` are
  meant to be kept identical across hosts. Editing one means syncing the others.
- `.mcp.json`, `.vscode/mcp.json`, `.kiro/settings/mcp.json`, `.qoder/mcp.json` and
  `.claude/settings.json` hardcode an absolute `cwd` for `code-review-graph`; update it if the
  repo is cloned elsewhere. The graph is near-empty here (markdown is not indexed), so the
  section below is of limited use in this repo.
- `docs/sources/devcontainer.md` is gitignored on purpose: a cached third-party docs page kept
  for offline citation checks but not redistributed. `DC-CLAUDE-001` cites the live URL.
- `tools/wf-preflight.mjs` validates a Claude Code Workflow script before invocation:
  `node tools/wf-preflight.mjs <script.js>`. It catches a markdown backtick inside a
  template-literal prompt closing the string early; the fix is prose in double-quoted lines.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
