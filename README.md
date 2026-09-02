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

**Status: Phase 1 ships, and the package has been evaluated as it actually ships.** That is a
decision record, not a mood: Gate E was re-run in full against the current corpus — 48 runs,
lift met, **harm 0** — and rounds 1 and 2 had both run with `references/spec-facts.md` absent,
so this is the first evaluation of the shipped article rather than of a degraded one. The
authoritative corpus version is the one `references/rules.md` declares; this file is not a
third source of truth for it. Everything below distinguishes what was measured from what was
assumed. Where a thing is unproven, this file says so — and two things still are: Copilot's
selection rate is the gate's weakest number, and one design assumption was measured and
**failed**. Both are stated under Gate E rather than left to a reader to notice.

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

**What is established, and what is not.** Gate A measured `npx skills add` against a scratch
probe repository, and the files here are now publicly fetchable — `SKILL.md`,
`references/rules.md` and `README.md` all return 200 unauthenticated. **A first real install of
this repository has not been run.** Doing so is a separate act with a real side effect — it
writes into the runner's global skills directory — so nothing here should be read as an
end-to-end test. The channel was measured; this repository's reachability was measured; the
composition of the two has not been.

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

Five keys are portable across both hosts — **five per the plan's design constraint, not per
anything a gate measured.** Gate A measured *acceptance* of the four we ship; it never
enumerated the portable set. **We ship four:**

```yaml
name: devcontainers
description: Use when creating, editing, reviewing, validating or debugging a devcontainer.json…
license: MIT
metadata:
  version: "<the package version, as SKILL.md declares>"
  corpus_version: "<whatever references/rules.md declares>"
  spec_verified: "2026-08-31"
  author: Emil Dan
  email: emil.dan@publicissapient.com
```

Neither version is written out here, and **they are not the same thing.** `version` tracks the
package as a whole; `corpus_version` tracks the twelve-rule corpus in `references/rules.md`,
which has bumped independently of the package and is currently ahead of it — one is not a typo
for the other. `SKILL.md` declares the package version; `rules.md` remains authoritative for
the corpus version, and the frontmatter copy of it exists so an installed skill can be
identified without opening a reference file. The third grep below is the only thing that keeps
that pair in step — a README that also stated the number would be a third copy to forget.

**`author` and `email` sit inside `metadata`, not at the top level, and that placement is the
whole point.** A top-level `author:` or `email:` would be a key outside the portable set, which
is a hard error on the Skills API path. `metadata` is an open object, so attribution and the
package version cost no top-level keys: the shipped count is still the four above.

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

## The line budget, and why this file is never re-flowed

`SKILL.md` is **502 lines against a 500-line budget**, and the overage is deliberate. The 500
is Claude Code's *documented guidance*, not a host limit enforced by either host — nothing is
broken at 502, and both hosts discover and list the skill at that length. The two lines are the
three `metadata` sub-keys carrying attribution and the package version. Trading something the
author asked for against a cosmetic budget is the wrong direction, so the budget gives.

**No safe reflow reaches 499**, and this was measured rather than assumed. Of the 37 paragraphs
in the file that could ever save a line by re-wrapping, **31 are excluded** — they contain an
indent, a list, a quoted phrase, a multi-backtick enumeration, a multi-bold enumeration, or an
`X, Y and Z` series. Safe savings at wraps 105, 110 and 115 is **zero**. Closing a two-line gap
would take wrap 140 against a file wrapped at about 98, re-flowing six paragraphs at a second
visible width — which is a restyling of the file, not a cosmetic tidy, and not worth two lines.

**Why the guard exists, which is the useful half.** A mechanical reflow of this file has
silently damaged it four times, always the same way: a short enumeration inside flowing prose
loses an item across a wrap and leaves behind a perfectly grammatical sentence. This round the
proposed fix would have split `**installed but not run**` across a newline — the state this
file's own text calls *"the state most easily misread as a pass"*. Grammatical after the break,
invisible to a reader, and it takes a checker parsing that enumeration from three to two. The
banned green-phrase list — the summary lines refusal 3 forbids over an unchecked area — has been
damaged this way more than once, including a wrap that split one phrase and took its check from
one to zero.

