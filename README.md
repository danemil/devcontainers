# devcontainers — a portable agent skill for dev container configuration

A single skill, `devcontainers`, that a coding agent loads when it is asked to create,
review or debug a `devcontainer.json`. It carries a twelve-rule cited corpus, the
specification mechanics behind those rules, and an audit procedure that refuses to let
"not checked" read as "passed".

It is written to be read by **Claude Code and GitHub Copilot from the same file**, with no
generator, no build step and no per-host fork. The whole shipped product is one directory:

```
.claude/skills/devcontainers/
├── SKILL.md                     # modes, refusals, audit procedure, symptom lists
└── references/
    ├── rules.md                 # the twelve rules — the only place rule content lives
    └── spec-facts.md            # lifecycle, prebuilds, merge rules, substitutions, CLI
```

plus `.github/instructions/devcontainers.instructions.md`, a contentless pointer whose
mechanism is **unproven** — see below.

**Status: Phase 1 ships.** That is a decision record, not a mood: it is what Gate E's
measured lift and zero harm cases entitle us to say, at corpus version `0.2.0`. Everything
below distinguishes what was measured from what was assumed. Where a thing is unproven,
this file says so.

---

## Install

### The supported channel

```sh
npx skills add danemil/devcontainers
```

Gate A measured all three packaged installers against a probe skill with the same shape as
this one. **`npx skills add` is the only one that installs a subdirectory tree from a repo
ref with full fidelity**, and it is therefore the supported channel rather than a footnote.

| Installer | subdirectories (`references/`) | executable bit | frontmatter |
| --- | --- | --- | --- |
| `npx skills add <owner>/<repo>` | PASS | PASS | PASS — byte-identical |
| `gh skill install <owner>/<repo> <skill>` | PASS | **FAIL** — 755 → 644 | **FAIL** — injects a nested `metadata:` block and reorders keys |
| `copilot skill add` | **FAIL** — no repo-ref form exists; the file form silently drops `references/` | n/a | PASS (file form) |

Load-bearing detail, because the failures are quiet ones:

- **`gh skill install` rewrites the file it installs.** It injects its own nested
  `metadata:` block (`github-path`, `github-ref`, `github-repo`, `github-tree-sha`) into
  the installed `SKILL.md`. Consequences: any strict frontmatter gate must validate the
  **source** file, never an installed copy; and after installing this way you need
  `chmod +x` on anything that is meant to be executable. **We do not claim our own
  `metadata:` block survives it** — the probe skill had no `metadata:` key, so whether
  `gh` merges into or clobbers an existing one was never observed. Read `corpus_version`
  from the source file.
- **`copilot skill add` has no `owner/repo` form at all.** It accepts a local file, a local
  directory, or an HTTPS URL to a single `SKILL.md`. Its **directory** form is a
  non-copying pointer written into `~/.copilot/settings.json` → `skillDirectories`; its
  **file** form copies `SKILL.md` only and **silently drops `references/`**. (The HTTPS-URL
  form was not run; its single-file scope is read from `--help`, not observed.)
- One observation, recorded because it undercuts a "one install serves both hosts" story:
  `npx skills add ... -a claude-code` printed an install-summary line claiming a copy to
  `~/.agents/skills/`, and never created it. The file landed only in `~/.claude/skills/`.

### Copilot

If you check the skill into the repository you are working in, **nothing needs installing**:
`copilot skill --help` documents `.claude/skills/` as a native Project discovery source, and
Gate B observed the Copilot CLI listing, selecting and resolving `references/` from there
with no `--allow-tool` flag.

To use it **outside** that workspace, the only Copilot path that delivers the corpus is two
steps:

```sh
git clone https://github.com/danemil/devcontainers
copilot skill add ./devcontainers/.claude/skills/devcontainers   # directory form — a pointer, not a copy
```

Do **not** use `copilot skill add <path>/SKILL.md`. The file form copies that one file and
leaves `references/rules.md` behind, which on this package means the agent keeps the audit
procedure and loses every rule it is supposed to apply.

