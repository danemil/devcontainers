# Gate E — blinded usefulness evaluation: results

## Pre-registration

**This section was written before a single run was executed and before any number existed.**
It is copied from `task-5b-gateE-brief.md` Step 4 verbatim in substance, so that the rule
cannot be reverse-engineered from the result.

### The three numbers

```
FIRING RATE = runs where the devcontainers skill engaged / runs in the WITH arm, per surface
LIFT        = correct(WITH) - correct(WITHOUT), per task and overall
HARM        = tasks where WITH was WORSE than WITHOUT (over-flagging, wrong citation,
              a fabricated rule)
```

### The decision rule

- **Lift >= 3 of 10 tasks AND harm = 0** -> Phase 1 ships. Proceed to Task 11.
- **Lift 1-2, or any harm** -> the corpus is not the problem, *selection* or *phrasing* is.
  Rewrite the `description` and the AUDIT-mode instructions and re-run. Do not add rules.
- **Lift 0** -> **stop.** The base model already handles these unaided; the honest answer is
  Rung 1 — twelve facts in `AGENTS.md`, thirty minutes, done. Do not ship a package, do not
  open the upstream PR, and record the result as the most valuable finding of the exercise.

Lift is computed per surface and overall. A task counts toward lift when WITH is strictly
better than WITHOUT on the pre-written label (WRONG -> PARTIAL, WRONG -> CORRECT, or
PARTIAL -> CORRECT) on at least one surface and is not worse on the other.

### Grading independence

Task labels and grading rubric live in `tasks.md`, written first. Runs are graded against
that file, not against what `SKILL.md` says. Where the skill is confidently wrong about
something, the label wins and the disagreement is recorded as a finding.

<!-- RESULTS BELOW THIS LINE WERE WRITTEN AFTER THE RUNS -->

---

## What was actually run

| | |
| --- | --- |
| Date | 2026-09-01 |
| Location | `/tmp/gate-e` — a disposable scratch tree, **not** this repository |
| Surfaces run | `claude -p` (Claude Code 2.1.252), `copilot -p` (GitHub Copilot CLI 1.0.82, model reported as `claude-sonnet-5`) |
| Surfaces not run | VS Code agent mode — see below |
| Runs attempted | 44 |
| Runs completed | 44 (every run exited 0) |
| Contamination checks failed | 0 of 44 |

44 rather than 40: the ten-task set is 40 runs, plus 4 re-runs of the false-positive control
after its fixture was found defective (see "T08 was void — T08b replaces it").

### Invocations

```bash
# WITH
cd /tmp/gate-e/runs/<task>_claude_with
claude -p "$(cat prompts/<task>.txt)" \
  --output-format stream-json --verbose \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --permission-mode bypassPermissions

cd /tmp/gate-e/runs/<task>_copilot_with
copilot -p "$(cat prompts/<task>.txt)" --allow-all-tools --no-color \
  --output-format json --log-level none

# WITHOUT — the directory moves, not the file
mv <rundir>/.claude/skills/devcontainers /tmp/gate-e/parked/<runid>
# ... same invocation ...
mv /tmp/gate-e/parked/<runid> <rundir>/.claude/skills/devcontainers
```

Every run got a **fresh working directory and a fresh session**, so no skill body could persist
into a control run. MCP servers were disabled on the Claude surface in both arms so the two arms
differ in exactly one thing. `--output-format stream-json` / `json` was used solely to read the
tool trace, which is how firing was measured.