**The standing rule: this file is not to be mechanically re-flowed.** Not by a script, not at a
wider width, not "just this once" for a line or two. Future line-budget pressure is resolved one
of two ways — move content into a reference file the mode **already loads**, or accept the
overage and record it here. Never by a reflow.

Moving content into a reference a mode does **not** load is a correctness change wearing a
budget change's clothes. The not-label-storable list under "My changes aren't taking effect"
is fenced **non-movable** for exactly that reason: AUDIT's bucket table reads it, and AUDIT
does not load `spec-facts.md`. `SKILL.md`'s own editing note says the same thing at
the point of temptation.

One thing worth stating plainly, because it is the first time in this project that a recorded
lesson **prevented** a defect instead of explaining one afterwards: the guard was written from
four past failures, and applying it invalidated the premise of the very proposal it was
guarding. The three lines a reflow was supposed to recover were all inside guarded paragraphs —
including the exact paragraph damaged four times before. The moved number is the bug, and the
moved number was the proposal's own: three to zero.

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

**The executable copy of every check in this section is `tools/check-skill.sh`**; run it from
the repo root. The shell below is the argument for each check, kept here so the reasoning
travels with the decision record, and CI (`.github/workflows/checks.yml`) runs the script.

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

**This grep is also what licenses the word "twelve" everywhere else in this file.** A count
written into prose is a liability exactly when nothing checks it — that is how a list here
silently went from twelve items to thirteen. The rule count is the one number this README
states repeatedly, and it is stated only because the check above prints it: if a rule is added
or retired, grep 2 stops printing 12 before anyone reaches the prose. Every other count in this
file is either a measurement of something that already happened, or an inline enumeration that
carries its own members. **Do not add a count that neither a check nor its own list can
verify.**

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

- **A bucket fixture whose expected buckets are parsed out of `SKILL.md`'s own worked
  tally**, not hand-copied into a test file. Run the AUDIT procedure against the fixture
  config, parse the emitted tally, and assert it reconciles to the rule count with each rule
  in the bucket the worked example places it in. **Derive the count by counting the rules; do
  not write it into the fixture.** A hard-coded total is the drift hazard this project has
  been bitten by repeatedly — `SKILL.md` has had hard-coded counts removed from its own prose
  for exactly this reason.
- **`label-safe` derived from the parsed not-label-storable list** under "My changes aren't
  taking effect" in `SKILL.md` — read at runtime, never duplicated and never counted into a
  literal. That turns a prose fence into an executed constraint: it fails if anyone moves the
  list, which is precisely the edit `SKILL.md`'s own editing note forbids, because AUDIT's
  bucket table depends on that list and AUDIT does not load `spec-facts.md`.
  **Derive it as positive attestation, not as a complement.** The list is not "everything the
  can-carry list omits". Each entry has an untagged row in the spec's JSON reference, whose
  legend states per property whether it is recorded in the image label — so the source has
  **three** states, not two: tagged, untagged row, and *no row at all*. **Silence is not
  immunity.** A property with no row is one the source does not speak to, and the audit must
  read the merged configuration rather than infer.
  **The list is complete against `[json-ref]`, not merely open** — a question this project
  carried unresolved for most of its life and has now closed by extracting every row: **50
  property rows, 31 tagged, 19 untagged across 18 distinct properties, and collapsing the six
  `build.*` rows gives exactly the thirteen entries the list carries.** So a harness may assert
  set equality against the source rather than mere membership. Two corrections came with that
  extraction, and both invert what this project believed: `appPort` is attested, while
  `extensions`, `settings` and `devPort` have **zero occurrences anywhere in the reference** —
  and `DC-FEAT-001` and `DC-FEAT-002`, the two rules that carried an explicit caveat, are the
  fully attested ones.
  A harness that computes label-immunity by absence across two lists will call unattested
  properties immune, which is how this was got
  wrong in three files at once; `DC-DEP-001`, described throughout this project as the clean
  case, turns out to be attested for one input of four.
