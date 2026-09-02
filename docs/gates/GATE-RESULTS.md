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
implementation for any Phase 2 `bin/`. A strict "frontmatter is exactly these four keys" CI gate —
four being **the set we ship**, not a claim about the legal set (the portable set is five; see
README, "The frontmatter contract") — **must run against the source file, not an installed copy**
— `gh skill install` would fail it every time. Phase 2's `bin/` is not installable-and-runnable
through any advertised channel without an extra step: clean on `npx skills add`, needs a documented
`chmod +x` after `gh skill install`, and is unreachable via `copilot skill add`, which cannot
fetch a repo. If Phase 2 happens, publish to npm with a `bin` entry and make `npx <pkg> audit`
the primary path.

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

TRIPWIRE on that deferral. It does not block Phase 1, but it **does** block two specific things,
and neither may ship ahead of it:
1. **Any installer guidance that promises `metadata:` is preserved through `gh skill install`.**
   We observed injection into a file that had no `metadata:` key; we did not observe what happens
   to one that does. Do not document preservation as a property.
2. **Any Phase 2 check that reads `corpus_version` from an INSTALLED copy.** If `gh skill install`
   clobbers rather than merges, `corpus_version` is simply gone from the installed file and the
   check fails or silently reads nothing. Read `corpus_version` from the source file, or close this
   question first.

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
STATUS: RUN 2026-09-01 — **SELECTION axis: REACH PASS, MECHANISM UNRESOLVED. EXECUTION FAIL**.
Detail: `gate-c.md` and `gate-c-selection.md` (SELECTION follow-up probe, 3 PRs, 2 skills, 1
control arm).

Observed on a fresh private throwaway repo, review posted **64 seconds** after the request:
- SELECTION — REACH PASS (mechanism unresolved). The review body contained the literal string
  `EXEC UNAVAILABLE`, which exists
  nowhere in the setup except inside the probe skill's own fallback instruction. The PR diff
  touched only `exec-canary.txt` and the review reported "Files reviewed: 1/1 changed files", so
  **the SKILL.md's content reached the reviewer from outside the diff and shaped its output.**
- EXECUTION FAIL. The marker `EXEC-OK-4412` never appeared. Copilot emitted the skill's own
  documented "I cannot run commands" fallback string instead. **That string is the SKILL.md
  author's prose, not observed execution** — what was observed is a string appearing, not a
  command being attempted and failing. Do not write "Copilot code review attempted execution and
  failed." It is an observed FAIL of the marker, not an absence of data.

SELECTION follow-up (`gate-c-selection.md`) — it kills Critical 1's *named* alternative and
narrows the rest; it does not close the mechanism question:
- **An out-of-diff directive in an arbitrarily-named `SKILL.md` reached the reviewer and was
  followed.** `quokka-audit`, committed as repo state and never part of any PR diff, had its
  instruction followed and its marker `MARKER-QUOKKA-8801` emitted. Whatever the mechanism, it is
  **not** pinned to a skill named `code-review` at the footer's path — Critical 1's named
  alternative is refuted. The mechanism itself (agent-skill selection vs repo-context ingestion)
  is **not** established; see RESIDUAL — CHANNEL.
- **Control arm — a baseline, and confounded.** `CONTROL-NO-SKILL-8803` was literally inside a file
  in a reviewed diff and did **not** appear in that review, so marker-shaped strings do not appear
  in this reviewer's output as a matter of course. It does **not** discriminate agent-skill
  selection from ordinary repo-context reading: the control string differs from the positive
  markers in *two* variables at once — location (in-diff vs out-of-diff) and instruction-status
  (no imperative vs "you must state the following … verbatim") — and "follows imperatives in any
  repo file it reads" predicts the whole observed pattern equally well. One observation, one PR,
  review effort "Lite"; not a general non-echo rule. **Q1, not this arm, is what closes Critical
  1's named alternative.**
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
STATUS: STARTED, DEFERRED before completion — Gate D now runs only if Gate E shows lift.
Detail: `gate-d.md`, a resumable stub carrying the shard method, the fetch-bug diagnosis and the
resume recipe.

