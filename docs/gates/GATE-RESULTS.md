# Phase 0 gate results

Each gate is answered EMPIRICALLY. "Documented as" is not an answer; "I ran it and observed" is.
**Record verbatim command output, not a summary of it.**

Detail files: `gate-a.md`, `gate-b.md`, `gate-c.md`, `gate-c-selection.md` (Gate C's SELECTION
follow-up probe). This file is the index and the decision record.

## Gate A — installer fidelity
STATUS: RUN 2026-09-01 — MIXED. Detail: `gate-a.md`.

| Installer | subdirs | exec bit | frontmatter untouched |
|---|---|---|---|
| `npx skills add <owner>/<repo>` | PASS | PASS | PASS (byte-identical) |
| `gh skill install <owner>/<repo> <skill>` | PASS | **FAIL** (755 -> 644) | **FAIL** (injects `metadata:`) |
| `copilot skill add` | **FAIL** (file form drops `references/` and `bin/`; no repo-ref form exists) | n/a | PASS (file form) |

Observed, load-bearing:
- The brief's guessed command names were wrong for two of three. `copilot skill add` accepts only a
  local file, a local directory, or an HTTPS URL to a single `SKILL.md` — there is **no
  `owner/repo` form at all**. Its directory form is a non-copying pointer written into
  `~/.copilot/settings.json` -> `skillDirectories`; its file form copies `SKILL.md` only and
  **silently drops `references/` and `bin/`**.
- `gh skill install` injects a nested `metadata:` block into the installed `SKILL.md`
  (`github-path`, `github-ref`, `github-repo`, `github-tree-sha`) and reorders keys.
- `npx skills add ... -a claude-code` **printed an install-summary line claiming a copy to
  `~/.agents/skills/probe-devc`, and never created it** — the file landed only in
  `~/.claude/skills/`. Load-bearing because Gate B's quoted discovery list makes
  `~/.agents/skills/` a *Copilot personal skills source*: an installer that reports writing there
  and does not is exactly what breaks a "one install serves both hosts" story. One observation.
- Two of `copilot skill add`'s three documented source forms were run. The HTTPS-URL-to-a-single-
  `SKILL.md` form was **not run**; its single-file scope is taken from `--help`, not observed.

CONSEQUENCE. `npx skills add` is the only faithful repo-ref channel and is the reference
implementation for any Phase 2 `bin/`. A strict "frontmatter is exactly these four keys" CI gate
**must run against the source file, not an installed copy** — `gh skill install` would fail it every
time. Phase 2's `bin/` is not installable-and-runnable through any advertised channel without an
extra step: clean on `npx skills add`, needs a documented `chmod +x` after `gh skill install`, and
is unreachable via `copilot skill add`, which cannot fetch a repo. If Phase 2 happens, publish to
npm with a `bin` entry and make `npx <pkg> audit` the primary path.

### Gate A addendum — does Copilot accept an AUTHOR-WRITTEN `metadata:` block?
STATUS: RUN 2026-09-01 — **ACCEPTED on Copilot CLI 1.0.82, project scope** (see RESIDUAL below).

Gate A as specified did not settle the Global Constraint it was supposed to settle. It observed
`gh` *injecting* a `metadata:` block, which is a different question from whether Copilot *accepts*
one the author wrote. A separate two-skill probe (`meta-canary` with the project's intended
four-key frontmatter vs. `plain-canary` without) closed it: `meta-canary` was listed by
`copilot skill list`, selected, fired, and returned its marker with **zero warnings on stdout or
stderr**, behaviourally identical to the control.

RESIDUAL. Observed on **Copilot CLI 1.0.82 only, for a project-scoped skill in `.claude/skills/`**.
Untested: `.github/skills/`, VS Code Copilot Chat, Copilot code review, and **the Skills API path,
where the plan states any key outside the portable set is a hard error** — i.e. the strictest
validator is the one never probed. Supported claim: *"accepted by Copilot CLI 1.0.82 in project
scope, with no warning on any stream"*, not *"accepted by Copilot"*.

CONSEQUENCE. **The shipped frontmatter stays four keys** — `name`, `description`, `license`,
`metadata` — on the evidence above, which is Copilot CLI project scope only. The fallback of
moving `corpus_version` into the body and dropping to three keys is NOT triggered. Re-test before
relying on this if the Skills API path becomes a shipping target.

OPEN QUESTION for Task 12 (not blocking Phase 1): our `SKILL.md` ships its own `metadata:` block
holding `corpus_version`. `gh skill install` writes its own `metadata:` block. Whether it MERGES
into or CLOBBERS an existing one was not tested — the Gate A probe skill had no `metadata:` key.
If Phase 2's checker header must match `corpus_version` from an installed copy, test this first.