- **The T02-shaped secret fixtures, run against any changed `Detect`.** `${localEnv:TOKEN}`
  in `remoteEnv` must **not** be flagged — it is the exact form `DC-SEC-001`'s own `Fix`
  prescribes — while a literal secret must be, including a low-entropy one such as
  `hunter2`. Round 1 of Gate E emitted `DC-SEC-001 [SPEC] ERROR` against the remedy itself.
- **`SKILL.md` frontmatter `corpus_version` asserted equal to `rules.md`'s value** (grep 3
  above). They can drift and nothing else catches it.
- **`upstream/.generated-from`'s `corpus_version` asserted equal to `rules.md`'s value.**
  `tools/check-skill.sh` performs this, as check 4 ("upstream projection currency"). The
  sidecar exists so the projection's currency is a checkable fact rather than a claim in
  prose, and the script — not a human running the two greps by hand — is what checks it.

Any `Detect` edit re-runs half two. A `Detect` change that alters what the corpus emits for
an unchanged configuration is a **minor** version bump even when the edit looks tiny.
`0.1.0` → `0.2.0` was exactly that — two `Detect` fields narrowed, so findings that used to be
emitted no longer are. So was `0.2.0` → `0.3.0`, in both directions at once: `DC-USER-001`'s
ownership enumeration was opened from a closed three-item list to a read-for-intent class,
**and** the `git config --global --add safe.directory` case was explicitly excluded — a case a
live verification run had previously got right by luck rather than by instruction.

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

**Results live in `docs/VERIFICATION.md`** — the recorded baseline, not this file. Read it as
a point-in-time measurement rather than a current statement: **it is pinned to commit
`8d1f9c6`**, identified by hashing every commit on the branch until one matched all three of
its recorded sha1s. `SKILL.md` has changed since (tier-tag and read-check fixes landed after
that baseline), so its recorded hash no longer matches the file on disk. A baseline in that
state has to be re-run before it can be cited as current, which is the whole reason it records
hashes — and being able to name the commit is what makes "re-run it" a bounded instruction
rather than a vague one.

---

## Gate results, as decision records

Full detail in `docs/gates/GATE-RESULTS.md` and the per-gate files beside it. Each line
claims only what was observed.

| Gate | Question | Result | What it decided |
| --- | --- | --- | --- |
| **A** | installer fidelity | MIXED | `npx skills add` is the supported channel; a strict frontmatter gate validates the source file, never an installed copy |
| **B** | can Copilot resolve `references/` from `.claude/skills/`? | **PASS** (Copilot CLI **1.0.81** + Claude Code control) | `references/` depth is affordable — the twelve rules stay out of the `SKILL.md` body |
| **C** | can Copilot code review shell out? | selection reaches, **execution FAILS** | on that surface the skill is prose-only |
| **D** | false-positive and recall rate on real configs | **STARTED, DEFERRED before completion** — harvest search phase done, content fetch failed, corpus empty | severities are uncalibrated; Phase 2 is not unblocked |
| **E** | blinded usefulness — firing, lift, harm | **PASS at corpus `0.3.0`**, full twelve-task re-run, 48 runs, harm 0 | Phase 1 ships; the evaluation debt is discharged. Copilot selection (66.7%) is the open number |

**Gate B — what rides with the PASS.** It was measured on **Copilot CLI 1.0.81**, carried
forward and *not* re-measured in the 1.0.82 run that produced Gate A's addendum — record the
version on any re-run, or the comparison is not a comparison. VS Code Copilot Chat is NOT RUN
on both discovery and resolution. The probe cannot distinguish skill-relative resolution from reading a file under
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

**Gate D — started, deferred before completion, and its corpus is empty.** That is the status
`docs/gates/gate-d.md` carries, and it is more useful to a resumer than "not run", because the
expensive half did happen:

- **Search phase — DONE.** **4,176 hits, 4,165 unique blobs across 4,064 unique repos.** The
  GitHub code-search API hard-caps every *query* at 1,000 results regardless of pagination, so
  a larger corpus needs **query sharding, not `--paginate`**. This run sharded on `size:` into
  **42 shards** — a partition that is disjoint, so no cross-shard duplicates — at one call per
  shard against a 10 requests/minute limit, about eight minutes of wall clock. Near-1:1 blobs
  to repos, so the corpus is not dominated by forks of one file.
