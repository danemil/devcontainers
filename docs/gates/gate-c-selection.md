# Gate C follow-up — does Copilot code review load an ARBITRARILY-NAMED skill?

Follow-up probe to `gate-c.md`, run by the controller on 2026-09-01 against the task review's
Critical 1 ("is the SELECTION PASS skill selection, or just repo-context reading, and is loading
pinned to the `code-review` name?"). It answers the second half of that question and leaves the
first half open — see RESIDUAL 3.

Raw evidence: `.superpowers/sdd/2026-08-31-devcontainer-agent-package/task-4-selection-rawdata.md`.
Probe repo: `danemil/probe-select-gatec` (private, **deleted** after collection). Skills were
committed to `main` as *repo state*; each PR touched only its own canary text file, so no
`SKILL.md` was ever part of any PR diff.

Two questions:

- **Q1.** Does Copilot code review load a skill under an arbitrary name, or only one named
  `code-review`?
- **Q2.** Is the "Add a `code-review` agent skill" footer a generic affordance shown on every
  review, or does it signal something?

**This probe says nothing about execution.** Both probe skills explicitly instruct "Do not run
any commands"; they ask only that a marker string be emitted. Gate C's EXECUTION FAIL is
untouched by anything here.

---

## DESIGN FLAW — read this before the results

**The three arms are not cleanly separated, and the probe cannot say how badly.** Both skills
were committed to `main` before the last two reviews ran, and the reviews were requested after
both commits landed. Whether that contaminates arms 1 and 2 depends on **which tree the reviewer
reads** — the PR head branch, or the default branch tip — and this probe does not determine that.

Commit / PR / review timeline (UTC, all 2026-09-01), reconstructed from the raw data:

```
04:53:21  448af14  main: initial commit (README only, no skills)
04:53:41           PR 1 created  (arm 3 control, head arm3-control, base sha 448af14)
04:53:49           PR 1 review requested from Copilot
04:54:02  927a3a6  main: quokka-audit skill added
04:54:13           PR 2 created  (arm 1, head arm1-quokka, base sha 927a3a6)
04:54:43           PR 1 review SUBMITTED
04:55:44  872b426  main: code-review skill added
04:55:57           PR 3 created  (arm 2, head arm2-codereview, base sha 872b426)
04:57:34           PR 2 review requested from Copilot
04:57:35           PR 3 review requested from Copilot
04:58:37           PR 2 review SUBMITTED
04:58:46           PR 3 review SUBMITTED
```

Head-branch trees — **RECONSTRUCTED, NOT OBSERVED.** The raw record captures each PR's *base sha
at creation* and nothing else about its branch: no head sha, no parent, no per-branch tree
listing. The column below assumes each branch is a child of its recorded base sha, which the
timeline makes near-certain (PR 2 was created 11s after `927a3a6` landed, PR 3 13s after
`872b426`) but which was never checked. To have observed it, the probe would have needed a
`gh api repos/.../git/trees/<head-sha>?recursive=1` per branch, or the head sha plus its parent.
Treat this whole column as inference:

| PR | arm | head tree contains | `main` tip at review time contains |
|---|---|---|---|
| PR 1 | arm 3 (control) | no skills | none at request; `quokka-audit` landed 41s before submission |
| PR 2 | arm 1 | `quokka-audit` only | `quokka-audit` **and** `code-review` |
| PR 3 | arm 2 | `quokka-audit` **and** `code-review` | `quokka-audit` **and** `code-review` |

So (taking the reconstructed column at face value):

- If the reviewer loads skills from the **PR head branch**, the arms *are* separated and the
  intended one-skill-per-arm comparison exists.
- If it loads from **`main`'s tip**, arms 1 and 2 saw an identical skill set and the intended
  comparison does not exist at all.

Three observations bear on which, and they do not all point the same way:

1. **Toward head-branch (or request-time snapshot):** PR 2 emitted `MARKER-QUOKKA-8801` and not
   `MARKER-CODEREVIEW-8802`. At PR 2's review time `main` carried *both* skills, so a `main`-tip
   reader saw both; its branch carried only `quokka-audit`.
2. **Toward head-branch (or request-time snapshot) — the control arm, and it cuts against the
   reading this file otherwise leans on, which is why it is stated here:** PR 1 emitted **no**
   `MARKER-QUOKKA-8801`, even though `quokka-audit` landed on `main` at 04:54:02 and PR 1's review
   was not submitted until 04:54:43 — 41 seconds later. Under a strict `main`-tip-at-submission
   reading it should have appeared. It is a **weak** argument: PR 1's review was *requested* at
   04:53:49, 13 seconds *before* `quokka-audit` landed, so a snapshot taken at request time
   explains the absence without saying anything about which tree is read. It is a 41-second race
   either way.
3. **Toward `main`-tip — but only under one reading of the footer:** the "Add a `code-review`
   agent skill" link was absent on PR 2, whose *branch* contained no `code-review` skill while
   `main` did. This is evidence for `main`-tip evaluation **only under Q2 reading (a)** (the link
   is suppressed once `.github/skills/code-review/SKILL.md` exists). Under Q2 reading (b) (the
   link signals that no skill was loaded), PR 2's suppression is fully explained by head-branch
   evaluation with `quokka-audit` loaded, and this observation stops arguing for `main`-tip at
   all. The dependency is two judgements deep and is stated here so no reader inherits it
   silently.

**Which-tree is UNRESOLVED.** On balance the observations lean toward head-branch or request-time
evaluation *of skill loading* — (1) and (2) both point there, and (3) only counts against it under
one of the two live footer readings. There is a single hypothesis under which every observation
coheres without tension: skills are loaded from the PR head branch, while the footer's link is
computed against the default branch (its URL is literally `/new/main?filename=…`, so `main` is
where it would create the file). **Nothing in this probe tests that hypothesis**; it is recorded
as a candidate for a future probe, not as a finding, and the verdict stays UNRESOLVED.

A second, independent confound: each arm's canary file *names the skill(s)* it is testing in
plain prose inside the diff. PR 2's canary names `quokka-audit`; PR 3's canary names both and
says it is testing whether `code-review` is "privileged". A reviewer steered by the diff text
rather than by the skill set would produce the same marker pattern. This does **not** touch Q1
(the marker strings themselves are in no diff — checked against the whole raw record), but it does
weaken any claim about *which of two present skills gets picked*.

**What the probe can still prove despite this:** that a skill named something other than
`code-review` is loaded and obeyed (Q1). **What it cannot prove:** which tree the skill is read
from, whether `code-review` is privileged when both exist, or whether the load happens via the
agent-skills subsystem or via ordinary repo-context reading. The control arm contributes a
baseline, not a discriminator — see its section below for exactly what it does and does not
license.

---

## Per-arm result

| PR | arm | skill(s) in head tree | marker emitted in review | "Add a `code-review` agent skill" footer link |
|---|---|---|---|---|
| PR 1 | arm 3 (control) | none | **none** — `CONTROL-NO-SKILL-8803` did **not** appear, although it was in the diff | **PRESENT** |
| PR 2 | arm 1 | `quokka-audit` | **`MARKER-QUOKKA-8801`** | **ABSENT** |
| PR 3 | arm 2 | `quokka-audit`, `code-review` | **`MARKER-CODEREVIEW-8802`** (only) | **ABSENT** |

The MCP half of the footer ("configure MCP servers for context-aware, tailored reviews") is
present on all three. Only the skill-link half varies.

Marker provenance, checked against the whole raw record:

- `MARKER-QUOKKA-8801` occurs in exactly two places: inside
  `.github/skills/quokka-audit/SKILL.md`, and in PR 2's review body. It is not in any canary
  file, not in any PR diff, not in any commit message. (The raw record does not capture
  `README.md`'s content; the string was authored for the SKILL.md and appears nowhere else that
  was recorded.)
- `MARKER-CODEREVIEW-8802` likewise occurs only in `.github/skills/code-review/SKILL.md` and in
  PR 3's review body.
- `CONTROL-NO-SKILL-8803` occurs only in `control-canary.txt`, which **was** part of PR 1's diff,
  and appears in **no** review body.

## Verbatim review bodies

### PR 1 — arm 3 control (`control-canary.txt`, no skill in head tree)

```
### 🟢 Approval recommended

The change is a simple new text file addition with no functional or behavioral impact on the codebase.

<details>
<summary>Pull request overview</summary>

Adds a small control/canary text file intended to validate behavior when no repository Skills are present, without affecting application code.

**Changes:**
- Introduces `control-canary.txt` containing an Arm 3 control marker line.
</details>

<details>
<summary>File summaries</summary>

| File | Description |
| ---- | ----------- |
| control-canary.txt | Adds a canary marker file used for control/testing scenarios when no Skills exist. |
</details>

<details>
<summary>Review details</summary>

- **Files reviewed:** 1/1 changed files
- **Comments generated:** 0
- **Review effort level:** Lite
</details>

---

💡 <a href="/danemil/probe-select-gatec/new/main?filename=.github/skills/code-review/SKILL.md" class="Link--inTextBlock" target="_blank" rel="noopener noreferrer">Add a `code-review` agent skill</a> or configure MCP servers for context-aware, tailored reviews. <a href="https://docs.github.com/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review?tool=webui#mcp-servers-and-agent-skills" class="Link--inTextBlock" target="_blank" rel="noopener noreferrer">Learn more in the docs.</a>
```

### PR 2 — arm 1 (`quokka-audit` present as repo state)

```
### 🟢 Approval recommended

The change is limited to adding a non-executable canary text file and does not introduce functional risk.

<details>
<summary>Pull request overview</summary>

This PR adds a simple canary text file entry used to validate that the repository’s `quokka-audit` skill can be detected/loaded during review.

**Changes:**
- Adds `arm1-canary.txt` with two informational lines.
</details>

<details>
<summary>File summaries</summary>

| File | Description |
| ---- | ----------- |
| arm1-canary.txt | Adds a canary message referencing the pre-existing `quokka-audit` skill state on `main`. |

MARKER-QUOKKA-8801
</details>

<details>
<summary>Review details</summary>

- **Files reviewed:** 1/1 changed files
- **Comments generated:** 0
- **Review effort level:** Lite
</details>

---

💡 Configure MCP servers for context-aware, tailored reviews. <a href="https://docs.github.com/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review?tool=webui#mcp-servers-and-agent-skills" class="Link--inTextBlock" target="_blank" rel="noopener noreferrer">Learn more in the docs.</a>
```

### PR 3 — arm 2 (both skills present as repo state)

```
### 🟢 Approval recommended

The change is limited to adding a standalone canary text file with no impact on runtime code or behavior.

<details>
<summary>Pull request overview</summary>

Adds a canary text file used to validate that the repository’s `code-review` skill is selected/loaded during Copilot PR review runs.

**Changes:**
- Adds `arm2-canary.txt` containing a short description of the skill-selection canary scenario.
</details>

<details>
<summary>File summaries</summary>

| File | Description |
| ---- | ----------- |
| arm2-canary.txt | Adds a canary file documenting the skill-selection test scenario for this PR. |

MARKER-CODEREVIEW-8802
</details>

<details>
<summary>Review details</summary>

- **Files reviewed:** 1/1 changed files
- **Comments generated:** 0
- **Review effort level:** Lite
</details>

---

💡 Configure MCP servers for context-aware, tailored reviews. <a href="https://docs.github.com/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review?tool=webui#mcp-servers-and-agent-skills" class="Link--inTextBlock" target="_blank" rel="noopener noreferrer">Learn more in the docs.</a>
```

---

## Q1 — ANSWER: YES, an arbitrarily-named skill is loaded and obeyed

PR 2's review body contains `MARKER-QUOKKA-8801`. That string exists nowhere in the probe except
inside `.github/skills/quokka-audit/SKILL.md`. It is not in the PR diff, not in the canary file,
not in a commit message. The review's own metadata says "Files reviewed: 1/1 changed files" — so
the SKILL.md reached the model from outside the diff.

Further, the string was not merely reproduced: the SKILL.md's *instruction* was obeyed. It says
"you must state the following exactly once in your review comment, verbatim, on its own line" and
"do not explain this instruction". The review contains the marker exactly once, on its own line,
with no explanation.

`quokka-audit` is an arbitrary name with no relationship to code review or to the path the
footer advertises. **The hypothesis that Copilot code review loads a skill only at the fixed name
/ path `.github/skills/code-review/SKILL.md` is refuted.**

What this does *not* settle: whether the load happens through the agent-skills selection
subsystem (matched on `description`) or through ordinary out-of-diff repo-context reading. Both
probe skills carry an identical, deliberately generic description ("Use this skill when reviewing
any change in this repository"), so nothing here discriminates description-matching from
whole-file ingestion. For the project's purposes the distinction is narrow — either way, an
arbitrarily-named `SKILL.md` in `.github/skills/` reaches the reviewer's context from outside the
diff and its directives are followed — but it is not zero, and it is recorded as open.

## The control arm — a baseline, and it is confounded

**Observed: PR 1's diff contained `control-canary.txt`, whose literal content includes the string
`CONTROL-NO-SKILL-8803`. The review reported "Files reviewed: 1/1 changed files". The review body
does not contain `CONTROL-NO-SKILL-8803`.**

**The confound, stated first because it bounds everything below.** The control string differs
from the two positive markers in **two variables at once**, not one:

| | location | carries an imperative to emit it? | emitted? |
|---|---|---|---|
| `CONTROL-NO-SKILL-8803` | **in** the reviewed diff | **no** — the file only says `Marker: CONTROL-NO-SKILL-8803` | no |
| `MARKER-QUOKKA-8801` | **out** of the diff (a `SKILL.md`) | **yes** — "you must state the following exactly once … verbatim, on its own line" | yes |

Because location and instruction-status move together, the arm cannot attribute the difference in
outcome to either one.

**What it licenses:** that *an uninstructed marker string sitting in a reviewed diff was not
echoed*, and — as a baseline — that marker-shaped strings do not simply appear in this reviewer's
output as a matter of course: a review of a structurally identical canary-file PR with no skill
present came back with no marker at all. That is a real, if modest, sanity check on the probe
harness, and it is the honest extent of it.

**What it does NOT license, and an earlier draft of this file wrongly claimed it did:**

- It is **not** a discriminator between the two channels Critical 1 named. "The reviewer reads
  repository files as ordinary context and follows imperatives it finds in them" (route 2)
  predicts the entire observed pattern — control not echoed, both instructed markers echoed —
  exactly as well as "the agent-skills subsystem selected the skill" (route 1). Nothing here
  separates them.
- It does **not** establish "what it reproduces are strings it was instructed to reproduce" as a
  general rule. To test that, an arm would have to put an imperative *in the diff itself* and see
  whether it is obeyed. No arm did.
- The hypothesis it does kill — "the model echoes any marker-shaped string it is shown" — was
  **not the deflationary reading Critical 1 raised**, and was nobody's position: in Gate C itself
  the SKILL.md was likewise out of the diff, so echoing-what-you-see was never the competing
  explanation there either.

**Q1 is what carries Critical 1, not this arm.** The work that kills Critical 1's named
alternative — that Copilot loads a skill only at the fixed `code-review` name and path — is the
`quokka-audit` result above. This section is scoped support and a baseline; it is not the pivot.

Scope: one observation, one PR, review effort "Lite". It shows this reviewer did not echo *this*
string on *this* review. It is not proof of a general non-echo rule.

## Q2 — ANSWER: NUANCED. The footer is conditional, but on what is unresolved

The "Add a `code-review` agent skill" link appeared on PR 1 and was **absent** on PR 2 and PR 3,
while the MCP half of the same footer sentence appeared on all three. So the first thing to
record is a flat contradiction of `gate-c.md`'s original dismissal: **the footer is not "a generic
UI affordance shown on every review regardless of whether a skill fired."** It varies with repo
state. It is a signal.

Two readings survive the data, and the data cannot separate them:

**(a) The link is conditional on `.github/skills/code-review/SKILL.md` not existing.**
It is a GitHub *file-creation* URL — `/new/main?filename=.github/skills/code-review/SKILL.md` —
so suppressing it once that exact file exists is ordinary UI hygiene: you do not offer "create
this file" for a file that is already there. `code-review/SKILL.md` existed on `main` at review
time for PR 2 and PR 3, and did not exist anywhere when PR 1 was reviewed. Under (a), the footer
says nothing at all about whether a skill was loaded.

**(b) The link signals that no skill was loaded for this review.**
Under (b), PR 1 loaded nothing (footer shown), PR 2 loaded `quokka-audit` (footer suppressed),
PR 3 loaded `code-review` (footer suppressed) — also fully consistent, and it makes the footer a
free "was a skill used?" indicator.

**(a) is the more parsimonious reading**, for one reason: the link's own mechanics. It is a
pre-filled create-file link for one specific path, and its presence/absence tracks that exact
path's existence with no exceptions in the data. (b) requires the UI to compute a
skill-invocation fact and then express it by hiding a *file-creation* affordance, which is a
less natural design. But (a) has a cost of its own: it requires the footer to be evaluated
against `main`, since `code-review/SKILL.md` was not in PR 2's head-branch tree (reconstructed,
not observed — see DESIGN FLAW) — which drags in the unresolved which-tree question above. Note
the direction of that dependency: observation 3 in the DESIGN FLAW section counts as evidence for
`main`-tip evaluation **only under (a)**; under (b) it counts for nothing either way.

Consequence for the original Gate C reading, under each:

- **Under (a)**, the footer is not a counter-signal at all. The task review's Critical 1
  characterised it as "the only claim standing between the recorded verdict and the alternative
  that Copilot loads a skill only at a fixed `code-review` name". Q1 has independently killed
  that alternative, so under (a) nothing is left of the objection: Gate C's SELECTION finding
  stands as stated, modulo the channel question.
- **Under (b)**, the footer becomes a diagnostic — and it is a *supporting* one for Gate C, not a
  contradicting one. Gate C's probe repo had a skill at `.github/skills/probe-exec/` and its
  review showed the footer. Under (b) that would read as "no skill was loaded", which would put
  Gate C's SELECTION back in doubt and, as the task review noted, weaken EXECUTION to UNKNOWN.
  **This is the one branch under which Gate C's SELECTION claim would fail**, and the probe
  cannot exclude it. Note that Gate C's own repo is not directly comparable: it had no
  `code-review`-named skill, so under (a) its footer is fully expected.

Net: Q2 does not by itself settle Gate C either way, and Q1 is what carries the weight.

## Weak signal (one observation — NOT established)

PR 3 had both skills available (in its head tree, and on `main`), and its canary text named both,
yet the review emitted only `MARKER-CODEREVIEW-8802` and not `MARKER-QUOKKA-8801`. That hints the
`code-review` name may be privileged — picked first, or picked exclusively — when several skills
match. **This is one observation with at least two live confounds** (the which-tree ambiguity
above, and PR 3's canary text explicitly foregrounding `code-review`), and it should not be
carried forward as a finding. It is recorded so a future probe knows what to test.

Note also that both skills carry identical, maximally-broad descriptions, so nothing here tests
description-based ranking between competing skills.

---

## RESIDUALS

**1. `.claude/skills/` on the code-review surface is UNTESTED. This is the residual that matters
most to this project.**
All three arms of this probe, and Gate C itself, used `.github/skills/`. The project ships its
skill to `.claude/skills/`. Gate B established that `.claude/skills/` is discovered and its
`references/` resolve — **on the Copilot CLI, which is a different surface with a different,
CLI-documented discovery list** (`copilot skill --help`: "Project — `.github/skills/`,
`.agents/skills/`, or `.claude/skills/`"). Nothing in Gate B, Gate C, or this probe observes
Copilot *code review* reading `.claude/skills/` at all. Do not carry Gate B's PASS across to the
code-review surface. If a Phase 2 design needs the code-review surface to see the project's
skill, either test `.claude/skills/` there or ship a copy under `.github/skills/`.

**2. Which tree the reviewer loads skills from — PR head branch or default-branch tip — is
UNRESOLVED**, and the probe's own arms are not cleanly separated because of it (see DESIGN FLAW).
The balance of the three observations there leans toward head-branch or request-time evaluation,
but the per-branch trees themselves are **reconstructed from base shas plus the timeline, never
observed**, and the one observation pointing the other way depends on a particular reading of the
footer.

**3. The loading channel is UNRESOLVED**: agent-skills selection matched on `description`, versus
ordinary out-of-diff repo-context reading. Both probe skills had identical generic descriptions,
so this probe cannot discriminate; neither can the control arm, which varies location and
instruction-status together. What is observed either way is out-of-diff reach plus directive
compliance. **The cheapest test that would settle it is an arm whose *diff* carries an imperative
to emit a marker** — if that is obeyed, route 2 (obeys imperatives in any file it reads) is live;
if only out-of-diff `SKILL.md` imperatives are obeyed, route 1 gains real support. No arm did
this.

**4. Privileging of the `code-review` name when multiple skills match is NOT established**
(one observation, two confounds).

**5. Scope**: one private repo, one account, three PRs, review effort self-reported "Lite" on all
three, no MCP servers configured. Same generality limits as Gate C.

**6. Execution is out of scope here** and unchanged: both probe skills said "Do not run any
commands", so this probe adds nothing to, and subtracts nothing from, Gate C's EXECUTION FAIL.

---

## CONSEQUENCE

For a project shipping a skill named `devcontainers`:

- **The name is not a barrier.** Copilot code review demonstrably loads and obeys a skill under
  an arbitrary name, from `.github/skills/`, without that skill being part of the PR diff. The
  reach assumption behind the downstream code-review-surface tasks survives; it does not have to
  be renamed to `code-review` to be seen.
- **It still cannot execute there.** Gate C's EXECUTION FAIL stands untouched. Diff-line,
  execution-backed findings on the code-review surface still have to come from
  SARIF-via-Actions, and the skill on that surface remains prose-only.
- **The `.claude/skills/` question is open on this surface.** Everything above was observed with
  the skill at `.github/skills/<name>/SKILL.md`. Shipping only to `.claude/skills/` and assuming
  code review will find it is an inference this evidence does not support.
- **The footer is a conditional signal, not decoration** — worth watching in any future probe,
  but ambiguous between "this file does not exist" and "no skill was loaded".
