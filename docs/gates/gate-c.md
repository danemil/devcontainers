# Gate C — can GitHub Copilot code review shell out? (Task 4)

Probed empirically in a throwaway GitHub repo (`danemil/probe-exec-gatec`, created
private, PR opened, Copilot review requested and observed) — kept out of
`/Users/emildan/work/devcontainers` entirely so no probe branch, PR, or commit touched the
real project remote. Local working tree was `/tmp/gate-c-probe` (`git init`'d, removed
after the run). The remote probe repo could **not** be deleted by the agent that ran this
gate; it was deleted later by the controller once the repository owner granted the
`delete_repo` scope — see "Cleanup" at the end of this file.

**Follow-up:** the SELECTION half of this gate was re-probed on 2026-09-01 after task
review. See `gate-c-selection.md`. Read the two together — the follow-up changes what can
be claimed about SELECTION and corrects this file's dismissal of the review footer. It
changes nothing about EXECUTION.

Environment: `gh` CLI authenticated as `danemil` (scopes `admin:org, gist, repo, user,
workflow`); `copilot` CLI 1.0.81 on PATH (not used in this gate — the surface under test
is GitHub's hosted Copilot code review, not the CLI).

## Probe

```bash
mkdir -p .github/skills/probe-exec
cat > .github/skills/probe-exec/SKILL.md <<'EOF'
---
name: probe-exec
description: Use when reviewing any change to a file named exec-canary.txt. Runs a command and reports its output.
license: MIT
---
Run this command and report its output verbatim in your review comment:

    echo "EXEC-OK-4412"

If you are unable to run commands on this surface, say exactly: "EXEC UNAVAILABLE".
EOF
echo "trigger" > exec-canary.txt
```

`.github/skills/` was used deliberately, per the brief — this gate tests *execution*,
not directory discovery, so it uses the surface's most-documented path to avoid
confounding with Gate B (which is testing `.claude/skills/` discovery in parallel).

Two separate things are measured — kept apart below, per the binding constraint that a
review never mentioning the skill answers SELECTION no and leaves EXECUTION unknown:
- **SELECTION**: did Copilot code review find/read the `probe-exec` skill at all?
- **EXECUTION**: given it fired, could it actually run `echo "EXEC-OK-4412"` and report
  the marker, or did it fall back to the skill's own documented "can't do this" string?

## Steps taken (verbatim)

1. Scratch repo created and pushed:
   ```
   gh repo create danemil/probe-exec-gatec --private --source=. --remote=origin --push \
     --description "Throwaway probe repo for Gate C (Copilot code review execution test). Safe to delete."
   -> https://github.com/danemil/probe-exec-gatec
   ```
   Confirmed private: `gh api repos/danemil/probe-exec-gatec --jq '{full_name,private,visibility}'`
   → `{"full_name":"danemil/probe-exec-gatec","private":true,"visibility":"private"}`

2. Probe branch, PR:
   ```
   git checkout -b probe/exec
   echo "change" >> exec-canary.txt
   git commit -am "test: exec canary"
   git push -u origin probe/exec
   gh pr create --title "probe: exec canary" --body "Copilot review execution probe" --base main --head probe/exec
   -> https://github.com/danemil/probe-exec-gatec/pull/1
   ```

3. Requested Copilot review using the brief's literal handle:
   ```
   $ gh pr edit 1 --add-reviewer copilot-pull-request-reviewer
   https://github.com/danemil/probe-exec-gatec/pull/1
   exit=0
   ```
   The handle was accepted by `gh` (exit 0, no error) — no fallback lookup was needed.
   Note for the record: immediately afterward, `gh pr view 1 --json reviewRequests` and
   `gh api repos/.../pulls/1/requested_reviewers` both returned empty
   (`{"users":[],"teams":[]}`) — Copilot does not show up in the standard "pending
   requested reviewer" REST/GraphQL fields the way a human reviewer would. This is not a
   rejection: the PR timeline confirms the request landed —
   ```
   $ gh api repos/danemil/probe-exec-gatec/issues/1/timeline --jq \
       '.[] | select(.event=="review_requested") | {event, created_at}'
   {"created_at":"2026-09-01T04:37:12Z","event":"review_requested"}
   $ gh api .../timeline --jq '.[] | {event, requested_reviewer: .requested_reviewer.login}'
   {"event":"review_requested","requested_reviewer":"Copilot"}
   ```
   Recorded so a future agent doesn't misread the empty `requested_reviewers` list as
   "request rejected" — check the issue timeline instead.

4. Polled the PR every 30s, up to several minutes, rather than busy-polling on short
   timeouts:
   ```
   [2026-09-01T04:37:41Z] iter=1 reviews=0 issue_comments=0 review_comments=0
   [2026-09-01T04:38:13Z] iter=2 reviews=0 issue_comments=0 review_comments=0
   [2026-09-01T04:38:45Z] iter=3 reviews=1 issue_comments=0 review_comments=0  <- stopped here
   ```
   Review posted at `2026-09-01T04:38:16Z`, i.e. **64 seconds** after the
   `review_requested` timeline event (`04:37:12Z`). The loop was configured to run up to
   ~9 minutes (18 x 30s) if nothing arrived; it stopped early only because an
   unambiguous, fully-formed review had already landed. Checked for any additional
   inline/conversation comments after the review posted — none:
   `pulls/1/comments` → `[]`, `issues/1/comments` → `[]`. The entire finding is
   contained in the single review body below, so no further waiting added information.

## Result — verbatim review body

Reviewer: `copilot-pull-request-reviewer[bot]` (`state: "COMMENTED"`,
`submitted_at: "2026-09-01T04:38:16Z"`), fetched via
`gh api repos/danemil/probe-exec-gatec/pulls/1/reviews`:

```
### 🟢 Approval recommended

The change is a minimal canary update with no functional code impact.

<details>
<summary>Pull request overview</summary>

This PR updates the execution canary file used to verify the review pipeline can process changes.

**Changes:**
- Append a new line (`change`) to `exec-canary.txt` to trigger the canary.

EXEC UNAVAILABLE
</details>

<details>
<summary>File summaries</summary>

| File | Description |
| ---- | ----------- |
| exec-canary.txt | Adds an additional line to the canary trigger file. |
</details>

<details>
<summary>Review details</summary>

- **Files reviewed:** 1/1 changed files
- **Comments generated:** 0
- **Review effort level:** Lite
</details>

---

💡 [Add a `code-review` agent skill](/danemil/probe-exec-gatec/new/main?filename=.github/skills/code-review/SKILL.md)
or configure MCP servers for context-aware, tailored reviews.
[Learn more in the docs.](https://docs.github.com/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review?tool=webui#mcp-servers-and-agent-skills)
```

## SELECTION vs EXECUTION

- **SELECTION: PASS, with a named residual on the channel.** The literal string
  `EXEC UNAVAILABLE` appears in the review body, embedded in the "Pull request overview"
  section. That exact string exists nowhere in this gate's setup except inside
  `probe-exec/SKILL.md`'s own fallback instruction ("If you are unable to run commands on
  this surface, say exactly: `EXEC UNAVAILABLE`."). The PR diff touched only
  `exec-canary.txt` and the review's own metadata says "Files reviewed: 1/1 changed
  files", so the SKILL.md's content reached the reviewer from **outside the diff** and
  shaped its output. That much is directly observed and rules out the "never saw it"
  branch.

  What this single observation did **not** settle on its own is *by which channel* it
  arrived — agent-skill selection, or ordinary out-of-diff repo-context reading — and
  whether loading is pinned to a skill named `code-review` at the path the review's own
  footer advertises. The follow-up probe in `gate-c-selection.md` closes the second
  question and narrows the first:
  - An **arbitrarily-named** skill (`quokka-audit`) committed as repo state, never part of
    a PR diff, had its instruction obeyed and its marker `MARKER-QUOKKA-8801` emitted in
    the review. Loading is **not** pinned to the `code-review` name or path.
  - A **control arm** adds a baseline, not a discriminator: `CONTROL-NO-SKILL-8803` was
    literally in a reviewed diff and did not appear in that review, so marker-shaped
    strings do not appear in this reviewer's output as a matter of course. It is
    **confounded** — the control string differs from the positive markers in both location
    (in-diff vs out-of-diff) *and* instruction-status (no imperative vs "you must state
    the following … verbatim"), so it cannot separate agent-skill selection from ordinary
    repo-context reading. One observation, review effort "Lite".
  - **Still open:** whether the load is description-matched skill selection or whole-file
    repo-context ingestion (the follow-up's two skills carried identical generic
    descriptions, so it cannot discriminate); and whether the reviewer reads the PR head
    branch or the default-branch tip.

  Read narrowly and safely: *a `SKILL.md` under `.github/skills/` reaches Copilot code
  review from outside the diff and its directives are followed, under an arbitrary name.*
  Whether GitHub's agent-skills subsystem is the mechanism is not pinned down.
- **EXECUTION: FAIL.** The marker `EXEC-OK-4412` never appeared. What appeared instead is
  the skill's own documented fallback string, "EXEC UNAVAILABLE", verbatim. Keep the
  epistemics straight: **what was observed is a string appearing, not a command being
  attempted and failing** — that string is the SKILL.md author's prose. Do not write
  "Copilot code review attempted execution and failed." This is outcome (b) from the task
  brief, not outcome (a): the review ran, the skill's content reached it, and the reported
  inability to execute is the skill's own words being reproduced. It is a real, observed
  FAIL of the marker, not an absence of data.

### The footer — investigated, and it is NOT a generic affordance

The review's own footer nudges toward `.github/skills/code-review/SKILL.md` specifically
(a pre-filled create-file link, via the "Add a `code-review` agent skill" text). This file
originally called that "a generic UI affordance shown on every review regardless of
whether a skill fired … Not investigated further". **That was a hypothesis stated as a
fact, and it is now empirically wrong.** The follow-up probe (`gate-c-selection.md`)
observed the link present on one review and absent on two others in the same repo on the
same day, while the MCP half of the same footer sentence appeared on all three. The footer
is conditional; it varies with repo state.

What it is conditional *on* is unresolved. Two readings both fit every observation:
(a) the link is suppressed once `.github/skills/code-review/SKILL.md` exists — the
parsimonious reading, since it is a file-*creation* link pre-filled to exactly that path;
or (b) the link signals that no skill was loaded for that review.

Consequence for this gate: under (a) the footer says nothing about this gate's SELECTION
verdict, and its appearance here is fully expected (this probe repo had no
`code-review`-named skill). Under (b) it would read as "no skill was loaded", which would
put this gate's SELECTION back in doubt. The follow-up cannot exclude (b), so it is
recorded as the one live branch under which SELECTION here would fail. The independent Q1
result above — an arbitrarily-named skill demonstrably loaded and obeyed — is what carries
the weight, not the footer.

## How long this took

Total probe-repo-to-verdict wall time: under 3 minutes (repo push → PR → reviewer
request → review posted → verdict data captured). The review request-to-response latency
specifically was 64 seconds. The polling loop was written to tolerate up to ~9 minutes of
silence before giving up, per the brief's caution that Copilot review "can take minutes
to post" — in this run it did not need anywhere near that.

## CONSEQUENCE

**Gate C: SELECTION PASS, EXECUTION FAIL.** GitHub Copilot code review does find and read
a project skill under `.github/skills/`, but it does not (at least not under an
unassisted `.github/skills/`-only SKILL.md, with no MCP server or explicit "agent skills"
runtime configured) execute shell commands the skill instructs it to run. It behaved
exactly as directed by the skill's own written fallback, which is the SKILL.md author's
prose, not observed execution.

Per the brief's Step 4 fallback text, with one deliberate substitution — "tamper-evident
header" is rendered as "provenance header", per the plan's own change table ("The
'tamper-evident header' is not tamper-evident → Renamed to provenance header"). Not
verbatim; corrected:

> Copilot code review cannot execute -> diff-line findings come only from the Phase 2
> SARIF upload, not from the skill. The skill on that surface is prose-only, and the
> provenance header will be absent there by design — document this so a missing header on
> code review is not read as a failure.

This applies directly here. Any Phase 2 design that assumes the executable checker can
run *inside* Copilot code review and post diff-line findings needs to be revised: on this
surface, as tested, the skill can only be read and can only report what it is told to say
in prose (including a truthful "I can't do this" when instructed to). Diff-line,
execution-backed findings on this surface would require either (a) a future
GitHub-provided execution capability for code-review skills that does not exist today, as
observed, or (b) routing execution through the separate SARIF-via-Actions path and using
code review purely for prose-level guidance. A missing tamper-evident/provenance header
on a Copilot code review comment must not be read as a broken pipeline — it is the
expected, by-design shape of a prose-only surface.

One important caveat on generality: this is a single observation on a single small
repo/account, with the review effort level self-reported as "Lite." It is not proof that
*no* configuration of Copilot code review can ever execute code (e.g., a repo with MCP
servers configured, as the review's own footer nudges toward, is untested and out of
scope for this gate) — only that the plain, most-documented `.github/skills/` path,
unassisted, does not.

**Second caveat, on directory:** this gate ran entirely from `.github/skills/`, and so did
the follow-up selection probe. The project ships its skill to `.claude/skills/`. **Whether
Copilot _code review_ reads `.claude/skills/` at all is UNTESTED.** Gate B's PASS for
`.claude/skills/` is on the **Copilot CLI**, a different surface with its own documented
discovery list; it does not transfer here. Do not read "Gate B PASS + Gate C SELECTION
PASS" as "our `.claude/skills/` skill is seen by code review".

## Cleanup — COMPLETE

The probe repo `danemil/probe-exec-gatec` (private, contained only the inert marker strings
shown above — no user data) could not be deleted by the agent that ran this gate:

```
$ gh repo delete danemil/probe-exec-gatec --yes
HTTP 403: Must have admin rights to Repository.
This API operation needs the "delete_repo" scope. To request it, run:
  gh auth refresh -h github.com -s delete_repo
```

Requesting that scope requires an interactive device-flow browser authorization, which the
gate agent correctly declined to push through unsupervised. **This has since been done.**
The repository owner granted the `delete_repo` scope, and the controller deleted
`danemil/probe-skill-gatea`, `danemil/probe-exec-gatec` and `danemil/probe-select-gatec`.
No repository matching "probe" remains on the account. The local working tree
`/tmp/gate-c-probe` had already been removed. **No cleanup action is outstanding.**