## Gate B — Copilot resolves references/ from .claude/skills/
STATUS: RUN 2026-09-01 — **PASS** on Copilot CLI and on the Claude Code control. Detail: `gate-b.md`.

| Surface | discovery | resolution |
|---|---|---|
| Copilot CLI (1.0.81, carried from an earlier probe — **not re-measured** in this run) | PASS | PASS |
| Claude Code (control) | PASS | PASS |
| VS Code Copilot Chat agent mode | NOT RUN | NOT RUN |

Observed: `copilot skill --help` documents `.claude/skills/` as a native **Project** discovery
source. `copilot skill list` listed the probe skill. 4/4 prompt phrasings fired it and returned the
canary marker verbatim — including two phrasings that did not use the description's exact trigger
phrase. **No `--allow-tool` or `--allow-all-tools` flag was needed**; `-p '...' -s` alone sufficed.
(The *reason* — that reading a file in the working directory is auto-approved under the CLI's
default manual permission mode — is **documentation, read from `copilot help config`, not observed
cause.** What was observed is that no flag was required.) Step 3's `chat.agentSkillsLocations`
escape hatch was not needed and has no Copilot CLI equivalent (checked `copilot help config` and
`copilot help environment`).

CONSEQUENCE. Level-3 progressive disclosure works from `.claude/skills/` **for a project-scoped
skill sitting in the CLI's working directory**. **The twelve rules stay in `references/rules.md`.**
The FAIL fallback — rules into the SKILL.md body, ~380-line budget, `spec-facts.md` demoted to a
URL list — is NOT triggered.

RESIDUAL 1. The VS Code GUI arm is unverified by direct observation and is recorded as NOT RUN, not
inferred. A human should run it: open the workspace, Copilot Chat in Agent mode, type
`run the reference canary`, and record whether `PELICAN-7731` or `CANARY UNREACHABLE` comes back.

