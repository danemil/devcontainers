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


---
---

# ROUND 2 — targeted re-run against corpus 0.2.0

**Everything above this line is round 1, against corpus `0.1.0`, and is left exactly as it was
written.** The before/after is the evidence that the fix worked, so nothing was overwritten. The
decision at the end of round 1 stands as the decision *round 1* produced; the decision this gate
now produces is at the bottom of this section.

## What changed in the corpus, and what did not

`references/rules.md` moved `0.1.0` → `0.2.0`. Two `Detect` fields were narrowed. Nothing was
added: no new rule, no severity or tier change, no `Quote` or `Source` change.

- **`DC-SEC-001`** now decides on the value, not the key. A `${localEnv:...}` / `${containerEnv:...}`
  reference is not a finding at any severity whatever its key is called, and that exclusion is
  absolute and applied first. Remaining ambiguity resolves directionally: a literal under a
  secret-shaped key is reported unless obviously a placeholder; a literal under a neutral key is
  described rather than raised.
- **`DC-USER-001`** no longer fires on the absence of an optional property. It reports only on
  evidence that the default costs something — a pipeline pinning an `--image-name`, or a `chown`
  / `chmod` / `sudo` ownership workaround in a lifecycle command.

## The question round 2 answers

**Is HARM now zero, and did the narrowing cost any true positive?** Lift was met at 6 of 10 in
round 1 and is not in dispute. Round 2 does not re-open it.

## Method

Identical to round 1: `/tmp/gate-e2` scratch tree, never this repository; fresh session and a
fresh working directory per run; the WITHOUT arm `mv`s the `devcontainers` **directory** to
`/tmp/gate-e2/parked/<runid>` and back; the same five decoy skills (`changelog`, `sql-review`,
`terraform-modules`, `gha-workflows`, `api-docs`) so selection still has to discriminate. Graded
against the labels already in `tasks.md` — **nothing was re-labelled.**

### Re-run set, and why each task is in it

| Task | Reason |
| --- | --- |
| T02 | the harm case — the run that decides the gate |
| T03 | `DC-USER-001` emitted a finding line here in round 1 (`copilot` WITH) |
| T08b | the clean-config control — confirmation nothing moved the wrong way |
| T11 | **new**: `DC-SEC-001` true-positive probe (labels in `tasks.md`, round 2 additions) |
| T12 | **new**: `DC-USER-001` true-positive probe (labels in `tasks.md`, round 2 additions) |

T01, T04, T05, T06, T07, T09 and T10 were not re-run: neither narrowed rule emitted a finding
line on any of them in round 1, and neither narrowing can affect a rule it does not touch.

**20 runs attempted, 20 completed, all exit 0, 0 contamination flags.**