**Why this matters more than an install-mechanics footnote.** Gate E found the package's
lift is almost entirely on the Copilot surface — on `claude -p` the base model plus a shell
already scores 8/10, and three control runs built real containers and ran the real
`devcontainer` CLI to check themselves. A channel that drops `references/` drops the corpus
on the highest-value surface.

### Manual

Copy `.claude/skills/devcontainers/` into your repository (project scope, recommended — both
hosts read it, and the level-3 `references/` files resolve because they sit in the
workspace) or into `~/.claude/skills/` (personal scope). Gate B's PASS was measured for a
**project-scoped skill inside the CLI's working directory**; the probe cannot distinguish
skill-relative resolution from ordinary working-directory file reading, so it does not
transfer to a personally installed copy sitting outside the workspace.

---

## The frontmatter contract

Five keys are portable across both hosts. **We ship four:**

```yaml
name: devcontainers
description: Use when creating, editing, reviewing, validating or debugging a devcontainer.json…
license: MIT
metadata:
  corpus_version: "0.2.0"
  spec_verified: "2026-08-31"
```

`allowed-tools` is the fifth. It is omitted because **the key is portable and its value
grammar is not**: Claude Code writes `Bash(node:*)`, Copilot writes `shell(...)`. A single
file cannot carry both, and a value one host cannot parse is worse than an absent key —
the skill's own refusals already gate every tool invocation behind a `command -v` probe.

This is a shipping decision about four of five keys. **It is not a claim that four keys are
the only legal set** — that would be false. Gate A's addendum probed the point directly: a
skill carrying an author-written `metadata:` block was listed, selected, fired and returned
its marker with zero warnings on either stream, behaviourally identical to a control without
one.

The supported claim is exactly what was observed: *accepted by Copilot CLI 1.0.82, project
scope, `.claude/skills/`.* Untested: `.github/skills/`, VS Code Copilot Chat, Copilot code
review, and the Skills API path — which is the strictest validator and the one never probed.
Re-test before relying on this if the Skills API becomes a target.

---

## Tiers and the citation invariant

Every rule carries a tier, and the tier is printed on **every** finding line so a reader who
quotes one line still carries the distinction:

```
DC-XXX-NNN  [TIER]  SEVERITY  <file>:<line>  <what was found>
```

`SPEC` requires **both** axes:

1. **Provenance** — stated in the Dev Container specification, the reference CLI, or
   official vendor documentation; not inferred by this package.
2. **Applicability** — applies to any dev container, rather than being conditional on a tool
   the specification does not mention.

`OPINION` means at least one axis fails. `DC-CLAUDE-001` is the second kind: every
mechanical claim in it is stated in Anthropic's own documentation, yet nothing in the
specification requires any of it. So `OPINION` does not mean "unsourced" — check which axis
failed before reading it that way.

**The citation invariant.** Every rule carries `Source` (a URL), `Quote` (verbatim, under
300 characters), and `Verified` (a date). A claim with no quote that supports it is not a
rule. The corpus passed an adversarial citation pass on 2026-09-01: 12/12 quotes verbatim,
12/12 under 300 characters, and each quote re-tested for whether it *supports* the assertion
rather than merely sitting near it. Two dead `Source` URLs were found and corrected in that
pass — which is the argument for the harness below, not against the invariant.

**IDs are a published interface.** They are never reused. A retired rule keeps its ID and
gains `superseded_by`. A rule a project does not want is suppressed with
`prompt_include: false`, never deleted.

### Severities are provisional

Gate D never ran, so **no rule's severity has been calibrated against real-world
configurations.** `DC-LIFE-001` ships at ERROR while its own `Detect` concedes the point:
the rule "only bites a project that actually uses prebuilds… A project that never prebuilds
is not wrong to put installs in `postCreateCommand`." Treat the severity column as the
author's ordering, not as a measured one, until Gate D produces a false-positive rate.

---

## Body portability, and the two greps that enforce it