NUMBERS (per the DECISIONS rule below — the corpus size and how it was obtained). The search phase
ran and the expensive half did not: **4,176 hits, 4,165 unique blobs, 4,064 unique repos.** Method:
the GitHub code-search API hard-caps every *query* at 1,000 results regardless of pagination, so a
larger corpus needs **query sharding, not `--paginate`**. This run sharded on `size:` into **42
disjoint ranges** — one 100-result page per shard, at a **10 requests/minute** limit, roughly
**8 minutes** of wall clock. Near-1:1 blobs to repos, so the list is not dominated by forks of one
file. This supersedes the controller's pre-run feasibility note, which recorded only that
`gh api search/code` worked with the current token (`total_count` 194,816 for
`filename:devcontainer.json path:.devcontainer`) and that the clone-the-org fallback was not needed.

The content fetch then **failed silently** on a diagnosed bug, so `docs/gates/fp-corpus/` is
**empty**. The harness was written and never run; no `parsed`/`unparseable` counts and no
adjudications exist.

**There is therefore no false-positive rate and no recall figure for any rule, and none may be
quoted from those numbers: 4,176 is a corpus that was *found*, not one that was *measured*.**

Note: the harness measures a fourth heuristic, `DC-FEAT-PIN`, which has **no corresponding rule**
in Task 6's twelve. Its FP rate therefore cannot demote a rule; it gates a possible Phase 2 check
only. Record it as such rather than silently mapping it onto DC-FEAT-001/002/003.

## Gate E — blinded usefulness (firing rate, lift, harm) — runs after the draft skill exists
STATUS: RUN 2026-09-01 — **LIFT MET, HARM NOT ZERO. Phase 1 does NOT ship on this evidence.**
Detail: `usefulness/tasks.md` (ten tasks with labels written before any run) and
`usefulness/results.md` (per-run table, the three numbers, verbatim output).

44 runs of 44 attempted, all exit 0 — 40 planned plus 4 re-runs of the false-positive control
after its fixture was found defective. Run in a /tmp scratch repo, never in this one: this
repository carries RESEARCH-BRIEF.md and 26 primary sources, so a WITHOUT arm here could answer
every task from the research and produce a spurious zero lift. Five decoy skills were installed
alongside, so selection had to discriminate.

| Number | Result |
|---|---|
| FIRING RATE, `claude -p` | 10/10 = 100% |
| FIRING RATE, `copilot -p` | 8/10 = 80% (missed T05, T10; both answered correctly anyway) |
| FIRING RATE, VS Code agent mode | **NOT RUN** — no GUI automation. Not dropped from the denominator. |
| LIFT | 6 of 10 tasks, **5 attributable** (T05 improved in a run where the skill never fired) |
| LIFT by surface | copilot **5/10, net +5** (5 -> 10 correct); claude **1/10, net 0** (+T01, -T02) |
| Correct totals | 18/20 WITH vs 13/20 WITHOUT |
| HARM | **1 task** |

Firing rate was the number the plan expected to disappoint. It did not.

THE HARM CASE, and it is a real defect rather than a judgement call: on `claude -p`, task T02 went
from correct to wrong. The skill emitted `DC-SEC-001 [SPEC] ERROR` against
`GITHUB_TOKEN: ${localEnv:GITHUB_TOKEN}` — **the exact form that rule's own Fix prescribes**. The
control arm got it right explicitly. Systematically: **4 of 16 emitted finding lines (25%) were
false positives, all from two rules** — `DC-SEC-001`'s key-name clause, and `DC-USER-001`, which
fires on the ABSENCE of an optional property whenever `remoteUser` is set.

DECISION. The rule requires lift >= 3 of 10 AND harm = 0. Lift is met; harm is not. Both must
hold, so this is the MIDDLE branch: fix, re-run, do not add rules, do not open the upstream PR.
**This is not the Lift-0 branch. Rung 1 is not indicated.**

FOUR FINDINGS THE LIFT NUMBER DOES NOT CAPTURE:
- **Zero confidently wrong answers in the WITH arm; three in the WITHOUT arm.** The plan calls a
  confident wrong answer worse than a miss, and this is arguably the strongest single result.