The two new tasks exist because a narrowing's characteristic failure is silencing a *true*
positive, and neither original fixture contained the case each narrowing was most at risk of
losing. T11 adds a low-entropy literal under a secret-shaped key (`"POSTGRES_PASSWORD":
"devpassword123"`, plus the corpus author's own worked example `"DB_PASSWORD": "hunter2"`) —
exactly what a value-based test might fail to recognise as a credential. T12 supplies the
in-repository evidence `DC-USER-001`'s new `Detect` requires: a CI workflow running
`devcontainer build --image-name ghcr.io/acme/web-api-dev:latest --push`.

## Round 2 results

| Task | claude W | claude WO | copilot W | copilot WO | lift | harm |
| --- | --- | --- | --- | --- | --- | --- |
| T02 harm case | CORRECT (fired) | PARTIAL | CORRECT (fired) | CORRECT | **yes** (claude) | **no** |
| T03 `waitFor` | CORRECT (fired) | CORRECT | CORRECT (fired) | PARTIAL | **yes** (copilot) | **no** |
| T08b clean config | CORRECT (fired) | PARTIAL | CORRECT (fired) | PARTIAL | **yes** (both) | **no** |
| T11 low-entropy secret | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | **no** |
| T12 CI pins `--image-name` | CORRECT (fired) | **WRONG** | CORRECT (fired) | **WRONG** | **yes** (both) | **no** |

```
FIRING RATE   claude -p   5/5 = 100%     copilot -p  5/5 = 100%     combined 10/10 = 100%
HARM          0 of 5 tasks, 0 of 20 runs
TRUE POSITIVES LOST   0
```

### HARM is zero — the T02 regression is gone

Round 1, `t02_claude_with`, corpus 0.1.0:

> ```
> DC-SEC-001  [SPEC]  ERROR  .devcontainer/devcontainer.json:6  Literal Stripe secret key in remoteEnv
> DC-SEC-001  [SPEC]  ERROR  .devcontainer/devcontainer.json:5  remoteEnv key matches TOKEN (GITHUB_TOKEN)
> ```

Round 2, `t02_claude_with`, corpus 0.2.0 — same fixture, same prompt, same surface:

> ```
> DC-SEC-001  [SPEC]  ERROR  .devcontainer/devcontainer.json:6  literal credential-shaped value in remoteEnv: STRIPE_API_KEY = "sk_test_51Pfake…"
> ```
>
> Two things I checked and am **not** reporting:
> - **`GITHUB_TOKEN` (line 5) is correct as written.** `${localEnv:GITHUB_TOKEN}` is a
>   substitution reference — the literal never enters the file or the label. This is exactly the
>   form `DC-SEC-001`'s own `Fix` prescribes; flagging it would contradict the rule.
> - **`APP_ENV: "development"` (line 7)** is plainly not a credential.

`t02_copilot_with` reached the same place independently: "`GITHUB_TOKEN` is fine
(`${localEnv:GITHUB_TOKEN}` substitution, never enters the file). `APP_ENV: "development"` is not
a credential."

### `DC-USER-001` now fires exactly once, on the one config with evidence

Across all ten round-2 WITH runs:

| Run | `DC-USER-001` disposition |
| --- | --- |
| t02 claude / t02 copilot | mentioned, **not** a finding |
| t03 claude / t03 copilot | mentioned, **not** a finding |
| t08b claude / t08b copilot | mentioned, **not** a finding |
| t11 claude / t11 copilot | mentioned, **not** a finding |
| **t12 claude / t12 copilot** | **FINDING EMITTED** |

`t02_copilot_with` states the new test back verbatim while declining to fire: "`remoteUser:
vscode` set, `updateRemoteUserUID` unset (correct default). No CI workflow pinning a derived
image, no `chown` workaround present — neither trigger condition applies."

`t08b_claude_with` is the sharpest instance, because T08b's `postCreateCommand` *is* an ownership
workaround of a sort and the model reasoned about it rather than reflexively firing:

> `postCreateCommand` runs `git config --global --add safe.directory ${containerWorkspaceFolder}`.
> This is a workaround for git's dubious-ownership check … `DC-USER-001` reports on an ownership
> workaround in a lifecycle command, but its `Detect` enumerates `chown`, `chmod` and `sudo`
> specifically — `git config safe.directory` is none of those, so this is not a finding under that
> rule. Flagging it because it is adjacent …

It then reported **"Findings: None."** — round 1's PARTIAL on the false-positive control became a
clean CORRECT.

### Finding-line audit — round 2

```
$ grep -H -E 'DC-[A-Z]+-[0-9]+ +\[(SPEC|OPINION)\] +(ERROR|WARN|INFO)' *_with.answer.md
t02_claude_with  | DC-SEC-001  ERROR :6   STRIPE_API_KEY literal
t02_copilot_with | DC-SEC-001  ERROR      STRIPE_API_KEY literal          (table-formatted)
t03_claude_with  | DC-LIFE-002 ERROR :6   waitFor "postAttachCommand"
t03_copilot_with | DC-LIFE-002 ERROR :5   waitFor "postAttachCommand"
t08b_*_with      | (none — "Findings: None.")
t11_claude_with  | DC-SEC-001  ERROR :5   DB_PASSWORD = "hunter2"
t11_claude_with  | DC-SEC-001  ERROR :6   POSTGRES_PASSWORD = "devpassword123"
t11_copilot_with | DC-SEC-001  ERROR :5-6 both password literals
t12_claude_with  | DC-USER-001 WARN  :9   remoteUser set + CI publishes --image-name
t12_copilot_with | DC-USER-001 WARN  :9   same
```

**Round 1: 16 finding lines, 4 false positives (25%). Round 2: 0 false positives.**

## Did the narrowing cost a true positive? No — measured, not assumed

### `DC-SEC-001` still catches a genuine hardcoded credential (T11)

This was the specific risk. Both surfaces, WITH the skill, reported **both** password literals as
`DC-SEC-001 [SPEC] ERROR` — including `hunter2`, the value the corpus author claimed would still
raise. That claim is now an observation rather than a reading:

`t11_claude_with`:

> ```
> DC-SEC-001  [SPEC]  ERROR  .devcontainer/devcontainer.json:5  remoteEnv.DB_PASSWORD is the
>                     literal "hunter2" — a literal value under a secret-shaped key
> DC-SEC-001  [SPEC]  ERROR  .devcontainer/devcontainer.json:6  remoteEnv.POSTGRES_PASSWORD is
>                     the literal "devpassword123" — same
> ```
>
> The rule's own test is value-based, not key-based: a literal under `PASSWORD`/`API_KEY`/`TOKEN`
> is a credential unless it's an obvious placeholder like `changeme`, so a short low-entropy value
> like `hunter2` still counts.

And it drew the line in the right place on the same config, unprompted:

> Two entries are **not** findings, deliberately:
> - `API_SECRET: "${localEnv:API_SECRET}"` (line 7) — the substitution exclusion is absolute …
> - `REPORT_PREFIX: "q3-2026"` (line 8) — a literal that is plainly not a credential.

`t11_copilot_with` matched it, including the exclusion: "`remoteEnv.API_SECRET =
"${localEnv:API_SECRET}"` is NOT a finding — it's a substitution reference, the literal never
enters the file or the label."

So all three judgements the label required landed on both surfaces: the plausible literal
reported, the substitution reference untouched, the neutral literal not raised. **`hunter2` is
recorded as raised — the author's worked check is confirmed by observation.** T11 shows no lift
(the base model flags hardcoded passwords too), which is expected: it is a true-positive probe,
not a lift task.

### `DC-USER-001` still fires when the default actually costs something (T12)

Both surfaces WITH the skill emitted the finding and made the connection the label required.
`t12_claude_with`:

> The rule is explicit that an absent `updateRemoteUserUID` is **not** on its own a defect — it
> fires here only because symptom (1) of its `Detect` is present in the repo:
> `.github/workflows/publish-devcontainer.yml:24` passes `--image-name
> ghcr.io/acme/web-api-dev:latest --push` on a Linux runner. With the default in effect on Linux
> the reference CLI derives a second image … so the tag you publish and the image that actually
> runs can diverge.

Both WITHOUT runs missed it entirely — **zero occurrences of `updateRemoteUserUID`, `-uid image`
or `UID/GID` in either.** `t12_copilot_without` went further and listed "non-root `remoteUser:
node`" under "Good practices already present". T12 is therefore also a clean, attributable lift on
both surfaces: the rule survived the narrowing *and* catches something neither base model does.

## Honest note on control variance

Round 2's WITHOUT arm scored differently from round 1's on all three re-run tasks, in both
directions: T02 claude went CORRECT → PARTIAL (this time it recommended "drop it" for the
`${localEnv:GITHUB_TOKEN}` entry), T03 copilot went CORRECT → PARTIAL (it hedged on `waitFor` and
added a false claim that `javascript-node:1-20-bookworm` "likely doesn't exist"), T08b copilot
went WRONG → PARTIAL. Every cell is n=1 and the control moves.

That variance does **not** touch the question round 2 was run to answer. Harm is a property of the
WITH arm relative to the WITHOUT arm on the *same* fixture, and the specific regression — an
`ERROR` finding against `${localEnv:...}` — is gone on both surfaces and cannot recur, because
the exclusion is now absolute and applied first. Likewise the true-positive result rests on the
WITH arm firing, not on what the control did.

## The decision the rule now produces

```
LIFT = 6 of 10 (round 1, undisputed; round 2 additionally converts T02 from harm to lift,
                and T03 and T12 to lift — so >= 6)
HARM = 0
```

> **Lift >= 3 of 10 tasks and HARM = 0** → Phase 1 ships. Proceed to Task 11.

**Outcome: the gate passes. Phase 1 ships.** Both conditions of the first branch now hold:
lift clears the threshold and harm is zero, measured on the exact task that produced it, on both
surfaces, with the narrowed rules confirmed to still catch what they should.

### Carried forward unchanged

These were open at the end of round 1 and round 2 did not address them:

- **VS Code agent mode is still unmeasured** on every number in this file, both rounds. A human
  must run it: ten fixtures, ten prompts in agent mode, with and without the skill directory.
- **The `.github/instructions/` pointer is still untested.** Task 9 must not assume it works.
- **`references/spec-facts.md` is still absent**, as designed. The degradation clauses fired
  correctly again in round 2.
- **Every per-task cell is n=1**, in both rounds. Read the aggregate.


---
---

# ROUND 3 — full re-run against corpus 0.3.0, the package as it actually ships

**Everything above this line is rounds 1 and 2, against corpora `0.1.0` and `0.2.0`, and is
left exactly as it was written.** The before/after across three rounds is the evidence. The
decision each earlier round produced stands as that round's decision; the decision this gate
now produces is at the bottom of this section.

## Why this round is not "confirm 0.3.0"

**Rounds 1 and 2 both ran against a package where `references/spec-facts.md` did not exist.**
AUTHOR and DEBUG fired their degradation clauses throughout, and both rounds recorded that as a
carried caveat. That file now exists — **724 lines**, checked on disk, loaded by AUTHOR and
DEBUG. This is the first evaluation of the package as it ships.

Everything below is under test, not just the corpus bump:

- **Corpus 0.2.0 → 0.3.0.** `DC-USER-001`'s ownership-workaround enumeration is now **open**
  ("The forms below are examples, not an exhaustive list — read for the intent") rather than
  the closed `chown`/`chmod`/`sudo` list, and it now **explicitly excludes**
  `git config --global --add safe.directory`, the case round 2's clean-config control got right
  by luck rather than by instruction.
- **`references/spec-facts.md` exists** and is loaded by AUTHOR and DEBUG.
- **The tier-tag requirement binds in every mode**, not only inside AUDIT's report format.
- **AUDIT's bucket test became a procedural step**: list the inputs each `Detect` names and mark
  each read or not read *before* picking a bucket.
- **Refusal 3's probe bookkeeping and the `customizations` boundary rule bind in every mode.**
- **Refusal 6 is scoped**: pin versions *you add*; existing unpinned references are not yours
  to change.
- **A `docker scout` row** covers "available but not run".
- **Label-immunity is read off a positive marker**, and `name` joined the not-label-storable
  list, making it thirteen.

## Method

Identical in structure to rounds 1 and 2, with two recorded deviations.

Scratch tree `/tmp/gate-e3`, **never this repository**, containing only per-task fixtures, a
**copy** of `.claude/skills/devcontainers/` (all three files — checksums verified identical
before and after), and five decoy skills. No file from `docs/` in either arm. Fresh working
directory and fresh session per run. The WITHOUT arm `mv`s the `devcontainers` **directory** to
`/tmp/gate-e3/parked/<runid>` and back. Same five decoys as before (`changelog`, `sql-review`,
`terraform-modules`, `gha-workflows`, `api-docs`), so selection still has to discriminate.

**Total skills offered, read off the session-init event rather than assumed:**
`claude -p` **328**; `copilot -p` **149**. (Copilot's 149 matches the number Task 10's later
baseline observed; the claude figure is far larger than round 1's environment, so selection
there is winning against a much bigger candidate set.)

```bash
claude -p "$(cat prompts/<task>.txt)" --output-format stream-json --verbose \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' --permission-mode bypassPermissions
copilot -p "$(cat prompts/<task>.txt)" --allow-all-tools --no-color --disable-builtin-mcps \
  --output-format json --log-level none
```

Claude Code 2.1.257 · GitHub Copilot CLI 1.0.82.

**Deviation 1 — `--disable-builtin-mcps` on the copilot surface, both arms.** This repository is
now public at `github.com/danemil/devcontainers`. Copilot's built-in `github-mcp-server` could
have retrieved `docs/RESEARCH-BRIEF.md` and handed the WITHOUT arm the answers. Disabling it
mirrors round 1's `--strict-mcp-config` on the claude surface, so the two surfaces are now more
comparable rather than less — but it is a difference from rounds 1 and 2 and copilot's firing
rate should not be compared to theirs without noting it.

**Deviation 2 — the T08b fixture was rebuilt with a real lockfile** (`npm install
--package-lock-only`, `npm ci --dry-run` verified), removing the artefact round 2 recorded.

**Contamination: 0 of 48 runs.** Every raw trace was swept for
`Users/emildan/work/devcontainers`, `danemil`, `GATE-RESULTS`, `usefulness` — all empty. Two
runs flagged on `RESEARCH-BRIEF`/`docs/sources`; both traced to the package's own
`spec-facts.md`, whose Sources section names those paths in prose. No run reached the research.

**Scope: the full task set, both arms, both surfaces.** Twelve tasks — the original ten with
T08 replaced by T08b, plus round 2's T11 and T12. **48 runs attempted, 48 completed, all exit 0.**

### Not run, and why — unchanged from rounds 1 and 2

**VS Code agent mode — NOT RUN.** No GUI automation in this environment. It is **not** dropped
from the denominator: the firing rate on VS Code agent mode is **unmeasured at 0.3.0, as at
0.1.0 and 0.2.0**. To close it a human must open each of the twelve fixtures in VS Code with the
skill installed, issue the same prompts in agent mode, and record selection — twenty-four
interactions, plus twenty-four with the skill directory moved aside.

**The `.github/instructions/` pointer sub-experiment — NOT RUN**, same reason. **Whether a
pointer causes the skill to be found remains an open question after three rounds.**

## Round 3 results

`W` = WITH, `WO` = WITHOUT. **Firing is measured off the tool trace, never the answer text.**

| Task | claude W | claude WO | copilot W | copilot WO | lift | harm |
| --- | --- | --- | --- | --- | --- | --- |
| T01 prebuild / `postCreateCommand` | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | no |
| T02 `${localEnv:}` vs literal | CORRECT (fired) | CORRECT | CORRECT (**did not fire**) | CORRECT | — | no |
| T03 `waitFor` enum | CORRECT (fired) | CORRECT | CORRECT (fired) | **WRONG** (confidently) | **yes** (copilot) | no |
| T04 `userEnvProbe` | CORRECT (fired) | PARTIAL | PARTIAL (fired) | PARTIAL | **yes** (claude) | no |
| T05 volume `chown` | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | no |
| T06 `overrideFeatureInstallOrder` | CORRECT (fired) | CORRECT | CORRECT (**did not fire**) | CORRECT | — | no |
| T07 deprecated top-level keys | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | no |
| T08b clean config (FP control) | CORRECT (fired) | PARTIAL | CORRECT (fired) | PARTIAL | **yes** (both) | no |
| T09 Claude Code setup | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | no |
| T10 object-form `postCreateCommand` | CORRECT (fired) | CORRECT | CORRECT (**did not fire**) | CORRECT | — | no |
| T11 low-entropy secret probe | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | no |
| T12 CI pins `--image-name` probe | CORRECT (fired) | **WRONG** | **WRONG** (**did not fire**) | **WRONG** | **yes** (claude) | no |

Correct counts: claude **12/12 W** vs **9/12 WO**. Copilot **10/12 W** vs **9/12 WO**.
Overall **22/24 W** vs **18/24 WO**.

## The three numbers

### FIRING RATE (WITH arm, per surface)

| Surface | Fired | Rate | Round 2 | Round 1 |
| --- | --- | --- | --- | --- |
| `claude -p` | 12 of 12 | **100%** | 100% | 100% |
| `copilot -p` | 8 of 12 | **66.7%** | 100% | 80% |
| VS Code agent mode | not run | **unmeasured** | unmeasured | unmeasured |
| Combined (measured) | 20 of 24 | **83.3%** | 100% | 90% |

**Copilot's firing is the lowest measured in any round, and it is not rounded up.** The four
misses are T02, T06, T10 and T12. Three follow round 1's pattern — review- or question-phrased
prompts on a config it could read directly, answered from the file without consulting anything.
**T12 is new and worse:** it is a probe the skill exists to answer, and the answer was wrong
without it. Copilot answered T02, T06 and T10 correctly anyway, so those misses cost nothing
here; T12's cost the task.

### LIFT

```
LIFT (task-level, pre-registered definition)   = 4 of 12 tasks   (3.3 of 10 normalised)
LIFT attributable to the skill actually firing = 4 of 12         (all four)
LIFT per surface:  claude -p   3 of 12  (T04, T08b, T12)   net +3
                   copilot -p  2 of 12  (T03, T08b)        net +2
```

Every lifting task is attributable — unlike round 1's T05, no improvement this round came from
a run that never invoked the skill. **Lift is now spread across both surfaces** rather than
concentrated on the weaker one, which is a change from rounds 1 and 2: on `claude -p` the base
model answered 9 of 12 unaided and the skill took it to 12; on `copilot -p` it went 9 to 10.

### HARM

```
HARM = 0 tasks
```

No task where WITH was worse than WITHOUT on either surface. The two equal-and-wrong copilot
cells — T04 (PARTIAL/PARTIAL) and T12 (WRONG/WRONG) — are runs where the skill **did not fire**,
so nothing was made worse because nothing was applied.

The round-1 harm cell is still fixed. `t02_claude_with` at 0.3.0 emits one finding — the
`STRIPE_API_KEY` literal — and states the exclusion in its own words: "`${localEnv:GITHUB_TOKEN}`
is exactly the form the rule's own `Fix` prescribes; the substitution exclusion is absolute
regardless of the key name."

### Confidently wrong answers

- **WITHOUT arm — 2.** `t03_copilot_without`: a verification table reading
  "`waitFor: "postAttachCommand"` | ✅ Valid enum value", then "**Nothing is
  structurally/schema invalid.**" `t05_copilot_without`: "rebuilding the container … won't
  rerun `npm ci`".
- **WITH arm where the skill fired — 0.** Third round running.
- **WITH arm where the skill did NOT fire — 2 blanket all-clears.** `t02_copilot_with`: "No
  other security issues found". `t12_copilot_with`: "**No non-root/least-privilege concerns** —
  `remoteUser: node` is fine", over the exact area carrying the defect. Both are the
  green-sounding summary over an unchecked area that refusal 3 exists to prevent, and both
  happened because the refusal was never loaded.

### Finding-line audit

18 formal finding lines across the 20 WITH runs that fired.

| Round | Corpus | Finding lines | False positives |
| --- | --- | --- | --- |
| 1 | 0.1.0 | 16 | 4 (25%) |
| 2 | 0.2.0 | 9 | 0 |
| 3 | 0.3.0 | 18 | **1 (5.6%)**, self-caveated |

The one false positive is `t07_copilot_with` placing `DC-LIFE-001 [SPEC] ERROR` in its Findings
block on a repo with no prebuild evidence, while caveating it inline as "a 'would fire if
prebuilt' note, not a confirmed defect". **No `DC-SEC-001` and no `DC-USER-001` false positive
anywhere in 48 runs.**

## `DC-USER-001` at 0.3.0 — the open enumeration did not over-fire

This was one of the two regressions worth looking for. It did not happen.

`DC-USER-001` emitted a finding line in **exactly one** of the 20 WITH runs that fired —
`t12_claude_with`, the single fixture carrying the evidence its `Detect` requires. It was
raised and explicitly declined in ten others.

`t08b_claude_with` cited the sentence 0.3.0 added, by name, unprompted:

> `postCreateCommand`'s `git config --global --add safe.directory …` is **not** a
> `DC-USER-001 [SPEC]` symptom. That rule's `Detect` names it by name as a step that works
> *around* an ownership mismatch without changing ownership, and excludes it.

Round 2's clean-config control reached the same place by reasoning against a closed list that
happened not to contain the case. At 0.3.0 the rule states it, and the model reads it back.

`t12_claude_with` made the full connection the label requires:

> `DC-USER-001  [SPEC]  WARN  .devcontainer/devcontainer.json:9  remoteUser is set and
> updateRemoteUserUID is unset (defaults to true on Linux), while CI publishes a pinned
> `--image-name` — so the tag you push is not the image that runs.

…citing `.github/workflows/publish-devcontainer.yml:23-24`, `runs-on: ubuntu-latest` as the
Linux precondition, and the derived-image line from `containerFeatures.ts`, with the CI fix.
**All three WITHOUT runs and the one copilot WITH run that did not fire missed it entirely.**

## `spec-facts.md` present — first measurement

**No run reported the file missing.** The degradation clauses that fired visibly in rounds 1 and
2 (`t09_claude_with`: "this skill's `references/spec-facts.md` is **missing from the install**")
did not fire at all; grep across all 48 answers returns nothing.

The second regression worth looking for was whether its presence pulls AUTHOR and DEBUG toward
verbosity or toward asserting mechanics they should route. **Verbosity yes, mildly;
over-assertion no.** AUTHOR/DEBUG WITH answers ran 1.4–2.6× longer than their WITHOUT
counterparts (T04 3762 vs 2681 chars; T09 4743 vs 2517; T10 3225 vs 1274). The added length is
rule citations, the not-checked block and the "which hook I chose and why" the mode is
instructed to produce. No AUTHOR or DEBUG run asserted a default, enum, merge rule or CLI flag
without routing it to a rule or naming a source.

## The availability conjunct — measured, and it is still short-circuiting

This was the second recorded debt. Task 10 observed Copilot filing two Feature rules under
"checked, no finding" **without reading any `devcontainer-feature.json`**. The 0.3.0 fix made
the bucket test a procedural step. Its author wrote plainly: *"What I can't claim: that this
changes Copilot's behaviour."*

**Measured across all 15 AUDIT-mode WITH runs (9 claude, 6 copilot):**

| | claude | copilot |
| --- | --- | --- |
| Performed the procedural step as written — inputs enumerated and marked read / not read before bucketing | **9 of 9** | **0 of 6** |
| Something in "checked, no finding" whose inputs it had not read | **0 of 9** | **4 of 6** (T01, T03, T07, T08b) |
| A Feature rule in "checked, no finding" with no `devcontainer-feature.json` read — the exact Task 10 case | **0 of 9** | **2 of 6** (T03, T08b) |

**It still short-circuits on Copilot. The prose fix did not change Copilot's behaviour, exactly
as its author declined to claim it would.** That is a real finding and it is stated plainly.

The matched pair is decisive — same fixture, same corpus, same prompt:

- `t08b_claude_with` → `DC-FEAT-002` in **not checked**: "github-cli Feature not vendored —
  install.sh not read."
- `t08b_copilot_with` → `DC-FEAT-002` in **checked, no finding**: "`features` is label-immune;
  only one Feature (`github-cli:1`), no duplicate; no CI evidence of rebuild-from-image."
  It never opened the Feature.

The sharpest single instance is `t07_copilot_with`, which contradicts itself inside one report.
Its not-checked block says:

> `not checked   base image metadata label   image not pulled — any absent property here could
> still be supplied by the label at runtime`

…and its tally reads `checked, no finding: 5 … not checked: 0`, with five absence-dependent
rules in the clean bucket.

Claude reconciles the conjunct explicitly on every run, under the literal headings "conjunct 1
failed — an input was never read" and "conjunct 2 failed — the label could still supply what
fires it"; five of its nine AUDIT runs put **zero** rules in "checked, no finding" and said why.

**The next lever is mechanical, not more prose.** Two rounds of wording have now moved Claude
and not Copilot. What would bind is a bucket assignment that must be justified by a named input
the model is made to emit — or a checker that rejects a report whose "checked, no finding" count
exceeds the number of inputs it recorded reading. Nothing in `SKILL.md` can make Copilot execute
a procedure it summarises instead of running.

## The other newly-binding items

**Tier tags outside AUDIT — substantially fixed, one leak.** Across the five non-AUDIT WITH runs,
every rule ID's **first** mention carried its tier (`DC-ENV-001 [SPEC]`, `DC-LIFE-003 [SPEC]`,
`DC-CLAUDE-001 [OPINION]`, `DC-PERF-001 [SPEC]`, `DC-SEC-001 [SPEC]`, `DC-USER-001 [SPEC]`).
**One genuine leak:** `t04_claude_with`'s closing aside — "which `DC-USER-001` detects" — is that
rule's only mention in the answer and carries no tier. Two further untagged mentions are
back-references to rules already tagged earlier in the same answer. Against round 1's "a rule ID
with no tier anywhere", this is a real improvement and not a clean sweep.