Nothing in `SKILL.md` or `references/` may use host-specific syntax: no inline
`` !`command` `` execution, no ```` ```! ```` execution fences, no `$ARGUMENTS`, no
`${CLAUDE_*}` variables. Both hosts must read the same bytes.

```sh
# 1. Portability — must print nothing.
grep -nE '^\s*!`|```!|\$ARGUMENTS|\$\{CLAUDE_' \
  .claude/skills/devcontainers/SKILL.md \
  .claude/skills/devcontainers/references/*.md \
  && echo "FAIL: host-specific syntax" || echo "OK"
```

```sh
# 2. Rule-field counting — every field must print 12.
R=.claude/skills/devcontainers/references/rules.md
awk '/^```/{f=!f; next} !f' "$R" | grep -c '^### DC-'
for fld in Severity Tier Source Quote Verified Detect Fix; do
  printf '%-9s %s\n' "$fld" \
    "$(awk '/^```/{f=!f; next} !f' "$R" | grep -c "^- \*\*$fld:\*\*")"
done
```

**The `awk` fence-strip in the second grep is load-bearing and must not be dropped.**
`rules.md` documents its own rule format inside a fenced code block, and that template is
indented two spaces *on purpose*. Un-indent it — a perfectly reasonable-looking tidy-up —
and every count silently becomes 13 while the check still prints a plausible number. The
naive `grep -c '^- \*\*Severity:\*\*' rules.md` returns 12 today and is a trap: it is
correct only by the accident of that indentation. Stripping fenced blocks first makes the
check independent of it.

The portability grep is deliberately **not** fence-stripped: the syntax it hunts for lives
inside fences, which is exactly where it would hide.

```sh
# 3. Version agreement — the two files must not drift.
S=.claude/skills/devcontainers/SKILL.md
SV=$(sed -n 's/^[[:space:]]*corpus_version:[[:space:]]*"\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' "$S")
RV=$(sed -n 's/^corpus_version:[[:space:]]*//p' "$R")
[ "$SV" = "$RV" ] && echo "OK $SV" || echo "FAIL: SKILL=$SV rules=$RV"
```

`rules.md` is the authoritative version; the frontmatter copy exists so an installed skill
can be identified without opening a reference file. Nothing but this check keeps them in
step.

---

## The verification harness this package specifies

This is the piece that would have caught both of this project's worst defects, and it has
two halves — the second of which nobody had.

**Why two halves, stated plainly: every check built for this corpus verified that it was
TRUE; nothing verified that it was SAFE TO FOLLOW. A corpus is a set of instructions as
well as a set of statements.** Gate E caught a rule that flagged its own prescribed remedy
as a violation, on a corpus where every quote verified and every checker passed.

### Half one — TRUE

- Every `Quote` field, and every double-quoted span of 40+ characters inside `Detect` and
  `Fix`, machine-checked verbatim against `docs/sources/` and against a live fetch of its
  `Source` URL. Whitespace-normalised; straight and curly apostrophe variants both tried.
- Every `Source` URL resolved, with its status code recorded. Two of twelve had been dead
  since 2023 and were found only because a human opened them.
- **Prose claims *about* the rules enumerated by script, not asserted.** This is the half
  that was missing the first time. One clause in `rules.md` drifted three separate times
  because every *quote* was machine-checked while a *paragraph about* the rules was
  ordinary prose and sat outside every checker. If a sentence says "all twelve", "each
  rule", or "every `Detect`", a script must be able to evaluate it.

### Half two — SAFE TO FOLLOW

- **A twelve-row bucket fixture whose expected buckets are parsed out of `SKILL.md`'s own
  worked tally**, not hand-copied into a test file. Run the AUDIT procedure against the
  fixture config, parse the emitted tally, and assert it reconciles to twelve with each rule
  in the bucket the worked example places it in.
- **`label-safe` derived from the parsed twelve-item not-label-storable list** under
  "My changes aren't taking effect" in `SKILL.md` — read at runtime, not duplicated. That
  turns a prose fence into an executed constraint: it fails if anyone moves the list, which
  is precisely the edit `SKILL.md`'s own editing note forbids, because AUDIT's bucket table
  depends on that list and AUDIT does not load `spec-facts.md`.
- **The T02-shaped secret fixtures, run against any changed `Detect`.** `${localEnv:TOKEN}`
  in `remoteEnv` must **not** be flagged — it is the exact form `DC-SEC-001`'s own `Fix`
  prescribes — while a literal secret must be, including a low-entropy one such as
  `hunter2`. Round 1 of Gate E emitted `DC-SEC-001 [SPEC] ERROR` against the remedy itself.
- **`SKILL.md` frontmatter `corpus_version` asserted equal to `rules.md`'s value** (grep 3
  above). They can drift and nothing else catches it.

Any `Detect` edit re-runs half two. A `Detect` change that alters what the corpus emits for
an unchanged configuration is a **minor** version bump even when the edit looks tiny —
`0.1.0` → `0.2.0` was exactly that.

---

## Cross-host verification prompts

Six hand-run prompts, three per host. They are the only thing that proves the skill still
*fires* after a vendor changes discovery — description matching is not a contract, and no
citation checker can detect a skill that is never selected. They replace an eval harness at
this version and cost nothing to run.

```sh
# Claude Code
claude -p 'Review .devcontainer/devcontainer.json for problems'
claude -p 'Why does my command work in the terminal but not in postCreateCommand?'
claude -p 'Set up a Node 22 dev container for this repo'