- **Content fetch — FAILED SILENTLY.** `docs/gates/fp-corpus/` is empty. The bug is diagnosed
  in `gate-d.md`.
- **Harness — written**, verbatim from the brief. **Run and adjudication — NOT RUN. Verdict —
  NOT REACHED.**

**There is therefore no false-positive rate and no recall figure for any rule**, and none may
be quoted from the numbers above: 4,176 is a corpus that was *found*, not one that was
measured. Separately, the harness measures a fourth heuristic, `DC-FEAT-PIN`, which has **no
corresponding rule** among the twelve; its FP rate gates a possible Phase 2 check and can never
demote a rule. See also "what this deliberately does not do" — Feature pinning is a real
coverage gap, and `DC-FEAT-PIN` is the harness noticing it.

**Gate E — passed at 0.2.0, after a fix.** Round 1 (`0.1.0`, 44 runs) met the lift bar and
**failed the harm bar**: on `claude -p` one task went from correct to wrong, because the
skill flagged `${localEnv:GITHUB_TOKEN}` — the exact form `DC-SEC-001`'s own `Fix`
prescribes. Systematically, 4 of 16 emitted finding lines (25%) were false positives, all
from two rules. Two `Detect` fields were narrowed and the gate re-run (20 runs, corpus
`0.2.0`).

**Read the table by its denominators, because the three rounds did not measure the same
thing.** Round 1 ran ten tasks on each surface. Round 2 re-ran a **five-task subset** (T02,
T03, T08b, T11, T12), two of them probes added to carry the case each narrowing was most at
risk of losing — its cell is not a ten-task sweep. Round 3 is the full set: **twelve tasks ×
two surfaces × two arms, 48 runs of 48 attempted, contamination 0 of 48.**

| | Round 1 (0.1.0) | Round 2 (0.2.0) | **Round 3 (0.3.0)** |
| --- | --- | --- | --- |
| scope | 10 tasks | 5-task subset | **12 tasks, 48 runs** |
| harm cases | 1 | 0 | **0** |
| false positives among finding lines | 4 of 16 (25%) | 0 of 9 | **1 of 18 (5.6%), self-caveated** |
| lift | 6 of 10 | (subset) | **4 of 12 — 3.3/10 normalised, all four attributable** |
| firing, claude | 10/10 | 5/5 | **12/12 = 100%** |
| firing, copilot | 8/10 = 80% | 5/5 | **8/12 = 66.7%** |

**Round 3 is the first evaluation of the package as it actually ships.** Rounds 1 and 2 both
ran with `references/spec-facts.md` absent, firing the degradation clauses throughout; it
exists now and **no degradation clause fired in any round-3 run**. Neither feared `0.3.0`
regression occurred: opening `DC-USER-001`'s enumeration did not make it over-fire — it fired
on exactly one config, the only one carrying the evidence its `Detect` requires, and cited the
new `safe.directory` exclusion by name. There was **no `DC-SEC-001` or `DC-USER-001` false
positive in 48 runs.**

**The open number is Copilot selection, and it is the leading indicator.** 66.7% is the lowest
firing rate of any round, and one of the four misses was **T12 — a probe the skill exists to
answer.** The decision rule gates on lift and harm rather than on firing, so this does not fail
the gate; it is exactly the shape the rule's "the problem is selection, not the corpus" branch
was written for, and it should be read as a warning rather than as noise.