**DEBUG prints "not checked" lines — 2 of 3.** Both claude DEBUG runs print the full eight-line
block. `t04_copilot_with` prints one improvised line ("Not checked: I didn't read your actual
devcontainer.json, since none was provided") — not the block, and the line is itself false: one
was provided, and the trace shows it read `rules.md` and never opened the config.

**`customizations.*` boundary — 0 violations in 48 runs.** No run walked into the namespace
looking for unknown properties. T07's top-level `extensions`/`settings` were correctly
identified as the deprecated form and routed to `customizations.vscode.*`.

**The `docker scout` row held — 15 of 15.** Every AUDIT WITH run that printed the block printed
"docker scout available but NOT RUN — image not pulled". Docker was present on this host, so
the "installed but not run" state — the one most easily misread as a pass — was actually
exercised rather than merely documented.

## Honest notes

1. **The T08b fixture was defective again, in a new way.** It was given `forwardPorts: [5432]`
   and `npm run db:seed` with no database service; both WITHOUT runs, on both surfaces,
   correctly observed nothing listens on 5432. That is a true finding about the fixture, not a
   false positive about the config, and following round 2's precedent it is excluded from
   grading on both arms. It is now **two rounds out of three**: building a "nothing to find"
   fixture for an agent with shell access to the whole repository is genuinely hard, and the
   grading criterion keeps narrowing to compensate. **The T08b lift direction is unchanged
   under the strict reading too** — counting the 5432 item makes both WITHOUT arms WRONG rather
   than PARTIAL — so the conclusion does not rest on the call.
2. **T04 claude WITHOUT is the round's most contestable grade, and it is graded PARTIAL.** It
   names `userEnvProbe: "none"` and describes it accurately, but under the heading "makes it
   worse, but isn't the root cause", attributing the failure instead to `nvm` being a shell
   function no env probe can carry. The label's CORRECT bar is naming `userEnvProbe: "none"`
   *as the cause*. **Recorded as a possible label defect rather than acted on:** the claude
   WITH answer makes the same shell-function point as its own Cause 2 while still naming
   `userEnvProbe` as Cause 1, so the two answers do not disagree on mechanics — only on which
   half is "the" cause. Nothing was re-labelled; the label wins, and the disagreement is the
   finding.
3. **Every cell is n=1**, and the control moved in both directions again relative to round 2 —
   T01 claude WO WRONG→CORRECT, T06 copilot WO WRONG→CORRECT, T03 copilot WO PARTIAL→WRONG.
   Read the aggregate.
4. **The control arm is not passive.** `t09_claude_without` built the container with Docker,
   planted a fake `.credentials.json`, and did a true rebuild to prove auth persistence (296 s).
   A base model with a shell and a working Docker daemon is a strong baseline, and that is the
   honest comparison for an agent in a terminal.
5. **One uncontrolled host variable.** `t12_claude_without` reported that a `context-mode`
   PreToolUse hook from the operator's global settings blocked its network access. One run of
   48, in the WITHOUT arm, and its T12 grade turns on an omission rather than on anything it
   could have fetched.

## The decision the rule produces

Against the pre-registered rule at the top of this file:

```
LIFT = 4 of 12 tasks (3.3 of 10 normalised), all 4 attributable   -> clears ">= 3 of 10"
HARM = 0                                                          -> clears "HARM = 0"
```

> **Lift >= 3 of 10 tasks and HARM = 0** → Phase 1 ships.

**Outcome: the package HOLDS at corpus 0.3.0.** Both conditions of the ship branch are met on
the first evaluation of the package as it actually ships, with `references/spec-facts.md`
present, against a full twelve-task set on both automatable surfaces.

Two qualifications, stated rather than used to argue the result away:

1. **Copilot's firing rate fell to 66.7%** — the lowest measured in any round — and one miss
   (T12) is a probe the skill exists to answer, which cost that cell the task. The decision rule
   does not test firing, so this does not change the outcome. But the rule's "lift 1–2 → the
   problem is *selection*" branch was written for exactly this failure mode, and **selection is
   now the weakest number in the gate on that surface.** It is the thing to watch next.
2. **The availability-conjunct short-circuit is unfixed on Copilot**, and this round measured it
   rather than assuming it: 4 of 6 Copilot AUDIT runs, including 2 of the exact Feature-rule
   case. The prose fix moved Claude and not Copilot. The next lever is mechanical.

### Carried forward — still open after three rounds

- **VS Code agent mode is unmeasured** on every number in this file, in all three rounds. A
  human must run it: twelve fixtures, twelve prompts in agent mode, with and without the skill
  directory.
- **The `.github/instructions/` pointer is untested.** Task 9 must not assume it works.
- **Every per-task cell is n=1**, in all three rounds. Read the aggregate.
- **NEW, and the first of these that is a measurement rather than a gap:** the availability
  conjunct short-circuits on Copilot at 0.3.0. Prose has been tried twice. The next attempt
  should be mechanical or the behaviour should be accepted and documented as a known
  surface-dependent limitation.

---

# ROUND 4 — the Inputs lever, against corpus 0.4.0

**Everything above this line is rounds 1, 2 and 3, against corpora `0.1.0`, `0.2.0` and
`0.3.0`, and is left exactly as it was written.** Round 3 closed with a measurement rather than
a gap: the availability conjunct short-circuits on Copilot, prose had been tried twice, and the
next lever had to be mechanical or the behaviour had to be accepted and documented. This round
is that lever, and the round it produced.

## The outcome against the pre-registered criterion, before any interpretation

The criterion, quoted from `task-4-brief.md` without alteration:

> **PASS** iff all of: (a) among copilot AUDIT runs where the skill fired, ≥ 5 of 6 (or the
> equivalent proportion if fewer fire — state the denominator) emit `read:` evidence lines in
> the clean bucket and file **zero** rules as "checked, no finding" whose inputs the trace shows
> unread; (b) claude stays 9 of 9 on both; (c) HARM = 0 against the reused round-3 control;
> (d) the set of rule IDs in finding lines per fixture is identical to round 3's WITH runs on
> the same surface (finding set unchanged by a non-Detect bump) — any difference is reported
> line by line.

```
(a) FAIL (proportional reading; PASS under the literal-count reading)   5 of 7
(b) PASS                                                               9 of 9, 9 of 9
(c) PASS                                                               HARM = 0
(d) FAIL                                                               3 differences, all improving
```

**Outcome: FAIL.** The criterion is a conjunction, and **(d) fails outright**, so the outcome
does not depend on how (a) is resolved. Per the plan's FAIL branch, the residual behaviour is
documented as a surface-dependent limitation and there is no third prose round.

### (a) — the denominator, the count, and the two readings

**Denominator: 7.** Seven Copilot runs fired and produced an AUDIT report (T01, T02, T03, T07,
T08b, T11, T12). More fired than the criterion's 6, not fewer, so the parenthetical's
"if fewer fire" clause does not literally apply.

| Run | Emitted `read:` in the clean bucket | Zero rules clean with unread inputs | Passes (a) |
| --- | --- | --- | --- |
| T01 | vacuous — clean bucket empty | yes | **yes** |
| T02 | vacuous — clean bucket empty | yes | **yes** |
| T03 | vacuous — clean bucket empty | yes | **yes** |
| T07 | **yes** | **no** (`DC-USER-001`) | **no** |
| T08b | vacuous — clean bucket empty | yes | **yes** |
| T11 | **yes** | **no** (`DC-USER-001`) | **no** |
| T12 | vacuous — clean bucket empty | yes | **yes** |

**5 of 7 = 71.4%.** Two readings, both recorded rather than resolved in the package's favour:

1. *Does an empty clean bucket satisfy "emit `read:` evidence lines in the clean bucket"?*
   Read as **yes, vacuously** — the lever's purpose is that nothing is filed clean without named
   evidence, and a run that files nothing clean has violated nothing; round 3 treated Claude's
   five zero-clean-bucket runs as correct behaviour, so this is the reading consistent with the
   prior round. **Under the opposite reading the count is 0 of 7**, because the conjunction
   requires both halves and the only two runs that emit `read:` lines are exactly the two that
   fail the zero-unread-clean half. (a) fails harder, not differently.
2. *With 7 firing rather than 6, is the bar "≥ 5 runs" or "≥ 83.3%"?* Read as **the proportion**,
   because the criterion states a rate and supplies an explicit proportion-adjustment clause, so
   7 firing requires ≥ 6. **5 of 7 fails.** Under the literal-count reading, 5 ≥ 5 and (a) passes.

### (b) — PASS

Claude fired **9 of 9** and was **CORRECT 9 of 9**. Zero rules filed clean with unread inputs,
zero Feature-rule-clean, zero hallucinated evidence, zero confidently-wrong answers.

### (c) — PASS

**HARM = 0** against the reused round-3 control. No task on either surface where round-4 WITH is
worse than round-3 WITHOUT.

### (d) — FAIL

Three rule-ID-set differences on the Copilot surface (T02, T07, T12), reported line by line
below. Claude is unchanged. Two Copilot cells (T01, T03) cannot be compared at all, because
round 3 did not record per-fixture rule IDs for them.

## The criterion itself was not a well-formed test, and that is a finding

Sub-criterion (d) required the finding set to be **identical** to round 3's. It was
pre-registered, it is recorded as failed, and it is **not** rewritten after the fact. But the
defect in it is worth stating, because it is a finding about the criterion rather than about the
package: **a lever whose whole purpose is to make the model read more inputs necessarily changes
what can be found.** Every cell is n=1 with stochastic firing, so a (d) that could pass would be
a (d) in which the lever did nothing. The next round's criterion needs a directional test —
no new false positive, no lost true positive — not an identity test.

## What the lever was

The round-3 fix was a procedural instruction. This one is an output requirement whose content is
copied from the corpus: every rule in `references/rules.md` now carries an `Inputs:` line, and
AUDIT requires each "checked, no finding" tally entry to carry `read:` evidence naming every
input on that line. `tools/check-inputs.mjs` (check 5) derives the not-label-storable list and
the rules' properties at runtime and asserts the coverage rather than trusting a copy.

**No corpus regression is indicated, and it was checked rather than assumed.** The branch's diff
to `references/rules.md` touches `corpus_version`, the twelve `Inputs` lines and the template's
`Inputs` line, and **no `Detect`, `Fix`, `Severity`, `Tier`, `Quote` or `Source` line at all.**
All three Copilot finding-set differences below are improvements: two rules newly found because
the skill fired where it did not before, one round-3 false positive gone.

## What moved, and what did not

**It moved Copilot, and it moved it a lot.**

- The round-3 procedural step went from **0 of 6** Copilot runs to **7 of 7** here.
- The exact Task 10 case — a Feature rule filed "checked, no finding" without opening a
  `devcontainer-feature.json` — went from **2 of 6** to **0 of 7**. It did not occur once.
- Rules filed clean with unread inputs went from **4 of 6 runs** to **2 of 7 runs**, and within
  those two from *no* evidence to *named, trace-corroborated but incomplete* evidence.
- Copilot's `DC-USER-001` probe (T12) — WRONG and unfired in round 3 — fired and was CORRECT,
  and said in its own words that it read the CI workflow "since it directly bears on one rule's
  evidence requirement".
- **Hallucinated evidence, the failure mode this lever could plausibly have introduced: 0 of 18.**

**It did not move it everywhere, and one cell moved backwards.**

- **2 of 7 runs still file `DC-USER-001` into "checked, no finding"** on an evidence line that
  omits `containerUser` and omits the conditionally-required image metadata label — which no run
  in the entire round pulled.
- **T11 is a regression.** It was clean in round 3 — nothing at all in its clean bucket — and it
  is unread-clean now. **On the five fixtures common to both rounds the count is 4 of 5 → 2 of
  5**, not the aggregate's 4 of 6 → 2 of 7. The mechanism matters more than the cell: the
  evidence format gave the model a way to justify a clean-bucket entry, and on this fixture that
  made it willing to file one it had previously declined to file. **An evidence format lowered
  the bar to entry where it was meant to raise it.** That is a genuine cost of the lever and the
  thing a further lever would have to avoid.

## Method

Scratch tree `/tmp/gate-e4`, **never this repository and never the worktree**. Per-task fixtures,
a **copy** of `.claude/skills/devcontainers/` (all three files) and the same five decoys
(`changelog`, `sql-review`, `terraform-modules`, `gha-workflows`, `api-docs`). Fresh working
directory and fresh session per run; the skills are re-copied into each run directory, so no
skill body persists between runs.

**Scope: nine tasks, WITH arm only, both surfaces. 18 runs attempted, 18 completed, all exit 0.**
Copilot wall clock 878 s; claude 1 130 s. Every stderr file is empty.

```bash
claude -p "$(cat prompts/<task>.txt)" --output-format stream-json --verbose \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' --permission-mode bypassPermissions
copilot -p "$(cat prompts/<task>.txt)" --allow-all-tools --no-color --disable-builtin-mcps \
  --output-format json --log-level none
```

Claude Code **2.1.258** · GitHub Copilot CLI **1.0.82**. (Round 3 ran Claude Code 2.1.257; the
patch bump is recorded as an uncontrolled difference, not corrected for.)

**Skills offered, read off the session-init event rather than assumed:** `claude -p` **328**;
`copilot -p` **149** — identical to round 3 on both surfaces, on every run.

**Skill checksums identical before and after the run set** — `SKILL.md`
`4869eee2ebf2b59012e5f2d0f5971b1b6da3b80d`, `rules.md`
`4988d984ebb5fe76225bb7a2f6c7be7f9c3e6c72`, `spec-facts.md`
`33229491320673eeba88ce395f758fe531bb7bc1`. The before-file was archived; **no
`skill-checksums-after.txt` was written** — the after values were recomputed in the shell and
re-verified during the verification pass. Archiving the after-file is the cheap fix for a future
round.

**Contamination: 0 of 18.** Every raw trace swept for `Users/emildan/work/devcontainers`,
`danemil`, `GATE-RESULTS`, `usefulness` — **0 hits on all four**, and 0 on round 3's two benign
secondary strings (`RESEARCH-BRIEF`, `docs/sources`) as well. No run reached the research.

### The round's own weaknesses, disclosed where round 3 disclosed its equivalents

1. **The control is reused and non-contemporaneous.** No WITHOUT run was executed in round 4;
   round 3's WITHOUT cells are the control. This is pre-registered in the task brief, but it
   means HARM is computed against a control that is n=1, from a different day, and from a
   different Claude Code patch version.
2. **Network isolation was weaker than the flags imply, on BOTH surfaces, and on neither surface
   did the flags do the blocking.** `--disable-builtin-mcps` does not disable Copilot's own
   `web_search` / `web_fetch`: `t07_copilot_with` issued one `web_search` and two `web_fetch`
   calls against upstream `devcontainers/images` documentation and **they succeeded** (round 3
   had the same exposure). On the claude surface `t07_claude_with` attempted egress too — a
   `WebFetch` and a `curl` of the MCR tags list — and **both were blocked by the operator's local
   `context-mode` PreToolUse hook**, a plugin unrelated to this experiment, not by
   `--strict-mcp-config --mcp-config '{"mcpServers":{}}'`. Nothing either surface fetched was
   this repository and the sweep is clean, but the honest statement is that the isolation flags
   prevented egress on neither surface.
3. **The claude arm did not run in a clean room.** `--strict-mcp-config` did work — every claude
   trace's init event carries `mcp_servers: []` — but it does not disable hooks, plugins, skills
   or slash commands. All nine claude traces carry eight `SessionStart:startup` hook responses
   injecting `additionalContext`, including an auto-resume block and a full
   `superpowers:using-superpowers` skill body, and name the operator's `context-mode` plugin 87
   times per trace (121 in `t07_claude_with`). None of it mentions dev containers and no run
   acted on the auto-resume instruction; it is almost certainly constant with round 3, which ran
   on the same machine and configuration, so the comparison stands. **But it is not a
   clean-room baseline and is not described as one.**
4. **Four runs tried to escape the scratch tree; all four were blocked.** `t03_copilot_with`,
   `t05_copilot_with`, `t07_copilot_with` and `t10_copilot_with` each issued a root-scoped `find`
   as an early tool call. The Copilot sandbox returned *"Permission denied and could not request
   permission from user"* to all four (`success: false`, `code: "denied"`) and nothing ran.
5. **T05 on Copilot is a firing regression** — it fired in round 3 and did not here. See the
   firing figures below.
6. **Every cell is n=1**, in all four rounds. Read the aggregate.
7. **T08b carries the same known fixture defect as round 3** — `forwardPorts: [3000, 5432]` and
   `npm run db:seed` with no database service. Round 3 excluded repo-level observations about
   the fixture from grading on both arms; round 4 keeps that precedent so the two rounds are
   comparable.
8. **The copilot arm ran first, complete, then claude.**
9. **An operator error during setup, and how it was handled.** The first launch of the copilot
   arm left a detached loop running and a second loop raced it on two run directories. All
   processes were killed, `raw/`, `runs/` and `inventory.txt` were deleted, and the arm was
   restarted from scratch as a single loop. **No output from the raced runs is in this file or
   in the archived traces.**
10. **VS Code agent mode remains unmeasured** and the `.github/instructions/` pointer remains
    untested — in all four rounds.

## Round 4 results

`W` = round-4 WITH. `WO` = round-3 WITHOUT, reused. **Firing is measured off the tool trace,
never the answer text.**

| Task | claude W | claude WO | copilot W | copilot WO | lift | harm |
| --- | --- | --- | --- | --- | --- | --- |
| T01 prebuild / `postCreateCommand` | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | no |
| T02 `${localEnv:}` vs literal | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | no |
| T03 `waitFor` enum | CORRECT (fired) | CORRECT | CORRECT (fired) | **WRONG** | **yes** (copilot) | no |
| T05 volume `chown` | CORRECT (fired) | CORRECT | CORRECT (**did not fire**) | CORRECT | — | no |
| T07 deprecated top-level keys | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | no |
| T08b clean config (FP control) | CORRECT (fired) | PARTIAL | CORRECT (fired) | PARTIAL | **yes** (both) | no |
| T10 object-form `postCreateCommand` | CORRECT (fired) | CORRECT | CORRECT (**did not fire**) | CORRECT | — | no |
| T11 low-entropy secret probe | CORRECT (fired) | CORRECT | CORRECT (fired) | CORRECT | — | no |
| T12 CI pins `--image-name` probe | CORRECT (fired) | **WRONG** | CORRECT (fired) | **WRONG** | **yes** (both) | no |

```
claude   W  9 CORRECT / 0 PARTIAL / 0 WRONG   = 9 of 9 CORRECT
claude   WO 7 CORRECT / 1 PARTIAL / 1 WRONG   = 7 of 9 CORRECT   (PARTIAL T08b, WRONG T12)
copilot  W  9 CORRECT / 0 PARTIAL / 0 WRONG   = 9 of 9 CORRECT
copilot  WO 6 CORRECT / 1 PARTIAL / 2 WRONG   = 6 of 9 CORRECT   (PARTIAL T08b,
                                                                  WRONG T03 and T12)
Overall  W 18 of 18 CORRECT      vs      WO 13 of 18 CORRECT

HARM = 0 tasks. LIFT = 3 of 9 tasks (T03 copilot, T08b both, T12 both), all attributable —
the skill fired in every lifting cell.
```

**T12 is the sharpest change in the round.** In round 3, copilot WITH was WRONG and the skill did
not fire; it never opened `.github/workflows/` and asserted "No non-root/least-privilege concerns
— `remoteUser: node` is fine" over the exact area carrying the defect. In round 4 the skill
fires, the run reads the workflow *because the rule's `Inputs` line told it to*, and it files the
finding.

**Confidently wrong answers in the WITH arm: 0**, on both surfaces, fourth round running. No
blanket all-clear was emitted by any run — including the two Copilot runs that did not fire,
which answered narrowly and made no green-sounding claim over unexamined areas, unlike round 3's
two.

### FIRING RATE (WITH arm, per surface)

| Surface | Round 4 | Round 3 (same nine tasks) |
| --- | --- | --- |
| `claude -p` | 9 of 9 = **100%** | 9 of 9 = 100% |
| `copilot -p` | **7 of 9** | 6 of 9 |
| VS Code agent mode | not run | **unmeasured** |

**The net +1 on Copilot is three changes, not one.** Round 3 fired on T01, T03, T05, T07, T08b
and T11 of this set and missed T02, T10 and T12. **T02 and T12 gained; T05 was lost.** T05 is a
firing regression and the +1 framing hides it. Round 3's whole-set figure was 8 of 12 and is not
comparable to a nine-task round; the matched nine is the figure that is.

## The availability conjunct — measured again, on the same three tables

Denominators: **7 Copilot AUDIT runs where the skill fired** (T01, T02, T03, T07, T08b, T11,
T12) and **9 Claude AUDIT runs where the skill fired** (all nine; T10's claude run declared AUDIT
mode explicitly, scoped to one property, and is counted). T05 and T10 on copilot did not fire and
produced no report, so they are excluded rather than counted as failures. Round 3's denominators
were 9 claude / 6 copilot.

### Table 1 — performed the input-check visibly, before bucketing

Bar, as in round 3: the report shows, per rule, the input-availability judgement that decided the
bucket — the input is named and marked read or not read.

| | claude | copilot |
| --- | --- | --- |
| **Round 4** | **9 of 9** | **7 of 7** |
| Round 3 | 9 of 9 | **0 of 6** |

**This is the row that went from 0 to full.** Every Copilot AUDIT report in round 4 gives a
per-rule reason naming the specific unread input — "github-cli's `devcontainer-feature.json` not
fetched; resolved order not queried", "`waitFor` absent from file; label could supply an invalid
value", "image not pulled". Three of the seven use the `SKILL.md` reconciliation language
verbatim.

Stricter bar, stated because it is the bar the criterion's letter implies — *every* input on
*every* rule's `Inputs` line enumerated and marked: **0 of 7 copilot and 0 of 9 claude.** Both
surfaces give a one-line decisive reason per rule, not a full enumeration. Round 3 scored claude
9 of 9 under the looser bar, so the looser bar is the comparable one and is what the table
reports.

### Table 2 — something in "checked, no finding" whose inputs it had not read

| | claude | copilot |
| --- | --- | --- |
| **Round 4** | **0 of 9** | **2 of 7** (T07, T11) |
| Round 3 | 0 of 9 | **4 of 6** (T01, T03, T07, T08b) |

**Table 2b — the matched subset, and the one cell that moved the wrong way.** The aggregate above
compares different denominators and it conceals a per-cell regression. Five runs are common to
both rounds; T05 fired in round 3 and not in round 4, T02 and T12 the reverse.

| Fixture | Round 3 copilot | Round 4 copilot | Direction |
| --- | --- | --- | --- |
| T01 | **unread-clean** | clean bucket empty | **fixed** |
| T03 | **unread-clean** | clean bucket empty | **fixed** |
| T07 | **unread-clean** (5 rules) | **unread-clean** (1 rule, `DC-USER-001`, with a `read:` line) | improved, not fixed |
| T08b | **unread-clean** (`DC-FEAT-002`) | clean bucket empty | **fixed** |
| T11 | clean — nothing in the clean bucket | **unread-clean** (`DC-USER-001`, with a `read:` line) | **REGRESSED** |

**Matched-subset count: 4 of 5 → 2 of 5.** Three of round 3's four failures are gone outright and
the fourth improved. **T11 moved the wrong way, and it moved the wrong way because of this
lever** — see "What moved, and what did not" above.

### Table 3 — a Feature rule in "checked, no finding" with no `devcontainer-feature.json` read — the exact Task 10 case

| | claude | copilot |
| --- | --- | --- |
| **Round 4** | **0 of 9** | **0 of 7** |
| Round 3 | 0 of 9 | **2 of 6** (T03, T08b) |

**Zero.** The case the lever was built for did not occur. Claude's two clean-bucket entries are
both `DC-FEAT-002` on fixtures that declare no `features` at all (T05, T11), so no Feature
manifest exists to read and the entry says so. Copilot filed Feature rules `not applicable` on
the three fixtures with no `features` key (T02, T03, T11) and `not checked` on the three that
have one — T01, T08b and T12 — naming the unfetched manifest each time.

### Table 4 — hallucinated evidence

A `read: <input> (<where>)` claim with no corresponding read in the tool trace.

| | claude | copilot | total |
| --- | --- | --- | --- |
| Runs emitting a clean-bucket `read:` line | 2 (T05, T11) | 2 (T07, T11) | 4 |
| Individual `read:` inputs claimed | 6 | 8 | 14 |
| **Claims with no matching read in the trace** | **0** | **0** | **0** |

**Hallucinated evidence: 0.** Every claim is backed by a tool call in the same trace.

**No run in the entire round pulled an image or read a `devcontainer.metadata` label** — checked
across all 18 traces for `docker pull`, `docker inspect`, `oras` and `skopeo`. One run probed:
`t12_claude_with` ran `docker info` and `docker image inspect`, was told the image is not present
locally, and did not pull — it said so in its report rather than claiming otherwise. So a claim
to have read the label would have been detectable in every trace, and none was made.

## What is still wrong on Copilot, precisely

Two runs — `t07_copilot_with` and `t11_copilot_with` — file `DC-USER-001` under "checked, no
finding" with a `read:` line. Both lines are honest about what they read. Both are **incomplete
against the rule's own `Inputs` line**, in the same two ways: `containerUser` is not named at
all, and — because `updateRemoteUserUID` and `containerUser` are both absent from the file, so
the conditional label clause holds — the image metadata label is an input for these configs and
was not read. Six lines later the same report says the image was not pulled.

**The matched contrast is exact.** On the same two fixtures, `t07_claude_with` and
`t11_claude_with` file `DC-USER-001` under `not checked` with the reason *"updateRemoteUserUID
and containerUser absent — label not read"*. The residual divergence between the surfaces is now
one rule, one conditional clause, and it is a **partial-enumeration** failure rather than round
3's **no-enumeration** failure. Copilot is now writing evidence lines; it is not yet checking
them against the full `Inputs` list before choosing the bucket.

## Finding-set comparison against round 3's WITH runs

**A limitation first:** round 3 recorded finding-line *counts* in aggregate and named rule IDs
only where they carried a conclusion. Two Copilot cells (T01, T03) have no per-fixture rule ID
recorded in round 3, so for those two the comparison is **unavailable**, not "identical".

**Claude — unchanged.** Every task's rule-ID set matches round 3. Two form differences and no
rule-ID difference: T10 moved from a DEBUG-mode citation to an AUDIT-mode formal finding line,
and T11 emits two `DC-SEC-001` lines where round 3 emitted one.

**Copilot — three differences, all in the improving direction.**

| Task | Round 3 | Round 4 | Difference |
| --- | --- | --- | --- |
| T01 | *(not recorded)* | `DC-LIFE-001` | **comparison unavailable** |
| T02 | none — skill did not fire | `DC-SEC-001` | **DIFFERENT.** Attributable to firing. The added line is the true positive the task exists to test. |
| T03 | *(not recorded)* | `DC-LIFE-002` | **comparison unavailable** |
| T05 | zero formal finding lines (fired) | zero formal finding lines (did not fire) | same empty set, different reason |
| T07 | `DC-DEP-001` + `DC-LIFE-001` | `DC-DEP-001` ×3 | **DIFFERENT.** `DC-LIFE-001` was round 3's single false positive. Round 4 files it `not applicable`, scope condition named. **The false positive is removed.** |
| T08b | none | none | yes |
| T10 | none (did not fire) | none (did not fire) | yes |
| T11 | `DC-SEC-001` | `DC-SEC-001` ×2 | rule ID same; line count differs |
| T12 | none — skill did not fire | `DC-USER-001` | **DIFFERENT.** Attributable to firing. Round 3's copilot cell was WRONG here. |

**Criterion (d) is not met**, and it is not adjusted after the fact.

### Finding-line audit

**20 formal finding lines across the 16 runs that fired** — 9 copilot (T01 1, T02 1, T03 1,
T07 3, T11 2, T12 1) and 11 claude (T01 1, T02 1, T03 1, T05 1, T07 3, T10 1, T11 2, T12 1).
**False positives: 0 of 20.** No `DC-SEC-001` and no `DC-USER-001` false positive anywhere.

| Round | Corpus | Tasks | Firing runs | Finding lines | False positives |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1.0 | 10 | 18 | 16 | 4 (25%) |
| 2 | 0.2.0 | 5 | 10 | 9 | 0 |
| 3 | 0.3.0 | 12 | 20 | 18 | 1 (5.6%), self-caveated |
| **4** | **0.4.0** | **9** | **16** | **20** | **0** |

Rounds are not comparable on the raw line count — the task sets differ — but the false-positive
rate is, and it is zero for the first time on a full-width round.

## Other observations

1. **Copilot's tally arithmetic is unreliable.** `t02_copilot_with` prints `not checked: 8` over
   seven listed rules and `not applicable: 3` over four; `t11_copilot_with` prints `not
   applicable: 3` and reconciles to 4 in the same block; `t07_copilot_with`'s `not checked: 6`
   includes a cross-reference rather than a rule. The *bucket assignments* are sound in every
   case and all reconcile to twelve rules; the *counts* beside them do not. No claude run has
   this defect. A count that must equal the number of listed entries is the cheapest thing a
   further mechanical lever could bind.
2. **The `docker scout` row held — 16 of 16.** Docker was present on this host, so the
   "installed but not run" state was exercised rather than merely documented.
3. **`customizations.*` boundary — 0 violations in 18 runs.**
4. **No run reported `spec-facts.md` missing**, consistent with round 3.
5. **Tier tags:** every rule ID's first mention in every finding line on both surfaces carries
   its tier. No leak observed in this task set.

## The decision this round produces

This round did not re-run the gate's ship rule and does not restate a verdict against it. It was
a nine-task WITH arm measured against a reused control, not the twelve-task two-arm sweep round 3
ran, so **the package's HOLD stands on round 3's evidence.** What round 4 adds to it: **LIFT = 3
of 9 tasks, all attributable, HARM = 0, and 0 false positives among 20 finding lines.** What
round 4 tested is the pre-registered criterion for the Inputs lever, and that criterion is
**FAILED**.

**Applying the plan's FAIL branch:** the residual behaviour is documented as a surface-dependent
limitation in `SKILL.md` and `README.md`, and there is no third prose round. The limitation
recorded is precisely what was observed and no more — **a Copilot AUDIT's "checked, no finding"
entry may omit an input, characteristically the conditional image metadata label and a property
the config does not set, so such an entry is a claim to check against the rule's `Inputs` line
rather than a guarantee.** Round 3's blanket "treat the bucket as unreliable" is **not** the
finding this round supports and is retired: 5 of 7 Copilot runs filed nothing clean at all, and
the exact Feature-rule case that opened this debt did not occur once.

### Carried forward — still open after four rounds

- **VS Code agent mode is unmeasured** on every number in this file, in all four rounds.
- **The `.github/instructions/` pointer is untested.**
- **Every per-task cell is n=1**, and the control is now also non-contemporaneous.
- **A criterion defect, new:** sub-criterion (d) was an identity test on a set the lever was
  designed to change. A future round needs a directional test — no new false positive, no lost
  true positive — not an identity test.
- **Copilot's partial enumeration of `Inputs` lines**, on one rule and one conditional clause.
  Prose has now been tried three times and an output requirement once. The next lever, if there
  is one, binds a count rather than a wording — and must not repeat this round's own cost, where
  giving the model a format for justifying a clean entry made one run willing to file an entry it
  had previously declined to file.