# Copilot CLI
copilot -p 'Review .devcontainer/devcontainer.json for problems' -s
copilot -p 'Why does my command work in the terminal but not in postCreateCommand?' -s
copilot -p 'Set up a Node 22 dev container for this repo' -s
```

Run them against a scratch repository holding a deliberately flawed `devcontainer.json` —
a dependency install in `postCreateCommand`, a `TOKEN` in `remoteEnv`, an unpinned Feature,
`waitFor: postAttachCommand`. Record, per prompt and per host: did the skill fire, did the
right mode engage, were rule IDs cited with tier tags, did `DC-ENV-001` come up on the
`userEnvProbe` question, and was any refusal violated.

**Results live in `docs/VERIFICATION.md`** — the recorded baseline, not this file.

---

## Gate results, as decision records

Full detail in `docs/gates/GATE-RESULTS.md` and the per-gate files beside it. Each line
claims only what was observed.

| Gate | Question | Result | What it decided |
| --- | --- | --- | --- |
| **A** | installer fidelity | MIXED | `npx skills add` is the supported channel; a strict frontmatter gate validates the source file, never an installed copy |
| **B** | can Copilot resolve `references/` from `.claude/skills/`? | **PASS** (Copilot CLI + Claude Code control) | `references/` depth is affordable — the twelve rules stay out of the `SKILL.md` body |
| **C** | can Copilot code review shell out? | selection reaches, **execution FAILS** | on that surface the skill is prose-only |
| **D** | false-positive and recall rate on real configs | **deferred behind Gate E**; search phase done, corpus empty | severities are uncalibrated; Phase 2 is not unblocked |
| **E** | blinded usefulness — firing, lift, harm | **PASS at corpus 0.2.0** | Phase 1 ships |

**Gate B — what rides with the PASS.** VS Code Copilot Chat is NOT RUN on both discovery and
resolution. The probe cannot distinguish skill-relative resolution from reading a file under
the working directory, so it says nothing about a personally installed copy. And Gate A
observed that `copilot skill add`'s only copying form never copies `references/` at all, so
on a Copilot-installed personal copy the level-3 files are not on disk to resolve. Safe
everywhere is not what was shown.

**Gate C — Copilot code review selects but cannot execute.** A `SKILL.md` under
`.github/skills/` reached the reviewer from outside the diff, under an arbitrary name, and
its directives were followed. The execution marker never appeared; what Copilot emitted was
the skill's own documented "I cannot run commands" fallback string — an observed FAIL of the
marker, not an observation of a command being attempted. So: **on Copilot code review the
skill is prose-only, and a missing provenance header there is by design, not a failure.**
Diff-line findings would have to come from a SARIF upload, which is Phase 2. Two limits ride
with this: whether the load is agent-skill selection or ordinary repo-context reading is
**unresolved**, and everything was observed from `.github/skills/`, never from
`.claude/skills/`, which is where this package ships. One observation for execution, one
repo, one account, review effort self-reported as "Lite" — it shows the plain unassisted path
does not execute; it does not prove no configuration ever could.

**Gate D — deferred, and its corpus is empty.** The search phase completed: **4,176 hits,
4,165 unique blobs across 4,064 unique repos**, sharded by `size:` because the GitHub code
search API caps at 1,000 results per query — sharding, not `--paginate`, is what a corpus
larger than that needs. The blobs were never fetched. **There is therefore no
false-positive rate and no recall figure for any rule.** Separately, the planned harness
measures a fourth heuristic, `DC-FEAT-PIN`, which has **no corresponding rule** among the
twelve; its FP rate gates a possible Phase 2 check and can never demote a rule.

**Gate E — passed at 0.2.0, after a fix.** Round 1 (`0.1.0`, 44 runs) met the lift bar and
**failed the harm bar**: on `claude -p` one task went from correct to wrong, because the
skill flagged `${localEnv:GITHUB_TOKEN}` — the exact form `DC-SEC-001`'s own `Fix`
prescribes. Systematically, 4 of 16 emitted finding lines (25%) were false positives, all
from two rules. Two `Detect` fields were narrowed and the gate re-run (20 runs, corpus
`0.2.0`):

| | Round 1 (0.1.0) | Round 2 (0.2.0) |
| --- | --- | --- |
| harm cases | 1 | **0** |
| false positives among finding lines | 4 of 16 (25%) | **0 of 9** |
| true positives lost to the narrowing | n/a | **none — measured, not inferred** |
| firing rate | 10/10 claude, 8/10 copilot | **10/10 on both surfaces** |

Two findings the lift number does not capture, and they shape how this package should be
read. **Zero confidently wrong answers in the WITH arm; three in the WITHOUT arm** — a
confident wrong answer is worse than a miss. And **the lift concentrates where the agent
cannot execute**: on `claude -p` the base model plus a shell already scores 8/10, and the
skill's only win there is a GitHub-side fact no amount of shelling out reaches.

Carried caveats: every per-task cell is n=1, control variance is real and moved in both
directions between rounds, and **VS Code agent mode is unmeasured in both rounds.**

---

## The `.github/instructions/` pointer is untested

`.github/instructions/devcontainers.instructions.md` exists for one reason: VS Code has
silent, path-scoped inline-edit surfaces where no chat message describes the task, so
description-based skill matching never fires. The file carries no guidance, which is why it
cannot drift. Adding a rule to it is a review-blocking change.

**Its mechanism is unproven and this file does not claim otherwise.**

- **Documented:** `applyTo` routes an instructions file into context for matching paths.
- **Not documented, and not measured:** that an instructions file saying "consult the X
  skill" actually causes the skill to be invoked.
- The evaluation was folded into Gate E. That arm needs VS Code's silent inline-edit
  surface, there is no GUI automation in this project, and it was **NOT RUN** in either
  round. The file ships on a documented-mechanism argument alone.

The rule attached to it — **delete it if it changes nothing**, because an inert artifact
with a maintenance rule attached is worse than no artifact — **cannot be applied yet.**

**To settle it, a human must run this:** open the workspace in VS Code with Copilot; pick
two of the Gate E tasks (`docs/gates/usefulness/tasks.md`); perform each as a *silent inline
edit* on an open `devcontainer.json` — no chat message describing the task — once with
`.github/instructions/devcontainers.instructions.md` present and once with it deleted;
record for each run whether the skill engaged, judged by whether the output cites a `DC-`
rule ID with a tier tag. If the pointer changes nothing across both tasks, delete the file
and this section with it.

---

## Flip-triggers: when to stop hand-maintaining and adopt a generator

Adopt [`rulesync`](https://github.com/dyoshikawa/rulesync) — which already generates Claude
Code and Copilot artifacts from one source — at **either** of:

- **≥ 4 target hosts**, or
- **≥ 4 host-divergent files**.

Today there is **one shared skill and one contentless pointer.** A generator would add a
build step, a source-of-truth layout and a second thing to debug, in exchange for
maintaining a fan-out of two. It is unjustified, and this is the number that changes that.

---

## Maintenance: quarterly

Re-run the Gate E task set **unaided** each quarter. A rule the base model now handles
reliably on its own is **suppressed from the prose prompt (`prompt_include: false`), never
deleted from the corpus** — a deleted ID would silently un-suppress if the ID were ever
re-issued, which is exactly why IDs are never re-issued.

**Re-running the citation checkers is not sufficient maintenance.** They verify the corpus
is still TRUE. Gate E is the only instrument that tests the executing half — whether the
corpus is still SAFE TO FOLLOW, and whether it is still worth loading at all now that the
base models have moved. **The usefulness evaluation should travel with any version bump**,
not only with the quarterly calendar. A `Detect` narrowed to kill a false positive is
exactly the edit most likely to lose a true positive, and only a re-run can tell you whether
it did.

---

## What this deliberately does not do

Stated so nobody is surprised by an absence:

- **No Dev Container Template authoring guidance.** No rule covers writing or publishing
  one. The skill says so and points at the `devcontainer templates` subcommands and
  <https://containers.dev/implementors/templates/>.
- **No Feature authoring guidance beyond a pointer.** For a Feature author the official
  harness is the answer, not a hand-written checklist: `devcontainer features test
  --project-folder .` generates a container per Feature, runs `scenarios.json`, and has a
  duplicate-install mode. Three rules (`DC-FEAT-001/002/003`) cover consuming and writing
  Features; the test loop is delegated.
- **No compose-specific semantic rules.** `dockerComposeFile`, `service` and `runServices`
  appear in the mechanics and in the not-label-storable list, but no rule reasons about
  multi-service topologies.
- **No migration mode.** The skill will not rewrite a working config to match a style
  preference, and there is no "modernise this for me" path.
- **No executable checker, and no JSON Schema validation.** `devcontainer.json` validation
  today is editor-only via SchemaStore; the devcontainer CLI ships none. The skill refuses
  to claim conformance it did not run. A SARIF-producing checker is Phase 2 and is gated on
  Gate D, which has not run.
- **No tool installation, ever.** Every supporting tool (`devcontainer`, `hadolint`,
  `trivy`, `dockle`, `docker scout`, `decolint`) is probed with `command -v` and reported as
  absent if absent. Note that `docker scout` is a Docker CLI plugin, so it must be probed as
  a **subcommand** — `command -v docker-scout` returns a false negative on a machine where
  `docker scout version` exits 0.

---

## Also in this repository

- `docs/RESEARCH-BRIEF.md` — the dated, adversarially fact-checked research the design rests
  on, with an `ERRATA` section at the end correcting it rather than rewriting it in place.
- `docs/sources/` — 26 cached primary sources, so the citation pass can run offline for the
  nine rules that do not need a live fetch.
- `docs/gates/` — the empirical gate results, including the harvest log and rate-limit
  accounting for the Gate D search phase that did complete.
- `tools/wf-preflight.mjs` — unrelated to the skill; validates a Claude Code Workflow script
  before invocation, catching the failure mode where a markdown backtick inside a
  backtick-delimited prompt silently closes the template literal and the parser blames the
  next word.
- Shared project instructions kept in sync across hosts under host-specific filenames
  (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `QODER.md`, `.cursorrules`, `.windsurfrules`,
  `.kiro/steering/`), and MCP wiring for `code-review-graph`. These predate the skill and
  are workspace configuration, not part of the shipped package. The MCP configs hardcode an
  absolute `cwd`; update it if you clone this elsewhere.

---

## Licence

MIT — see [`LICENSE`](LICENSE). Copyright (c) 2026 Emil Dan.

The prior art this package critiques ships an MIT licence with no copyright holder, which
makes the grant hard to rely on. Naming a holder is the cheapest possible fix and there is
no reason to repeat the omission.