- **The lift is almost entirely on the weaker surface.** On `claude -p` the base model PLUS A
  SHELL already scores 8/10 — three control runs built real containers and ran the real
  `devcontainer` CLI to check themselves. The skill's only claude win is a GitHub-side fact no
  amount of shelling out reaches. The package's value concentrates where the agent cannot execute.
- **A "nothing to find" fixture is near-unconstructible for an agent with repo-wide shell access.**
  T08's clean config lacked a `package.json` its own config referenced, so both arms truthfully
  flagged missing scaffolding. Rebuilt as T08b; T08 excluded.
- Every per-task cell is n=1.

NOT RUN, and it stays open: the `.github/instructions/` pointer sub-experiment the plan folds into
this gate needs VS Code's silent inline-edit surface. **Task 9 must not assume the pointer works**,
and its delete-if-inert rule cannot be evaluated yet.


### Gate E round 2 — after narrowing the two misfiring Detect fields (corpus 0.2.0)
STATUS: RUN 2026-09-01 — **PASS. Phase 1 SHIPS.**

20 runs of 20 attempted (T02, T03, T08b, T11, T12 x 2 surfaces x 2 arms), all exit 0.
Firing **10/10 = 100% on BOTH surfaces** this round; copilot missed two of ten in round 1 and
none of five here.

| Number | Round 1 (0.1.0) | Round 2 (0.2.0) |
|---|---|---|
| HARM | 1 | **0** |
| False positives among emitted finding lines | 4 of 16 (25%) | **0 of 9** |
| True positives lost to the narrowing | n/a | **none — measured, not inferred** |

THE HARM CELL IS FIXED AT THE SOURCE. On T02, `claude` WITH now emits one `DC-SEC-001` finding —
the literal only — and adds an explicit "two things I checked and am NOT reporting" block naming
`${localEnv:GITHUB_TOKEN}` as "correct as written... flagging it would contradict the rule".
`copilot` WITH reached the same place independently.

