# Phase 0 gate results

Each gate is answered EMPIRICALLY. "Documented as" is not an answer; "I ran it and observed" is.

Detail files: `gate-a.md`, `gate-b.md`, `gate-c.md`. This file is the index and the decision record.

## Gate A — installer fidelity
STATUS: RUN 2026-09-01 — MIXED. Detail: `gate-a.md`.

| Installer | subdirs | exec bit | frontmatter untouched |
|---|---|---|---|
| `npx skills add <owner>/<repo>` | PASS | PASS | PASS (byte-identical) |
| `gh skill install <owner>/<repo> <skill>` | PASS | **FAIL** (755 -> 644) | **FAIL** (injects `metadata:`) |
| `copilot skill add` | **no repo-ref form exists** | n/a | PASS (file form) |

Observed, load-bearing:
- The brief's guessed command names were wrong for two of three. `copilot skill add` accepts only a
  local file, a local directory, or an HTTPS URL to a single `SKILL.md` — there is **no
  `owner/repo` form at all**. Its directory form is a non-copying pointer written into
  `~/.copilot/settings.json` -> `skillDirectories`; its file form copies `SKILL.md` only and
  **silently drops `references/` and `bin/`**.
- `gh skill install` injects a nested `metadata:` block into the installed `SKILL.md`
  (`github-path`, `github-ref`, `github-repo`, `github-tree-sha`) and reorders keys.

CONSEQUENCE. `npx skills add` is the only faithful repo-ref channel and is the reference
implementation for any Phase 2 `bin/`. A strict "frontmatter is exactly these four keys" CI gate
**must run against the source file, not an installed copy** — `gh skill install` would fail it every
time. Phase 2's `bin/` is not installable-and-runnable through any advertised channel without an
extra step: clean on `npx skills add`, needs a documented `chmod +x` after `gh skill install`, and
is unreachable via `copilot skill add`, which cannot fetch a repo. If Phase 2 happens, publish to
npm with a `bin` entry and make `npx <pkg> audit` the primary path.

### Gate A addendum — does Copilot accept an AUTHOR-WRITTEN `metadata:` block?
STATUS: RUN 2026-09-01 — **ACCEPTED**.

Gate A as specified did not settle the Global Constraint it was supposed to settle. It observed
`gh` *injecting* a `metadata:` block, which is a different question from whether Copilot *accepts*
one the author wrote. A separate two-skill probe (`meta-canary` with the project's intended
four-key frontmatter vs. `plain-canary` without) closed it: `meta-canary` was listed by
`copilot skill list`, selected, fired, and returned its marker with **zero warnings on stdout or
stderr**, behaviourally identical to the control.

CONSEQUENCE. **The shipped frontmatter stays four keys** — `name`, `description`, `license`,
`metadata`. The fallback of moving `corpus_version` into the body and dropping to three keys is
NOT triggered.

OPEN QUESTION for Task 12 (not blocking Phase 1): our `SKILL.md` ships its own `metadata:` block
holding `corpus_version`. `gh skill install` writes its own `metadata:` block. Whether it MERGES
into or CLOBBERS an existing one was not tested — the Gate A probe skill had no `metadata:` key.
If Phase 2's checker header must match `corpus_version` from an installed copy, test this first.

## Gate B — Copilot resolves references/ from .claude/skills/
STATUS: RUN 2026-09-01 — **PASS** on Copilot CLI and on the Claude Code control. Detail: `gate-b.md`.

| Surface | discovery | resolution |
|---|---|---|
| Copilot CLI 1.0.81 | PASS | PASS |
| Claude Code (control) | PASS | PASS |
| VS Code Copilot Chat agent mode | NOT RUN | NOT RUN |

Observed: `copilot skill --help` documents `.claude/skills/` as a native **Project** discovery
source. `copilot skill list` listed the probe skill. 4/4 prompt phrasings fired it and returned the
canary marker verbatim — including two phrasings that did not use the description's exact trigger
phrase. **No `--allow-tool` or `--allow-all-tools` flag was needed**; `-p '...' -s` alone sufficed,
because reading a file in the working directory is auto-approved under the CLI's default manual
permission mode. Step 3's `chat.agentSkillsLocations` escape hatch was not needed and has no
Copilot CLI equivalent (checked `copilot help config` and `copilot help environment`).

