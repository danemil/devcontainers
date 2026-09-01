# Gate C — can GitHub Copilot code review shell out? (Task 4)

Probed empirically in a throwaway GitHub repo (`danemil/probe-exec-gatec`, created
private, PR opened, Copilot review requested and observed, then deleted per controller
ruling) — kept out of `/Users/emildan/work/devcontainers` entirely so no probe branch,
PR, or commit touched the real project remote. Local working tree was `/tmp/gate-c-probe`
(`git init`'d, removed after the run).

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

- **SELECTION: PASS.** The literal string `EXEC UNAVAILABLE` appears in the review body,
  embedded in the "Pull request overview" section. That exact string exists nowhere in
  this gate's setup except inside `probe-exec/SKILL.md`'s own fallback instruction ("If
  you are unable to run commands on this surface, say exactly: `EXEC UNAVAILABLE`."). Its
  presence in the review is direct evidence the skill was found, read, and its
  instructions were followed at least partially — Copilot code review *did* select and
  parse `probe-exec` from `.github/skills/`.
- **EXECUTION: FAIL.** Copilot did not run `echo "EXEC-OK-4412"` and report the marker.
  It instead executed the skill's own documented fallback branch and reported "EXEC
  UNAVAILABLE" verbatim. This is outcome (b) from the task brief, not outcome (a): the
  review ran, the skill was read, and the skill itself is the one reporting it cannot
  execute — this is a real, observed finding, not an absence of data.

One more data point worth flagging: the review's own footer nudges toward
`.github/skills/code-review/SKILL.md` specifically (a suggested filename/path, via the
"Add a `code-review` agent skill" link) — this looks like a generic UI affordance shown
on every review regardless of whether a skill fired, not evidence that our skill was
ignored (it manifestly was not, given `EXEC UNAVAILABLE` came from it). Not investigated
further since it doesn't change the verdict.

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

Per the brief's Step 4 fallback text, quoted verbatim:

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

## Outstanding cleanup (needs a human)

The probe repo `danemil/probe-exec-gatec` (private, contains only the inert marker
strings shown above — no user data) could **not** be deleted by this agent:

```
$ gh repo delete danemil/probe-exec-gatec --yes
HTTP 403: Must have admin rights to Repository.
This API operation needs the "delete_repo" scope. To request it, run:
  gh auth refresh -h github.com -s delete_repo
```

Requesting that scope requires an interactive device-flow browser authorization
(`gh auth refresh -h github.com -s delete_repo` prints a one-time code and a
`https://github.com/login/device` URL and blocks waiting for a human to approve it in a
browser). This agent started that flow to confirm the shape of the blocker, then
deliberately killed it rather than push an account-scope elevation through
unsupervised — that is a step only `danemil` should approve interactively. **Action
needed:** either run `gh auth refresh -h github.com -s delete_repo` and then
`gh repo delete danemil/probe-exec-gatec --yes`, or delete the repo manually from
https://github.com/danemil/probe-exec-gatec/settings. The local working tree
`/tmp/gate-c-probe` was already removed.
