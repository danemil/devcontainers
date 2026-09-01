# RESUME — dev container agent package

**Written:** 2026-09-01 · **Status:** plan approved by the user, Task 1 complete, Tasks 2+ not started.

## Read these two files, in this order

1. `docs/superpowers/plans/2026-08-31-devcontainer-agent-package.md` — the approved plan. Tasks 1–13.
2. `docs/RESEARCH-BRIEF.md` — the plan's spec. Verified, adversarially fact-checked ground truth
   gathered 2026-08-31. **Do not re-research what is already in here.** Primary sources are cached
   in `docs/sources/` (26 files), including `base.json` (the real `devContainer.base.schema.json`)
   and the five raw research notes (`notes-*.md`) that carry the evidence behind every claim.

`docs/devcontainer-agent-package-explainer.html` is the visual summary of the same material — open
it if you want the shape fast, but the plan and the brief are authoritative.

## What is already done

- **Task 1 — COMPLETE.** `docs/RESEARCH-BRIEF.md`, `docs/sources/` (26 files), `docs/gates/GATE-RESULTS.md`
  skeleton. This was done early and out of order because the brief lived in a session-scoped scratchpad
  that no longer exists. **There is no other copy. Do not delete these.**

## What to do next

Start at **Task 2**. The plan's own Execution Handoff section gives the parallelisation, but in short:

1. **Tasks 2, 3, 4 (Gates A–C) in parallel** — three subagents, no shared state, ~2–3 hours.
2. **Task 5 (Gate D)** as its own task — half a day to a day. The hand-adjudication step cannot be
   delegated to a heuristic without defeating the point.
3. **Tasks 6 and 7 in parallel** (rule corpus, skill body), then a dedicated **citation-verification
   subagent** over Task 6. Nothing merges before that pass.
4. **Task 5b (Gate E)** — the Phase 1 exit criterion. Needs real terminals on all three surfaces.
5. **Tasks 8–11 in parallel** once Gate E passes. Then Tasks 12–13, both conditional.

## Things that will bite you if nobody says them

- **A zero-lift Gate E result ends the project at Rung 1** — twelve facts in `AGENTS.md`, thirty
  minutes, done. That is a **successful outcome**, not a failure. The plan's "The case for doing less"
  section argues it properly. Do not let sunk cost push past this gate.
- **The portable frontmatter set is FIVE keys** — `name`, `description`, `license`, `metadata`,
  `allowed-tools`. We ship four. Omitting `allowed-tools` is a *choice* (its value grammar differs
  between hosts), not a constraint. An earlier draft of the plan said "four keys are the only legal
  set"; that was wrong and is corrected. Do not reintroduce it.
- **`metadata` acceptance on Copilot is UNVERIFIED.** Gate A settles it. If Copilot balks,
  `corpus_version` moves into the body and the shipped set drops to three keys.
- **Never delete a rule; suppress it** with `prompt_include: false`. Rule IDs are a published
  interface once anyone writes a suppression.
- **No generated prose projection of the rule corpus** may land anywhere in the model's context path.
  Four of six council advisors independently refused this. The one exception is Task 11's
  awesome-copilot file, where there is no checker to short-circuit.
- The repo is a **git repo on `main`** with no commits on this work yet. Branch before committing.
- None of `devcontainer`, `hadolint`, `trivy`, `dockle`, `docker scout` is installed on this machine.
  Anything that shells out must `command -v` probe first.

## Codex

The user's global CLAUDE.md says **Codex is user-invoked only**. The plan schedules Codex advisories
at phase boundaries — that is the user's standing instruction *for this plan*, recorded in the
Execution Handoff. Still confirm before the first one. A failed stop-gate is not a finding: check for
`rawOutput: ""` with `touchedFiles: []` before treating a non-zero exit as a review.

Codex's first advisory already changed nine things in the plan; the table at the end of the plan's
Execution Handoff records what changed and the one point that was declined. Do not re-litigate those.
