# RESUME — dev container agent package

**Written:** 2026-09-01, after execution. **Status:** Phase 1 SHIPPED, merged to `main`, and
**the repository is PUBLIC** — https://github.com/danemil/devcontainers. Corpus `0.3.0`,
package `0.1.0`. Supersedes the pre-execution handoff of the same name.

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

## Both recorded debts are now CLOSED — one of them negatively

**Gate E round 3 ran in full at corpus `0.3.0`** and the package **HOLDS**: 48 runs of 48
attempted, contamination 0/48, twelve tasks x two surfaces x two arms. Lift 4 of 12 — 3.3 of 10
normalised, all attributable — with **harm 0**, and false positives among emitted finding lines
down to 1 of 18 from 25% at `0.1.0`. It was the **first evaluation of the package as it actually
ships**: rounds 1 and 2 both ran with `spec-facts.md` absent, and no degradation clause fired in
round 3.

**The second debt closed with a NO, and this is the live finding.** AUDIT's availability conjunct
**still short-circuits on Copilot**. Across 15 AUDIT runs: `claude` performed the procedural step
9/9 and filed nothing unread as clean; **`copilot` 0/6, filing 4 of 6 rules into "checked, no
finding" whose inputs it had never read.** The matched pair on T08b isolates the surface as the
variable — same fixture, same corpus, same prompt. That fix was prose, and its author wrote at the
time that he could not claim it would change Copilot's behaviour. It did not.
**Treat a Copilot AUDIT's "checked, no finding" bucket as unreliable, and note the next lever is
mechanical rather than more prose.**

## What is actually left

1. **A mechanical lever for the Copilot bucketing short-circuit.** The only finding here that
   prose has demonstrably failed to close, measured across 15 runs. Prior candidate, declined at
   the time for lack of evidence and now arguably earned: a `label-sensitivity: presence|absence`
   line per `Detect` in `rules.md`, making bucketing mechanical rather than inferential. It was
   declined on the explicit condition "reach for it if models are observed mis-bucketing" — they
   now have been, twice. Weigh it against pushing an audit-time reporting concern into a corpus
   that has so far only stated what is true.
2. **The upstream `github/awesome-copilot` PR.** Payload written at `upstream/`, **not submitted**,
   sidecar declares the generating corpus version. Four decisions are the owner's, listed in
   `README.md`'s `upstream/` section. Note the finding above bears on it: the payload targets the
   Copilot surface, which is exactly where the audit bucket is unreliable.
3. **Optional, all documented, none blocking:** Copilot's firing rate is **66.7%**, its lowest of
   three rounds, with one miss on a probe the skill exists to answer — the number to watch.
   Feature version pinning still has no rule. Gate D is still deferred, so Phase 2 (Tasks 12-13)
   still does not run.

## A constraint that did not exist before publication

**Any future Gate E run must disable network-reachable tooling in BOTH arms, and must say which.**
The repository is public now, so a control-arm model can reach `RESEARCH-BRIEF.md`, the cached
sources and every gate result **over the network** — the exact contamination the scratch-repo rule
prevents, by a path that rule never covered. Round 3 used `--disable-builtin-mcps` on copilot in
both arms. **A control that can search the web for this repository is not a control**, and a run
that was clean but cannot say why is not reusable evidence. "Unaided" in the quarterly cadence now
means network-unaided.

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
- **Never add a count to prose that neither a check nor its own list can verify.** A list here
  silently went from twelve items to thirteen. "Twelve rules" is stated only because grep 2 prints
  it and would stop before anyone reached the prose.
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