TWO PROBES WERE ADDED because neither existing fixture carried the case each narrowing was most at
risk of losing. Labels were written before running, per the gate's own discipline.
- **T11** — both password literals raised as `DC-SEC-001 [SPEC] ERROR`, **including the
  low-entropy `hunter2`**, while `${localEnv:API_SECRET}` was explicitly declined ("the
  substitution exclusion is absolute") and a neutral literal was not raised. The corpus author's
  worked check is now an OBSERVATION rather than their reading of their own text.
- **T12** — a CI job running `devcontainer build --image-name ... --push`. Both surfaces WITH
  fired `DC-USER-001`, connected it to the published tag not being the image that runs, and gave
  the CI fix. **Both WITHOUT arms missed it entirely**; copilot even listed non-root `remoteUser`
  under "good practices already present".

`DC-USER-001` now fires on exactly ONE of ten WITH runs — the single fixture carrying the evidence
its new `Detect` requires — and is reasoned about and declined on the other eight. The sharpest
instance is the clean-config control, which noticed `git config --global --add safe.directory` is
an ownership workaround, checked the rule's enumeration, and declined because "its `Detect`
enumerates `chown`, `chmod` and `sudo` specifically". Round 1's PARTIAL on that control became
"Findings: None."

DECISION: lift >= 3 of 10 (6 in round 1, undisputed; round 2 converts T02 from harm to lift and
adds T03 and T12) AND harm = 0. Both conditions of the ship branch are met. **Phase 1 ships.**

CARRIED CAVEATS, none of which the decision rests on:
- **Control variance is real.** The WITHOUT arm scored differently from round 1 on all three
  re-run tasks, in BOTH directions. Every cell is n=1. This does not touch the harm finding, which
  is WITH-vs-WITHOUT on the same fixture, but round 2's control numbers are not evidence of the
  base model degrading.
- **VS Code agent mode is unmeasured in both rounds**, and the `.github/instructions/` pointer is
  still untested. Task 9 must not assume the pointer works and cannot yet apply its
  delete-if-inert rule.
- `references/spec-facts.md` was still absent; its degradation clauses fired correctly again.
- Minor, for the record: `DC-USER-001`'s ownership-workaround enumeration is closed
  (`chown`/`chmod`/`sudo`). A model correctly declined `git config safe.directory` against it. The
  outcome was right and the reasoning was sound, but the enumeration may be under-inclusive.


### Gate E round 3 — the full re-run at corpus 0.3.0
STATUS: RUN 2026-09-01 — **PASS. The package holds at 0.3.0.** Detail: `usefulness/results.md`.

48 runs of 48 attempted, all exit 0, contamination 0/48. Twelve tasks (the ten original with T08b
replacing the voided T08, plus the T11/T12 probes) x 2 surfaces x 2 arms. Skills offered, recorded
for comparability: claude 328, copilot 149.

**This is the first evaluation of the package as it actually ships.** Rounds 1 and 2 both ran with
`references/spec-facts.md` ABSENT, firing the degradation clauses throughout. It exists now, and
no degradation clause fired in any run.

| Number | r1 (0.1.0) | r2 (0.2.0) | **r3 (0.3.0)** |
|---|---|---|---|
| firing, claude | 10/10 | 5/5 | **12/12 = 100%** |
| firing, copilot | 8/10 = 80% | 5/5 | **8/12 = 66.7%** |
| lift | 6/10 | (subset) | **4/12 = 3.3/10 normalised, all attributable** |
| HARM | 1 | 0 | **0** |
| false positives among finding lines | 4/16 = 25% | 0/9 | **1/18 = 5.6%**, self-caveated |

DECISION: lift >= 3 of 10 AND harm = 0. Both hold. The round-1 T02 regression stays fixed, and
there was **no `DC-SEC-001` or `DC-USER-001` false positive in 48 runs**.

NEITHER FEARED 0.3.0 REGRESSION OCCURRED. Opening `DC-USER-001`'s enumeration did not make it
over-fire — it fired on exactly one config, T12, the only one carrying the evidence its `Detect`
requires, and cited the new `safe.directory` exclusion by name. `spec-facts.md` existing made
AUTHOR and DEBUG mildly longer but they asserted nothing they should have routed.

### Gate E round 4 — the Inputs lever at corpus 0.4.0
STATUS: RUN 2026-09-02 — **FAIL against the pre-registered criterion.** Detail:
`usefulness/results.md`, ROUND 4.

The criterion, quoted verbatim from `task-4-brief.md`:

> **PASS** iff all of: (a) among copilot AUDIT runs where the skill fired, ≥ 5 of 6 (or the
> equivalent proportion if fewer fire — state the denominator) emit `read:` evidence lines in
> the clean bucket and file **zero** rules as "checked, no finding" whose inputs the trace shows
> unread; (b) claude stays 9 of 9 on both; (c) HARM = 0 against the reused round-3 control;
> (d) the set of rule IDs in finding lines per fixture is identical to round 3's WITH runs on
> the same surface (finding set unchanged by a non-Detect bump) — any difference is reported
> line by line.

**(d)'s parenthetical is load-bearing** — "finding set unchanged by a non-Detect bump" is the
assumption the criterion rests on, and it is the assumption the defect noted below attacks.

```
(a) FAIL (proportional reading; PASS under the literal-count reading)   5 of 7
(b) PASS                                                               9 of 9, 9 of 9
(c) PASS                                                               HARM = 0
(d) FAIL                                                               3 differences, all improving
```

**FAIL.** The criterion is a conjunction and (d) fails outright, so the outcome does not depend on
how (a) is read.

18 runs of 18 attempted, all exit 0, contamination 0/18. Nine tasks x 2 surfaces, **WITH arm only
— round 3's WITHOUT cells are the reused control**. Skills offered: claude 328, copilot 149,
identical to round 3. Skill checksums identical before and after.

| Number | r3 (0.3.0) | **r4 (0.4.0)** |
|---|---|---|
| firing, claude | 9/9 on these nine | **9/9 = 100%** |
| firing, copilot | 6/9 on these nine | **7/9** (T02 and T12 gained, **T05 lost**) |
| correctness, WITH | — | **claude 9/9, copilot 9/9** |
| LIFT | — | **3 of 9, all attributable** |
| HARM vs the reused control | — | **0** |
| false positives among finding lines | 1/18 = 5.6% | **0/20** |
| hallucinated `read:` evidence | n/a | **0 of 18** |

**What moved and what did not, with equal prominence.** The round-3 procedural step went from
**0 of 6** Copilot runs to **7 of 7**, and the exact Task 10 case — a Feature rule filed clean
without opening a `devcontainer-feature.json` — went from **2 of 6** to **0 of 7**. But **2 of 7
runs still file `DC-USER-001` into "checked, no finding"** on an evidence line that omits
`containerUser` and the conditionally-required image metadata label, and **T11 is a regression**:
clean in round 3, unread-clean now. **On the five fixtures common to both rounds the count is
4 of 5 -> 2 of 5**, not the aggregate's 4 of 6 -> 2 of 7. The mechanism of that regression is the
lever's own cost — the evidence format lowered the bar to entry where it was meant to raise it.

**NO CORPUS REGRESSION IS INDICATED, AND IT WAS CHECKED.** The branch's diff to `rules.md` touches
`corpus_version`, the twelve `Inputs` lines and the template's `Inputs` line, and **no `Detect`,
`Fix`, `Severity`, `Tier`, `Quote` or `Source` line.** All three Copilot finding-set differences
are improvements: two rules newly found because the skill fired where it did not before (T02,
T12), and round 3's single false positive removed (T07's `DC-LIFE-001`).