**One design assumption was measured and failed: the availability conjunct short-circuits on
Copilot.** AUDIT's "checked, no finding" bucket requires that you actually read every input the
rule's `Detect` names. Across 15 AUDIT runs in the WITH arm, `claude` performed that step 9/9
and filed nothing unread; **`copilot` scored 0/6 on the procedure, and 4 of 6 filed rules into
"checked, no finding" whose inputs it had not read.** The decisive evidence is a matched pair
on T08b — same fixture, same corpus, same prompt — where `claude` put `DC-FEAT-002` in *not
checked* and `copilot` put it in *checked, no finding* without opening the Feature. The
previous attempt to fix this was prose, and its author wrote at the time that they could not
claim it would change Copilot's behaviour. It did not. **This is now measured rather than
suspected, and the next lever is mechanical rather than more prose.** Until then, treat a
Copilot AUDIT's "checked, no finding" bucket as unreliable — which is precisely the failure
mode this package exists to prevent, appearing in the package's own output.

Two findings the lift number does not capture, and they shape how this package should be
read. **Zero confidently wrong answers in the WITH arm; three in the WITHOUT arm** — a
confident wrong answer is worse than a miss. And **the lift concentrates where the agent
cannot execute**: on `claude -p` the base model plus a shell already scores 8/10, and the
skill's only win there is a GitHub-side fact no amount of shelling out reaches.

Carried caveats, and the pass does not rest on waving any of them away: **every per-task cell
is n=1**; control variance is real and has moved in both directions between rounds; **the T08b
clean-config fixture was defective for the second time in three rounds** (excluded from grading
on both arms, lift direction unchanged under the strict reading), which keeps alive the
standing finding that a "nothing to find" fixture is near-unconstructible for an agent with
repo-wide shell access; and **VS Code agent mode is unmeasured in all three rounds.**

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
  surface, there is no GUI automation in this project, and it was **NOT RUN** in any of the
  three rounds — including the full re-run at `0.3.0`. The file ships on a documented-mechanism
  argument alone.

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

## `upstream/` — the one sanctioned projection of the corpus

`upstream/awesome-copilot-devcontainers.instructions.md` is a self-contained
`.instructions.md` file carrying all twelve rules **in instruction form** — assertion, what to
look for, the concrete fix, and a source link — with **no `DC-` rule IDs and no severity
labels**. It carries the current corpus, including `DC-USER-001`'s opened ownership
enumeration with its `git config --global --add safe.directory` exclusion, and the
label-attestation rewrite.

**Its currency is declared by `upstream/.generated-from`, and that sidecar is the authority —
not this paragraph.** The payload itself carries no version string, deliberately: our
bookkeeping has no business travelling into a third party's repository. The sidecar stays
here, names the corpus version the projection was generated from, and specifies the assertion
that checks it:

```sh
grep '^corpus_version:' upstream/.generated-from
grep '^corpus_version:' .claude/skills/devcontainers/references/rules.md
# they must match; on mismatch the projection is stale, not merely old
```

**Do not restate the version in prose here.** An earlier draft of this section did, and went
stale within one commit while the sidecar's own assertion passed — two answers to one
question, from the mechanism built to answer it. Read the sidecar.