RESIDUAL 2. **The probe cannot distinguish skill-relative resolution from ordinary
working-directory file reading.** The skill lived inside the CLI's CWD, so an agent that just read
a path under its own CWD yields an identical PASS. For the project's design (skill checked into the
repo) the two are operationally the same and the PASS is usable. For an **installed** copy
(`~/.claude/skills`, `~/.copilot/skills` — what Gate A's installers produce) the reference file is
outside the workspace and neither the resolution nor the no-flag result carries over — and Gate A
observed that `copilot skill add`'s copying form never lands `references/` at all.

RESIDUAL 3. This is a Copilot **CLI** result. It does not transfer to Copilot **code review**,
which was only ever probed from `.github/skills/` (Gates C and C-selection). Whether code review
reads `.claude/skills/` is untested anywhere in this batch.

## Gate C — Copilot code review can shell out
STATUS: RUN 2026-09-01 — **SELECTION PASS (channel residual), EXECUTION FAIL**.
Detail: `gate-c.md` and `gate-c-selection.md` (SELECTION follow-up probe, 3 PRs, 2 skills, 1
negative control).

Observed on a fresh private throwaway repo, review posted **64 seconds** after the request:
- SELECTION PASS. The review body contained the literal string `EXEC UNAVAILABLE`, which exists
  nowhere in the setup except inside the probe skill's own fallback instruction. The PR diff
  touched only `exec-canary.txt` and the review reported "Files reviewed: 1/1 changed files", so
  **the SKILL.md's content reached the reviewer from outside the diff and shaped its output.**
- EXECUTION FAIL. The marker `EXEC-OK-4412` never appeared. Copilot emitted the skill's own
  documented "I cannot run commands" fallback string instead. **That string is the SKILL.md
  author's prose, not observed execution** — what was observed is a string appearing, not a
  command being attempted and failing. Do not write "Copilot code review attempted execution and
  failed." It is an observed FAIL of the marker, not an absence of data.

SELECTION follow-up (`gate-c-selection.md`), which settles the task review's Critical 1:
- **An arbitrarily-named skill is loaded and obeyed.** `quokka-audit`, committed as repo state and
  never part of any PR diff, had its instruction followed and its marker `MARKER-QUOKKA-8801`
  emitted. Loading is **not** pinned to a skill named `code-review` at the footer's path. That
  alternative — the one that would have voided the SELECTION reading — is refuted.
- **Negative control: the reviewer does not echo diff content.** `CONTROL-NO-SKILL-8803` was
  literally inside a file in a reviewed diff and did **not** appear in that review. So markers that
  do appear are not incidental regurgitation. This runs *in favour of* the original SELECTION
  claim.
- **The footer is conditional, not decoration.** The "Add a `code-review` agent skill" link
  appeared on one review and was absent on two others in the same repo. `gate-c.md`'s original
  dismissal of it as "a generic UI affordance shown on every review" is empirically wrong and has
  been rewritten. Two readings survive and cannot be separated: (a) the link is suppressed once
  `.github/skills/code-review/SKILL.md` exists — more parsimonious, since it is a pre-filled
  file-*creation* link for exactly that path; or (b) the link signals no skill was loaded. Under
  (b), Gate C's own footer would read as "no skill loaded" and SELECTION would be back in doubt.
  (b) cannot be excluded.
- **Not established** (one observation, confounded): whether the `code-review` name is privileged
  when several skills are present.

RESIDUAL — CHANNEL. Whether the load is description-matched agent-skill selection or ordinary
out-of-diff repo-context reading is **unresolved**; the follow-up's two skills carried identical
generic descriptions and cannot discriminate. Also unresolved: whether the reviewer reads the PR
head branch or the default-branch tip. Safe carried-forward wording: *a `SKILL.md` under
`.github/skills/` reaches Copilot code review from outside the diff, under an arbitrary name, and
its directives are followed.*

RESIDUAL — DIRECTORY, and this one matters to what we ship. Gate C and its follow-up both ran
**entirely from `.github/skills/`**. The project ships its skill to `.claude/skills/`. **Whether
Copilot code review reads `.claude/skills/` is UNTESTED.** Gate B's `.claude/skills/` PASS is on
the Copilot **CLI**, a different surface. Do not carry it across.

CONSEQUENCE. Copilot code review cannot execute -> diff-line findings come only from the Phase 2
SARIF upload, not from the skill. The skill on that surface is prose-only, and the provenance
header will be absent there by design — document this so a missing header on code review is not
read as a failure.

CAVEAT ON GENERALITY. One observation for execution (plus three more PRs for selection), one small
repo, one account, review effort self-reported as "Lite" throughout, no MCP servers configured. It
shows the plain unassisted `.github/skills/` path does not execute; it does not prove no
configuration ever could.

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
  **Lift 1-2 => the problem is selection, not rules. Rewrite the description. Do not add rules.**
  Lift 0 => stop and fall back to twelve facts in AGENTS.md. Record that as the finding.
Phase 2 (executable checker) proceeds only if Gate E passed AND Gate D flagship-heuristic
  false positives on working public configs are <= 10% with usable recall.
Record all numbers here, including the corpus size and how it was obtained.

Settled by Gates A-C, carried forward — each bullet claims only what was observed:
- **Frontmatter ships FOUR keys** (`name`, `description`, `license`, `metadata`), and a strict
  "exactly these keys" CI gate must **validate the SOURCE file, never an installed copy** — `gh
  skill install` injects its own `metadata:` block and would fail such a gate every time (Gate A,
  observed diff). The acceptance half rests on **Copilot CLI 1.0.82, project scope,
  `.claude/skills/` only** (Gate A addendum); `.github/skills/`, VS Code, code review and the
  Skills API path — where the plan says an out-of-set key is a hard error — are untested.
- **`references/` depth is affordable for a project-scoped skill checked into the repo**, on
  Copilot CLI and on Claude Code (Gate B). Rules stay out of the SKILL.md body. Three limits ride
  with this: VS Code Copilot Chat is **NOT RUN** on both discovery and resolution; the probe cannot
  distinguish skill-relative resolution from reading a file under the CWD, so it says nothing about
  a **personally installed** copy; and Gate A observed that `copilot skill add`'s only copying form
  **never copies `references/` at all**, so on a Copilot-installed personal copy the level-3 files
  are not on disk to resolve. Safe everywhere is not what was shown.
- **Phase 2 must not assume execution inside Copilot code review** (Gate C, observed: the marker
  never appeared). As tested, the unassisted `.github/skills/` path does not execute; **treat
  SARIF-via-Actions as the only route we have evidence for** — not as the only route that could
  exist, which is exactly what Gate C's own CAVEAT ON GENERALITY disclaims (MCP servers untested,
  review effort "Lite", one repo, one account).
- **The code-review surface does load an arbitrarily-named skill from `.github/skills/`**
  (`gate-c-selection.md`, observed: an out-of-diff `quokka-audit` SKILL.md's instruction obeyed;
  plus a negative control showing the reviewer does not echo diff content). Two things ride with
  it: whether that is skill *selection* or repo-context reading is unresolved, and **everything was
  observed from `.github/skills/`, never from `.claude/skills/` — which is where this project ships
  its skill.** Do not assume code review sees a `.claude/skills/` skill.

## CLEANUP — COMPLETE
All throwaway probe repos have been deleted. The `gh` token originally lacked the `delete_repo`
scope; the repository owner granted it, and the controller then deleted
`danemil/probe-skill-gatea` (Gate A), `danemil/probe-exec-gatec` (Gate C) and
`danemil/probe-select-gatec` (Gate C selection follow-up). No repository matching "probe" remains
on the account. All local probe working trees were removed by their own tasks. **Nothing is
outstanding.**