**THE CRITERION ITSELF WAS DEFECTIVE, AND IS RECORDED AS FAILED RATHER THAN REWRITTEN.**
Sub-criterion (d) demanded a finding set identical to round 3's. A lever whose purpose is to make
the model read more inputs necessarily changes what can be found, and every cell is n=1 with
stochastic firing — so a (d) that could pass would be a (d) in which the lever did nothing. It was
pre-registered, it is failed, and its defect is a finding about the criterion. A future round needs
a directional test (no new false positive, no lost true positive), not an identity test.

**THE ROUND'S OWN WEAKNESSES.** The control is reused from round 3 and non-contemporaneous.
**Network isolation was weaker than the flags imply on BOTH surfaces**: `--disable-builtin-mcps`
does not disable Copilot's own `web_search`/`web_fetch` and one copilot run reached upstream
documentation successfully, while on the claude surface an egress attempt was blocked by the
operator's local `context-mode` PreToolUse hook rather than by `--strict-mcp-config --mcp-config
'{"mcpServers":{}}'`. The claude arm ran inside the operator's live hook and plugin stack, not a
clean room (eight `SessionStart:startup` hook responses per trace). Four copilot runs issued
root-scoped `find` calls; the sandbox denied all four and nothing ran. T05 on copilot is a firing
regression. **The T08b clean-config fixture carried the same defect as in round 3** —
`forwardPorts: [3000, 5432]` and `npm run db:seed` with no database service — and round 3's
grading precedent was kept so the two rounds stay comparable: repo-level observations about the
fixture are excluded from grading on both arms. Every cell is n=1.

## THE AVAILABILITY CONJUNCT — THE PROSE FIX DID NOT WORK; THE OUTPUT REQUIREMENT MOSTLY DID
This was the second recorded debt. Round 3 measured it across 15 AUDIT runs in the WITH arm:
- **claude**: performed the procedural step 9/9, and put nothing unread into "checked, no finding".
- **copilot**: **0/6 on the procedure**, and **4 of 6 filed rules into "checked, no finding" whose
  inputs it had not read** — two of them the exact Feature-rule case Task 10 first saw.

The decisive round-3 evidence was a matched pair on T08b — same fixture, same corpus, same prompt:
claude put `DC-FEAT-002` in *not checked* ("github-cli Feature not vendored"); copilot put it in
*checked, no finding* without opening the Feature. That fix was prose, and its author wrote at the
time: "What I can't claim: that this changes Copilot's behaviour." It did not. Round 3 concluded
**the next lever is mechanical, not more prose.**

**THAT NOW HAS AN ANSWER, AND IT IS A PARTIAL ONE.** Corpus `0.4.0` replaced the procedural
instruction with an output requirement whose content is copied from the corpus: every rule carries
an `Inputs:` line, and each "checked, no finding" tally entry must carry `read:` evidence naming
every input on that line. Round 4 measured it on 7 copilot and 9 claude AUDIT runs:

| | claude r3 | copilot r3 | claude r4 | copilot r4 |
|---|---|---|---|---|
| performed the input-check visibly before bucketing | 9/9 | **0/6** | 9/9 | **7/7** |
| something clean whose inputs it had not read | 0/9 | **4/6** | 0/9 | **2/7** |
| the exact Task 10 Feature case | 0/9 | **2/6** | 0/9 | **0/7** |
| hallucinated `read:` evidence | n/a | n/a | **0** | **0** |

**The exact case the lever was built for did not occur once.** The residual is narrow and
nameable: on two fixtures Copilot writes a `DC-USER-001` clean-bucket entry that omits
`containerUser` and omits the conditionally-required image metadata label — a
**partial-enumeration** failure, not round 3's **no-enumeration** failure. On the same two
fixtures claude files that rule `not checked` for exactly that reason.

**AND THE LEVER HAS A COST, WHICH THE AGGREGATE HIDES.** On the five fixtures common to both
rounds the count is **4 of 5 -> 2 of 5**, and **T11 REGRESSED** — its clean bucket was empty in
round 3 and carries an unread-clean `DC-USER-001` now. The evidence format gave the model a way to
justify a clean-bucket entry, and on that fixture it made it willing to file one it had previously
declined to file. An evidence format lowered the bar to entry where it was meant to raise it.

**THE DOCUMENTED LIMITATION, SCOPED TO WHAT WAS OBSERVED.** Round 3's blanket "treat a Copilot
AUDIT's 'checked, no finding' bucket as unreliable" is **retired** — round 4 contradicts it, with
5 of 7 copilot runs filing nothing clean at all and the Feature case at zero. What replaces it, in
`SKILL.md` and `README.md`: **a Copilot AUDIT's "checked, no finding" entry may omit an input,
characteristically the conditional image metadata label and a property the config does not set, so
such an entry is a claim to check against the rule's `Inputs` line rather than a guarantee.**
Per the plan's FAIL branch there is no third prose round.

## COPILOT SELECTION IS NOW THE GATE'S WEAKEST NUMBER
66.7% is the lowest firing rate of any round (r1 80%, r2 100%), and one of the four misses was
**T12 — a probe the skill exists to answer.** The decision rule's "the problem is selection, not
the corpus" branch was written for exactly this shape, even though the rule itself gates on lift
and harm rather than on firing. Worth treating as the leading indicator it is.

**Round 4 moved it up, on a narrower set.** On the nine AUDIT tasks matched across both rounds,
copilot firing went **6 of 9 -> 7 of 9**. The net +1 is three changes, not one: **T02 and
T12 gained and T05 was lost.** T05 is a firing regression and the +1 framing hides it. Round 3's
whole-set 8 of 12 is not comparable to a nine-task round; the matched nine is the figure that is.

## A NEW CONTAMINATION VECTOR, CREATED BY PUBLISHING THE REPOSITORY
Rounds 1 and 2 ran while this repository was private. It is now public, which means a model in the
**control** arm can reach `RESEARCH-BRIEF.md`, the cached sources and every gate result over the
network — the exact contamination the /tmp scratch-repo ruling exists to prevent, arriving by a
path that ruling does not cover. Round 3 mitigated it by passing `--disable-builtin-mcps` to
copilot in **both** arms. **Any future Gate E run must do the same or an equivalent**, and must say
which. A control that can search the web for this repository is not a control.

**ROUND 4 NAMED THE FLAGS AND THEN MEASURED THEM, AND THEY ARE WEAKER THAN THEY LOOK — ON BOTH
SURFACES.** The mitigations were `--disable-builtin-mcps` on copilot and `--strict-mcp-config
--mcp-config '{"mcpServers":{}}'` on claude. **`--disable-builtin-mcps` does not disable Copilot's
own `web_search` / `web_fetch`**: one copilot run issued a `web_search` and two `web_fetch` calls
against upstream `devcontainers/images` documentation and they succeeded. On the claude surface an
egress attempt (a `WebFetch` and a `curl` of the MCR tags list) was blocked, **but by the
operator's local `context-mode` PreToolUse hook, not by the isolation flags.** Nothing either
surface fetched was this repository and the sweep is 0 of 18 — but the flags prevented egress on
neither surface, and a future run must not treat naming them as having achieved isolation.

## CARRIED CAVEATS
- **The T08b clean-config fixture was defective again** — it forwarded 5432 with no database
  service — which is now three rounds out of four: rounds 2, 3 and 4. Excluded from grading on
  both arms per round 2's precedent; the lift direction is unchanged under the strict reading. The
  standing finding holds: a "nothing to find" fixture is near-unconstructible for an agent with
  repo-wide shell access.
- **T04's claude WITHOUT grade is the most contestable** — it names `userEnvProbe: "none"` and then
  denies it is the cause. Graded PARTIAL against the pre-written label. Nothing was re-labelled;
  recorded as a possible label defect for a future round.
- VS Code agent mode remains NOT RUN in all four rounds, and the `.github/instructions/` pointer
  is still untested.
- Every per-task cell is n=1.
- **Round 4's control is round 3's**, reused and non-contemporaneous — no WITHOUT run was executed.
  Pre-registered in the brief, and it means HARM was computed against a control from a different
  day and a different Claude Code patch version (2.1.257 vs 2.1.258).
- **Round 4's claude arm was not a clean room.** `--strict-mcp-config` worked (`mcp_servers: []` in
  every init event) but does not disable hooks, plugins, skills or slash commands, and all nine
  claude traces carry eight `SessionStart:startup` hook responses injecting `additionalContext`.
  Almost certainly constant with round 3, so the comparison stands; it is not a bare harness.
- **Round 4 recorded a criterion defect**: sub-criterion (d) demanded a finding set identical to
  round 3's, which a lever designed to make the model read more inputs cannot leave unchanged. It
  was pre-registered, it is failed, and it is not rewritten.

## DECISIONS
Phase 1 SHIPS only if Gate E shows lift on >= 3 of 10 tasks with zero harm cases.
  **Lift 1-2 => the problem is selection, not rules. Rewrite the description. Do not add rules.**
  Lift 0 => stop and fall back to twelve facts in AGENTS.md. Record that as the finding.
Phase 2 (executable checker) proceeds only if Gate E passed AND Gate D flagship-heuristic
  false positives on working public configs are <= 10% with usable recall.
Record all numbers here, including the corpus size and how it was obtained.

Settled by Gates A-C, carried forward — each bullet claims only what was observed:
- **Frontmatter ships FOUR keys** (`name`, `description`, `license`, `metadata`) **of a five-key
  portable set** — `allowed-tools` is the fifth and is omitted deliberately, because the key is
  portable and its *value grammar* is not (Claude Code writes `Bash(node:*)`, Copilot writes
  `shell(...)`); four is what we ship, not the only legal set. A strict
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
- **Copilot code review obeyed an out-of-diff directive in an arbitrarily named
  `.github/skills/.../SKILL.md`; whether this was agent-skill selection is unresolved.**
  (`gate-c-selection.md`, observed: `quokka-audit`'s instruction followed and its marker emitted,
  with that SKILL.md in no PR diff.) One observation per arm, review effort "Lite" throughout. The
  control arm is confounded and does not settle the mechanism. **Everything was observed from
  `.github/skills/`, never from `.claude/skills/` — which is where this project ships its skill.**
  Do not assume code review sees a `.claude/skills/` skill, and do not design on description-based
  selection working here.

## CLEANUP — COMPLETE
All throwaway probe repos have been deleted. The `gh` token originally lacked the `delete_repo`
scope; the repository owner granted it, and the controller then deleted
`danemil/probe-skill-gatea` (Gate A), `danemil/probe-exec-gatec` (Gate C) and
`danemil/probe-select-gatec` (Gate C selection follow-up). No repository matching "probe" remains
on the account. All local probe working trees were removed by their own tasks. **Nothing is
outstanding.**