**It is a payload prepared for [`github/awesome-copilot`](https://github.com/github/awesome-copilot)
and it has not been submitted.** No PR has been opened, so there is no outcome to record here.
That catalogue contains zero devcontainer instruction, prompt or chat-mode files today.

**Why a second copy of the corpus is allowed here and nowhere else.** Everywhere inside this
package, restating a rule is forbidden: it creates a competing source of truth that no
citation pass covers, and it hands the verification harness an answer key it can match against
instead of the corpus. `upstream/` is the deliberate exception, because the file **leaves**
this repository. On the other side there is no `rules.md` to cite into, no tier tag, no audit
procedure and — the actual reason — **no checker to short-circuit.** A reader who finds this
file with no explanation would reasonably conclude the no-projection rule is decorative. It is
not; this is the single sanctioned crossing of it.

**The obligation that comes with it: nothing checks this file.** It must be regenerated from
`references/rules.md` whenever the corpus changes. It is the artifact in this repository most
likely to drift silently, precisely because the property that makes the projection acceptable
— no checker on the other side — also means no checker on this side.

**Traps in their contribution process, measured rather than assumed.** Whoever opens the PR
must know these; two of them will fail CI:

- **Their README index is machine-generated and must never be hand-edited.** `npm start`
  runs `eng/update-readme.mjs` and `eng/generate-marketplace.mjs`, which regenerate
  `docs/README.instructions.md` and the root README tables. A GitHub Action **fails the PR if
  running the generator would change anything**. Run it and commit what it produces. (The
  original task brief said to update the index by hand; that instruction is wrong and
  following it fails their check.)
- **PRs target `main`, explicitly not `staged`.** Branching from `staged` "may be outright
  rejected".
- Frontmatter is exactly `description:` and `applyTo:`, both **single-quoted**. The H1 after
  the frontmatter is load-bearing: the index generator takes it as the entry title.
- Their CONTRIBUTING asks an AI agent to append `🤖🤖🤖` to the **PR title** for fast-tracked
  review. Whether that applies depends on who presses the button; do not add it silently.
- `npm install` in their repository pulls a full dependency tree and runs third-party install
  scripts on the machine that opens the PR.

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

### Every Gate E run must disable network-reachable tooling, in **both** arms

**This constraint is a durable consequence of publishing this repository, and it did not exist
when the first two rounds ran.** Rounds 1 and 2 were measured while the repository was private.
It is public now, so a model in the **control** arm can reach `docs/RESEARCH-BRIEF.md`, the
cached primary sources and every gate result **over the network** — the exact contamination the
run-in-a-scratch-repo rule exists to prevent, arriving by a path that rule does not cover. **A
control that can search the web for this repository is not a control**; it can answer every task
from the research and produce a spurious zero lift, or a spurious pass.

Round 3 mitigated it by passing `--disable-builtin-mcps` to `copilot` in **both** arms, and
recorded contamination as 0 of 48. **Any future run must do the same or an equivalent, and must
state which** — naming the mitigation is half the requirement, because a run that was clean and
cannot say why is not reusable evidence. The same applies to the unaided quarterly re-run below:
"unaided" now has to mean network-unaided, not merely skill-unaided.

**Re-running the citation checkers is not sufficient maintenance.** They verify the corpus
is still TRUE. Gate E is the only instrument that tests the executing half — whether the
corpus is still SAFE TO FOLLOW, and whether it is still worth loading at all now that the
base models have moved. **The usefulness evaluation should travel with any version bump**,
not only with the quarterly calendar. A `Detect` narrowed to kill a false positive is
exactly the edit most likely to lose a true positive, and only a re-run can tell you whether
it did.

A version bump also obliges a re-generation of `upstream/`, which is a projection of the
corpus with no checker behind it — see the section above.

### Evaluation state, as of corpus `0.3.0`

This section used to list two outstanding debts. **Both are closed, and one of them closed
negatively** — which is the more useful of the two outcomes to record.

- **DISCHARGED — the full re-run.** Gate E ran in full against `0.3.0`: 48 runs of 48
  attempted, twelve tasks × two surfaces × two arms, contamination 0 of 48. Lift 4 of 12 (3.3
  of 10 normalised, all four attributable) with **harm 0**, and false positives among emitted
  finding lines down to 1 of 18 from 25% at `0.1.0`. **The package holds at `0.3.0`**, and the
  cascade a version bump triggers has been paid rather than deferred.
- **CLOSED, AND THE ANSWER IS NO — the availability conjunct on Copilot.** The second debt was
  a suspicion that a prose fix had not changed Copilot's bucket discipline. It is now a measured
  finding on 15 AUDIT runs with a matched pair isolating the surface: `claude` 9/9 on the
  procedure, `copilot` 0/6, with 4 of 6 filing unread rules into "checked, no finding". See
  Gate E above. **A closed debt is not the same as a solved problem, and the next lever is
  mechanical rather than more prose.**
- **`upstream/` was never part of this.** It was regenerated with the bump, and
  `upstream/.generated-from` declares the corpus version — check the sidecar rather than this
  sentence.

**What remains open is not a debt but a number: Copilot's 66.7% firing rate**, the lowest of
any round, with one miss on a probe the skill exists to answer. It does not fail the gate. It
is the thing to watch.

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
- **No rule covers Feature or image version pinning.** AUTHOR carries a `[OPINION]` "pin
  versions" bullet and AUDIT will land an unpinned `latest` under `Observations`, but there is
  **no `Detect` for it anywhere in the twelve rules**, so an unpinned Feature is not a finding
  and never carries a rule ID. Confirmed twice from opposite directions: the Gate D harness measures a
  `DC-FEAT-PIN` heuristic that maps onto no rule, and Task 10's verification fixture planted
  an unpinned Feature as one of four deliberate flaws — it correctly never became a finding.
  **The twelve rules are not a closed corpus.** They are the twelve that survived a citation
  pass and a usefulness gate; a config problem with no rule is an `Observations` line, not a
  claim that nothing is wrong.
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
- `docs/sources/` — **25 of 26** cached primary sources: the Dev Container specification, the
  reference CLI, containers.dev and this project's own research notes, all of which are fine to
  redistribute. **One is deliberately local-only.** `devcontainer.md` is a verbatim copy of an
  Anthropic documentation page; caching a third party's page for offline verification and
  redistributing it from a public repository are different acts, so it is gitignored. Nothing
  depends on it — `DC-CLAUDE-001` cites the live URL, which the citation pass resolved, and no
  file in the package references the cached copy. The one practical consequence, stated rather
  than left to be discovered: a fresh clone can re-run the citation pass offline for **eight**
  of the twelve rules rather than nine, and `DC-CLAUDE-001` joins the three that need a live
  fetch.
- `docs/gates/` — the empirical gate results, with `gate-d.md` carrying the Gate D
  search-phase numbers, the shard method and the rate-limit accounting. **The expensive
  harvest artefacts ship with the repository**: `.gitignore` excludes `docs/gates/.harvest/`
  wholesale and then negates three files back in — `hits.uniq.tsv` (4,176 rows: repo, path,
  blob sha), `harvest.sh` and `fetch.sh` — so those three stay tracked while the rest of the
  directory stays ignored, and the eight minutes of rate-limited code search survive a
  `git clean -fdx` and a resumer does not have to buy them again.
  **One thing a resumer should know, though it costs nothing:** `blobs.tsv` — the 4,165-row
  list deduped by blob sha — is **derived, not stored.** It is not committed, but `fetch.sh`'s
  first working line is `awk -F'\t' '!seen[$3]++' hits.uniq.tsv > blobs.tsv`, which
  **regenerates it from the committed hit list unconditionally on every run**, and
  `gate-d.md`'s resume recipe now quotes that line. So a fresh clone needs nothing extra and
  the recipe does not fail. A manual dedup on the blob-sha column is only needed if
  someone drives the fetch some other way. Verified independently from the committed file:
  4,176 rows deduplicate to **4,165 unique blob shas across 4,064 repos**.
  `docs/gates/fp-corpus/` is genuinely absent — it is ignored, and it is empty anyway.
- `upstream/awesome-copilot-devcontainers.instructions.md` — the unsubmitted
  `github/awesome-copilot` payload and the project's only sanctioned prose projection of the
  corpus; see the section above for why it is allowed and what it obliges.
- `tools/wf-preflight.mjs` — unrelated to the skill; validates a Claude Code Workflow script
  before invocation, catching the failure mode where a markdown backtick inside a
  backtick-delimited prompt silently closes the template literal and the parser blames the
  next word.
- Shared project instructions live once, in `AGENTS.md`; `CLAUDE.md`, `GEMINI.md`, `QODER.md`,
  `.windsurfrules` and `.kiro/steering/` are symlinks to it, and `.cursorrules` is a deliberate
  subset. These predate the skill and are workspace configuration, not part of the shipped
  package. The MCP configs (`.mcp.json`, `.vscode/`, `.cursor/`, `.kiro/`, `.qoder/`,
  `.opencode.json`) hardcode an absolute `cwd`; update it if you clone this elsewhere.

---

## Licence

MIT — see [`LICENSE`](LICENSE). Copyright (c) 2026 Emil Dan.

The prior art this package critiques ships an MIT licence with no copyright holder, which
makes the grant hard to rely on. Naming a holder is the cheapest possible fix and there is
no reason to repeat the omission.