Neither surface had the `devcontainer` CLI, `hadolint`, `trivy`, `dockle` or `decolint` on PATH.
Docker was available and running, and two WITHOUT-arm runs used it (see "The control arm was not
passive").

### Not run, and why

**VS Code agent mode — NOT RUN.** There is no GUI automation in this environment; the surface
cannot be driven from a terminal. Two surfaces and 44 runs were done instead of three and 60.
It is not dropped from the denominator: **the firing rate on VS Code agent mode is unmeasured**,
and it is the surface where the skill's discovery path is least certain. To close it a human
must: open each of the ten fixtures in VS Code with the skill installed, issue the same ten
prompts in agent mode, and record whether the `devcontainers` skill is selected — twenty
interactions, plus twenty more with `.claude/skills/devcontainers/` moved aside.

**The `.github/instructions/` pointer sub-experiment — NOT RUN.** It requires VS Code's inline-edit
surface, which is unavailable for the same reason. **Whether a `.github/instructions/` pointer
causes the skill to be found remains an open question. Task 9 must not assume it works.**

---

## Per-task, per-surface, per-condition results

`W` = WITH, `WO` = WITHOUT. `fired` is whether the `devcontainers` skill was actually invoked
(tool trace evidence), recorded independently of correctness.

| Task | claude W | claude WO | copilot W | copilot WO | lift | harm |
| --- | --- | --- | --- | --- | --- | --- |
| T01 prebuild / `postCreateCommand` | CORRECT (fired) | **WRONG** (confidently) | CORRECT (fired) | CORRECT | **yes** (claude) | — |
| T02 `${localEnv:}` vs literal | **PARTIAL** (fired) | CORRECT | CORRECT (fired) | CORRECT | — | **yes** (claude) |
| T03 `waitFor` enum | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | — |
| T04 `userEnvProbe` | CORRECT (fired) | CORRECT | CORRECT (fired) | PARTIAL | **yes** (copilot) | — |
| T05 volume `chown` | CORRECT (fired) | CORRECT | CORRECT (**did not fire**) | PARTIAL | yes\* | — |
| T06 `overrideFeatureInstallOrder` | CORRECT (fired) | CORRECT | CORRECT (fired) | **WRONG** (confidently) | **yes** (copilot) | — |
| T07 deprecated top-level keys | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | — |
| T08b clean config (FP control) | PARTIAL (fired) | PARTIAL | CORRECT (fired) | **WRONG** | **yes** (copilot) | — |
| T09 Claude Code setup | CORRECT (fired) | CORRECT | CORRECT (fired) | PARTIAL | **yes** (copilot) | — |
| T10 object-form `postCreateCommand` | CORRECT (fired) | CORRECT | CORRECT (**did not fire**) | CORRECT | — | — |

\* T05's improvement is **not attributable to the skill**: the WITH run reached the right answer
without ever invoking it. It is counted in the headline number because the metric is defined as
"does having it change the answer", and excluded from the attributable number below.

Correct counts: claude 8/10 WITH vs 8/10 WITHOUT. Copilot 10/10 WITH vs 5/10 WITHOUT.
Overall 18/20 WITH vs 13/20 WITHOUT.

---

## The three numbers

### FIRING RATE (per surface, WITH arm)

| Surface | Fired | Rate |
| --- | --- | --- |
| `claude -p` | 10 of 10 | **100%** |
| `copilot -p` | 8 of 10 | **80%** |
| VS Code agent mode | not run | **unmeasured** |
| Combined (measured surfaces) | 18 of 20 | **90%** |

This is the number the plan warned would disappoint, and it did not. Selection held up against
five plausible decoy skills (`changelog`, `sql-review`, `terraform-modules`, `gha-workflows`,
`api-docs`), including two deliberately adjacent ones. Copilot's two misses are both
review-phrased prompts on configs it could read directly — T05 ("Anything in there that will
bite us at runtime?") and T10 ("Will those three entries run in the order I listed them?") —
where it answered from the file without consulting anything. Both answers happened to be right,
so the miss cost nothing here; it is still a 20% chance of the corpus not being consulted on the
surface where it fires less reliably.

### LIFT

```
LIFT (task-level, pre-registered definition)   = 6 of 10
LIFT attributable to the skill actually firing = 5 of 10
LIFT per surface:  claude -p  1 of 10 (net 0: +T01, -T02)
                   copilot -p 5 of 10 (net +5)
```

Lift is real but it is **almost entirely on the weaker surface**. On `claude -p` the base model
already answered 8 of 10 correctly unaided; the skill converted one WRONG to CORRECT (T01) and
turned one CORRECT into a PARTIAL (T02), netting zero. On `copilot -p` the base model answered
5 of 10 and the skill took it to 10 of 10.

### HARM

```
HARM = 1 task (T02, on claude -p)
```

Plus a systematic pattern that HARM as defined does not fully capture. Across the 20 WITH runs,
the skill emitted **16 formal finding lines**. Four of them were false positives, and all four
come from just two rules:

| Run | Finding line emitted | Why it is a false positive |
| --- | --- | --- |
| `t02_claude_with` | `DC-SEC-001 [SPEC] ERROR :5 remoteEnv key matches TOKEN (GITHUB_TOKEN)` | The value is `${localEnv:GITHUB_TOKEN}` — the exact form `DC-SEC-001`'s own `Fix` field prescribes. The rule flags its own remedy. |
| `t02_copilot_with` | `DC-USER-001 [SPEC] WARN :9 remoteUser is set ("vscode") and updateRemoteUserUID is not set` | Nothing is wrong. The rule's own `Fix` says to leave it on locally. The prompt asked for security problems. |
| `t03_copilot_with` | `DC-USER-001 [SPEC] WARN :7 remoteUser is set ("node") with updateRemoteUserUID left unset` | Same. |
| `t08b_claude_with` | `DC-USER-001 [SPEC] WARN :10 "remoteUser": "node" is set and "updateRemoteUserUID" is absent` | Same, and emitted against the **false-positive control** — the one config in the set with nothing to fix. |

**4 of 16 emitted findings (25%) were false positives, and 100% of them came from `DC-SEC-001`'s
key-name clause and `DC-USER-001`.** `DC-USER-001` fires on the absence of an optional property
whenever `remoteUser` is set, which is nearly every real config, and the AUDIT report format then
promotes that to a `[SPEC] WARN` finding line. Ten of the sixteen finding lines were correct and
useful; the noise is concentrated, not diffuse.

### Confidently wrong answers

Three, **all of them in the WITHOUT arm, none in the WITH arm**:

- `t01_claude_without` — "Codespaces prebuilds run `onCreateCommand`, `updateContentCommand`, and
  `postCreateCommand` … So your work *is* getting prebuilt today." That is false, and it is stated
  as the premise of the whole answer.
- `t06_copilot_without` — "**Yes, it will work.** … appdeps … will install before `node` and
  `github-cli`, regardless of any `installsAfter`/`dependsOn` metadata those features might
  declare." False, and self-contradicting: the next paragraph concedes a hard `dependsOn` would
  take precedence, then asserts "In your case there's no such conflict" about a Feature whose
  `devcontainer-feature.json` declares exactly that `dependsOn`.
- `t08b_copilot_without` — invents a "lifecycle-hook ordering bug" on the clean config and calls it
  "the one substantive problem worth fixing".

This is the clearest single result in the gate: **the skill did not produce a confidently wrong
answer on any task, and the base model produced three.**

---

## T08 was void — T08b replaces it

The original T08 fixture was an idiomatic `devcontainer.json` in a repo that contained only a
`README.md`. Both arms, on both surfaces, correctly observed that `npm ci` and `npm run db:seed`
cannot succeed against a repo with no `package.json` — a true finding about the fixture, not a
false positive about the config. The control could not measure what it was built to measure, so it
was rebuilt (T08b: real `package.json`, lockfile, `tsconfig.json`, a source file, Node 22 rather
than an EOL Node 20, `editor.defaultFormatter` set) and re-run on all four cells. **T08's numbers
are void and are not in any total above; T08b's are.**

This is worth recording as a method finding: **it is very hard to build a "nothing to find"
fixture for an agent that has shell access to the whole repository.** Even T08b's hand-written
lockfile was caught as out-of-sync by `t08b_claude_without`, which ran `npm ci` to check. T08b is
therefore graded on a narrower, stated criterion — *did the answer report a defect in
`devcontainer.json` itself that is not one* — and repo-level observations are not counted against
either arm.

## The control arm was not passive

Two WITHOUT-arm runs did substantially more work than reading the file, and it changed their
answers:

- `t05_claude_without` (184s) built a real container with Docker, reproduced the `EACCES` on the
  root-owned volume verbatim, and confirmed the `chown` fixes it.
- `t06_claude_without` (284s) installed the `devcontainer` CLI via `npx`, ran the real dependency
  resolution, printed the actual round order, then removed the `dependsOn` edge and watched the
  build fail with `npm: not found` to prove the point.

Both produced CORRECT answers, and both are part of why `claude -p` shows no net lift. A control
arm with a shell and a working Docker daemon is a much stronger baseline than a control arm that
can only read. That is the honest comparison for an agent-in-a-terminal, and it should not be
softened: **on `claude -p`, the base model plus a shell already answers 8 of these 10 questions
correctly.**

---

## Verbatim output — the two decisive runs

### 1. T01, `claude -p`, WITHOUT — the base model, confidently wrong

The core claim, quoted exactly:

> ## Hook placement: mostly wrong slot, one real consequence
>
> Codespaces prebuilds run `onCreateCommand`, `updateContentCommand`, and `postCreateCommand`;
> `postStartCommand` and `postAttachCommand` run on every start and are never prebuilt. So your
> work *is* getting prebuilt today — it's not defeating the prebuild. The problem is that all
> three concerns are collapsed into `postCreateCommand`, and one of them cares:
>
> **Stale-prebuild drift.** When a codespace is created from a prebuild that's behind the branch
> tip, Codespaces pulls the newer commits into the container but does **not** re-run
> `onCreateCommand`/`postCreateCommand` — their results come from the snapshot.

It then recommends moving the work to `updateContentCommand` — the right destination, reached
through a false mechanism, with the actual defect ("none of this is baked") explicitly denied.

### 1b. T01, `claude -p`, WITH — the same question, skill fired

> ```
> DC-LIFE-001  [SPEC]  ERROR  .devcontainer/devcontainer.json:8  all three setup steps
>              (npm ci, pip install -r requirements-dev.txt, npm run build) sit in
>              postCreateCommand, while onCreateCommand and updateContentCommand are absent
> ```
>
> Direct answer to your question: **no, the setup work is in the wrong hook.** GitHub's prebuild
> documentation states a prebuild performs setup "up to and including any `onCreateCommand` and
> `updateContentCommand` commands in the `devcontainer.json` file. No `postCreateCommand` commands
> are run during the creation of a prebuild." So your prebuild bakes the image, the Features and
> the GitHub CLI — and then bakes none of your `npm ci`, `pip install` or `npm run build`.

It also correctly applied the rule's scope clause, unprompted:

> One severity caveat the corpus states about itself: severities are provisional, and
> `DC-LIFE-001` is the known candidate for demotion to `INFO` — *because* it fires on projects
> that never use prebuilds and are therefore correct. That mitigation does not apply to you; you
> told me you prebuild.

### 2. T02, `claude -p` — the harm, WITH vs WITHOUT

**WITH** (skill fired), findings block quoted exactly:

> ## Findings
>
> ```
> DC-SEC-001  [SPEC]  ERROR  .devcontainer/devcontainer.json:6  Literal Stripe secret key in remoteEnv
> DC-SEC-001  [SPEC]  ERROR  .devcontainer/devcontainer.json:5  remoteEnv key matches TOKEN (GITHUB_TOKEN)
> ```

Line 5 is `"GITHUB_TOKEN": "${localEnv:GITHUB_TOKEN}"`. The narrative afterwards does soften it —
"the value is a `${localEnv:GITHUB_TOKEN}` reference, so no literal is committed … Reasonable if
deliberate" — but the emitted artefact is an `ERROR`-severity finding line against the construct
the rule's own `Fix` field tells you to use, in a report format whose own instructions say "A
finding with no rule ID is not a finding", i.e. the finding lines are the actionable output.

**WITHOUT** (same task, same surface, no skill) got this right and said so under its own heading:

> ## What's already right
>
> `remoteEnv` (not `containerEnv`) is the correct choice — the values are scoped to the remote
> user's processes rather than baked into the container environment. And `remoteUser: vscode`
> keeps you off root.

Its `GITHUB_TOKEN` remark is about the *credential*, not the config: "the config is fine, the
credential behind it may not be."

The skill made a correct answer worse. The cause is a single clause in `DC-SEC-001`'s `Detect`:

> Flag any `remoteEnv` or `containerEnv` entry whose key matches `TOKEN`, `SECRET`, `KEY`,
> `PASSWORD`, `PASSWD`, `CREDENTIAL`, `_PAT`, **or** whose value is a literal rather than a
> `${localEnv:NAME}` reference.

Read literally, that `or` makes `GITHUB_TOKEN: ${localEnv:GITHUB_TOKEN}` a finding on the key
name alone. The model followed the rule correctly; the rule is wrong.

---

## The decision the rule produces

Against the pre-registered rule at the top of this file:

```
LIFT = 6 of 10 tasks (5 attributable)   -> clears the ">= 3 of 10" threshold
HARM = 1 task                           -> does NOT clear "HARM = 0"
```

Both conditions of the first branch must hold. They do not. The rule therefore lands on:

> **Lift 1–2, or any HARM** → the corpus is not the problem, *selection* or *phrasing* is.
> Rewrite the `description` and the AUDIT-mode instructions and re-run. **Do not add rules.**

**Outcome: Phase 1 does not ship on this evidence. Re-run the gate after fixing the
over-flagging. Do not add rules, and do not open the upstream PR yet.**

Two qualifications, stated rather than used to argue the result away:

1. **The branch's own diagnosis is half right for this data.** Selection is *not* the problem —
   firing was 100% / 80%, better than the plan expected. Phrasing is a real problem, but the
   phrasing at fault is inside two rules' `Detect` fields, not in the `description` or the
   AUDIT-mode instructions. Narrowing an over-broad `Detect` is not "adding rules"; the
   prohibition is against growing the corpus, and nothing here argues for growing it.
2. **This is emphatically not the Lift-0 branch.** The skill produced measurable, mechanism-level
   improvement on five tasks, and it was the only condition that produced zero confidently wrong
   answers. Rung 1 — twelve facts in `AGENTS.md` — is *not* indicated by this data.

### The smallest change that would clear the gate

Two edits, both narrowing, neither adding:

1. **`DC-SEC-001` `Detect`** — make the key-name match a *necessary but not sufficient* condition.
   A `remoteEnv`/`containerEnv` entry whose value is already a `${localEnv:NAME}` reference is not
   a finding, whatever its key is called. At most it is an `Observations` line noting that the
   label records the reference.
2. **`DC-USER-001`** — it fires on the *absence* of an optional property whenever `remoteUser` is
   set, which is nearly every config, and the default it warns about is the behaviour the rule
   itself recommends keeping. It should not emit a finding line on a config with no symptom.
   Either scope its `Detect` to configs that publish or pin `--image-name` (where the derived
   `…-uid` image actually costs something), or demote it out of the findings block entirely.

Then re-run this gate. If harm reaches 0 with lift holding, Phase 1 ships.

### Also carried forward

- **VS Code agent mode is unmeasured** on every number in this file. A human must run it.
- **The `.github/instructions/` pointer is untested.** Task 9 must not assume it works.
- **`references/spec-facts.md` was absent, as designed.** The degradation clauses fired correctly
  and visibly: `t09_claude_with` opened with "this skill's `references/spec-facts.md` is **missing
  from the install** … so I worked in the narrowed AUTHOR mode — every property I added is backed
  by a source I actually read rather than by recall", and `t09_copilot_with` said the same. AUTHOR
  and DEBUG both degraded gracefully rather than inventing content. **T09 still came out CORRECT
  on both surfaces WITH**, reaching `DC-CLAUDE-001`'s content from `rules.md` even though AUTHOR
  mode does not instruct loading it.
- **One-run-per-cell means every per-task result is n=1.** T05 is the visible proof: the copilot
  WITH run improved on the WITHOUT run while never invoking the skill. Read the aggregate,
  not the individual cells.

