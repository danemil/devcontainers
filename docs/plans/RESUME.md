# RESUME — dev container agent package

**Written:** 2026-09-01, after execution. **Status:** Phase 1 SHIPPED and merged to `main`.
Supersedes the pre-execution handoff of the same name.

## What happened

The approved plan (`docs/superpowers/plans/2026-08-31-devcontainer-agent-package.md`) was executed
Tasks 1–11. Tasks 12 and 13 did **not** run, and that is the plan working as designed rather than
work left undone: both are conditional on Gate D, which is deferred with an empty corpus.

Shipped, all on `main`:

| Path | What it is |
|---|---|
| `.claude/skills/devcontainers/SKILL.md` | the product. 502 lines, four frontmatter keys, three modes |
| `.../references/rules.md` | twelve cited rules, corpus `0.3.0` |
| `.../references/spec-facts.md` | spec mechanics, loaded in AUTHOR and DEBUG only |
| `README.md` | the decision record — contracts, gate results, the enforcing greps |
| `docs/gates/` | five gates' evidence |
| `docs/VERIFICATION.md` | the firing baseline, taken at commit `8d1f9c6` |
| `upstream/` | the awesome-copilot payload, **written and NOT submitted** |

## What the gates actually established

- **A** — `npx skills add` is the only faithful repo-ref channel. `gh skill install` strips the
  exec bit and injects its own `metadata:` block. **`copilot skill add` has no repo-ref form at
  all** and its file form drops `references/` entirely.
- **B** — `.claude/skills/` is a native Copilot CLI discovery source and `references/` resolves
  from it. **VS Code agent mode was never measured, in any gate.**
- **C** — Copilot code review reads a skill but **cannot execute**. Whether the agent-skills
  subsystem selected it, or it was read as an ordinary repo file, is **unresolved** and recorded
  as such.
- **D** — **deferred, not run.** Its search phase completed (4,176 hits / 4,165 unique blobs /
  4,064 repos, sharded on `size:` into 42 ranges). The corpus is empty. **No false-positive rate
  exists and none may be quoted from those numbers.**
- **E** — the one that mattered. 64 runs. Fired 100% / 80%, lift 6 of 10, and **one harm case**:
  a rule flagged the exact form its own fix prescribes. Traced to a single `or` in one `Detect`.
  Narrowed, re-ran, harm 0 with no true positive lost — measured with two purpose-built probes.

**The finding worth carrying:** the lift concentrates on the **Copilot** surface. On Claude Code
the base model plus a shell already scores 8/10, because it builds real containers and runs the
real CLI to check itself. This package earns its keep precisely where the agent *cannot execute*.
That reframes the upstream PR from "wider reach" to "the surface where this helps".

## Outstanding — two debts, both gating the upstream PR, neither gating anything else

1. **A full ten-task Gate E re-run at corpus `0.3.0`.** The last *full* run was against `0.1.0`;
   round 2 covered five tasks at `0.2.0`; `0.3.0` is unevaluated. Recorded in `README.md`
   under "Outstanding evaluation debt".
2. **Re-run the six `VERIFICATION.md` prompts against the current `SKILL.md`.** A live run
   short-circuited AUDIT's availability conjunct; the fix was prose, and its own author wrote
   "What I can't claim: that this changes Copilot's behaviour." If it still short-circuits, the
   next lever is mechanical, not more prose.

Four upstream submission decisions are open and listed in `README.md`'s `upstream/` section —
chiefly whether the Claude Code rule belongs in GitHub's own catalogue, and whether to mark the
PR title as agent-authored. **Their index is machine-generated; never hand-edit it, and target
`main`, not `staged`.**

## Things that will bite you

- **Never mechanically re-flow `SKILL.md`.** It has been silently damaged four times this way.
  The rule and the measurement behind it are in `README.md`. Budget pressure is resolved by
  moving content into a reference the mode **already loads**, or by accepting the overage.
- **The thirteen-item not-label-storable list is fenced non-movable.** AUDIT's bucket table reads
  it and AUDIT does **not** load `spec-facts.md`.
- **Label-immunity is read off a positive marker, never derived by complement.** Three files got
  this wrong at once. A property with no row in the reference is one the source is *silent* about,
  and silence is not immunity.
- **Severities are provisional** — Gate D never ran. `DC-LIFE-001` ships at ERROR while its own
  `Detect` concedes a project that never prebuilds is not wrong.
- **Feature version pinning has no rule.** Confirmed twice, from opposite directions. The twelve
  rules are not a closed corpus.
- **The repo is private.** The documented install paths need it public *and* merged. Merged is
  done. Publication is undecided, and the README is written so deleting one block quote is the
  whole edit if that changes.
- **`docker scout` IS installed here** — it is a Docker CLI plugin, so `command -v docker-scout`
  fails while `docker scout version` succeeds. See the ERRATA at the end of `docs/RESEARCH-BRIEF.md`.

## Three lessons this project paid for

1. **Enumerations need a mechanical check even when the reasoning has converged.** Reasoning was
   re-derived four times by four parties and agreed; the *lists* needed a reviewer every time.
   A check that a list's members are right does not establish that its membership is closed.
2. **A checker whose count stays flat across an edit that should have moved it is a bug in the
   checker.** Three instrument bugs here all silently *under-matched*, and an under-matching
   checker reports success.
3. **Every verification here checked the corpus was TRUE; none checked it was SAFE TO FOLLOW.**
   A corpus is a set of instructions as well as a set of statements, and `Detect` is the part that
   executes. Only Gate E caught that. Re-running the citation checkers is not sufficient maintenance.