CONSEQUENCE. Level-3 progressive disclosure works from `.claude/skills/`. **The twelve rules stay
in `references/rules.md`.** The FAIL fallback — rules into the SKILL.md body, ~380-line budget,
`spec-facts.md` demoted to a URL list — is NOT triggered.

RESIDUAL. The VS Code GUI arm is unverified by direct observation and is recorded as NOT RUN, not
inferred. A human should run it: open the workspace, Copilot Chat in Agent mode, type
`run the reference canary`, and record whether `PELICAN-7731` or `CANARY UNREACHABLE` comes back.

## Gate C — Copilot code review can shell out
STATUS: RUN 2026-09-01 — **SELECTION PASS, EXECUTION FAIL**. Detail: `gate-c.md`.

Observed on a fresh private throwaway repo, review posted **64 seconds** after the request:
- SELECTION PASS. The review body contained the literal string `EXEC UNAVAILABLE`, which exists
  nowhere in the setup except inside the probe skill's own fallback instruction. Copilot code
  review found, read, and followed `.github/skills/probe-exec/SKILL.md`.
- EXECUTION FAIL. The marker `EXEC-OK-4412` never appeared. Copilot took the skill's documented
  "I cannot run commands" branch. This is an observed FAIL, not an absence of data.

CONSEQUENCE. Copilot code review cannot execute -> diff-line findings come only from the Phase 2
SARIF upload, not from the skill. The skill on that surface is prose-only, and the provenance
header will be absent there by design — document this so a missing header on code review is not
read as a failure.

CAVEAT ON GENERALITY. One observation, one small repo, review effort self-reported as "Lite", no
MCP servers configured. It proves the plain unassisted `.github/skills/` path does not execute; it
does not prove no configuration ever could.

MECHANICAL NOTE for future automation: `gh pr view --json reviewRequests` and REST
`pulls/{n}/requested_reviewers` both return empty for a requested Copilot reviewer. The request
**did** land — check `issues/{n}/timeline` for `event=review_requested` with
`requested_reviewer.login == "Copilot"`. Reading the empty list as "request rejected" is a
false negative waiting to happen.

## Gate D — false-positive AND recall rate on real configs
STATUS: not run

Feasibility confirmed by the controller: `gh api search/code` works with the current token
(`total_count` 194,816 for `filename:devcontainer.json path:.devcontainer`), so the plan's primary
harvest path is available and the clone-the-org fallback is not needed. Note the code-search API
caps at 1,000 results per query — a corpus larger than that needs query sharding, not `--paginate`.

Note: the harness measures a fourth heuristic, `DC-FEAT-PIN`, which has **no corresponding rule**
in Task 6's twelve. Its FP rate therefore cannot demote a rule; it gates a possible Phase 2 check
only. Record it as such rather than silently mapping it onto DC-FEAT-001/002/003.

## Gate E — blinded usefulness (firing rate, lift, harm) — runs after the draft skill exists
STATUS: not run

## DECISIONS
Phase 1 SHIPS only if Gate E shows lift on >= 3 of 10 tasks with zero harm cases.
  Lift 0 => stop and fall back to twelve facts in AGENTS.md. Record that as the finding.
Phase 2 (executable checker) proceeds only if Gate E passed AND Gate D flagship-heuristic
  false positives on working public configs are <= 10% with usable recall.
Record all numbers here, including the corpus size and how it was obtained.

Settled by Gates A-C, carried forward:
- Frontmatter ships FOUR keys (Gate A addendum). Validate the SOURCE file, never an installed copy.
- `references/` depth is affordable (Gate B). Rules stay out of the SKILL.md body.
- Phase 2 must not assume execution inside Copilot code review (Gate C). SARIF-via-Actions is the
  only route to execution-backed diff-line findings.

## OUTSTANDING CLEANUP (needs the repository owner)
Two private throwaway probe repos could not be deleted — the `gh` token lacks the `delete_repo`
scope, and granting it needs an interactive browser device-flow approval no agent should push
through unsupervised. Both are private and contain only inert marker strings.

    gh auth refresh -h github.com -s delete_repo
    gh repo delete danemil/probe-skill-gatea --yes
    gh repo delete danemil/probe-exec-gatec --yes
