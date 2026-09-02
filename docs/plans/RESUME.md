# RESUME — dev container agent package

**Written:** 2026-09-02, after Gate E round 4. **Status:** Phase 1 SHIPPED and **the repository is
PUBLIC** — https://github.com/danemil/devcontainers. **Corpus `0.4.0`, package `0.1.0`, on branch
`inputs-lever` — NOT pushed and NOT merged.** `main` is still at corpus `0.3.0`. Supersedes the
post-execution handoff of the same name.

**Where the work is.** Worktree `/Users/emildan/work/devcontainers-inputs-lever`, branch
`inputs-lever` off `main`. Its commits, oldest first:

```
docs: plan the Inputs lever for the Copilot bucketing short-circuit
feat(corpus): add Inputs field per rule and the check that derives its label entries
fix(corpus): correct two Inputs lines against their own Detect and the label list
feat(skill): AUDIT copies each rule's Inputs line and justifies the clean bucket
fix(skill): align the post-tally paragraph with the Inputs lever; pin <where>
chore(corpus): bump to 0.4.0; regenerate upstream; document check 5
fix(upstream): drop a false count from the payload's framing paragraph
test: gate E round 4 at 0.4.0 — the lever moved Copilot and failed its own criterion
docs: bring the decision record current through round 4
```

**A peer session merged a separate branch into local `main`, and that merge is also unpushed.**
`main` now carries `refactor/harness-consolidation`. **Merging `inputs-lever` will hit four known
collisions, none of them textual conflicts in the same lines:**

1. **Five host instruction files became symlinks to `AGENTS.md`** — `CLAUDE.md`, `GEMINI.md`,
   `QODER.md`, `.windsurfrules` and `.kiro/steering/code-review-graph.md`. The "keep seven files
   byte-identical, `md5 -q` prints one hash" rule this branch worked under is superseded by one
   real file plus symlinks. Do not re-materialise them.
2. **The inline check loop became `tools/check-skill.sh`**, whose `RULE_FIELDS` array reads
   `(Severity Tier Source Quote Verified Detect Fix)`. **`Inputs` must be added to it**, or the
   per-rule field check silently stops covering the field this branch added.
3. **`.github/workflows/checks.yml` needs a step for `tools/check-inputs.mjs`.** CI on `main`
   runs `tools/check-skill.sh`, shell and node syntax, and the tool tests — the Inputs coverage
   check is not among them.
4. **The harness numbers this check 7, not 5.** `check-skill.sh` already has checks 1–6;
   `README.md` on this branch calls the Inputs coverage check "check 5" because the README's own
   numbering has 4 as the upstream-currency grep pair. Reconcile the numbering when folding
   `check-inputs.mjs` into `check-skill.sh`, and fix the README reference in the same commit.

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

## Both recorded debts are CLOSED, and the second one now has an answer too

**Gate E round 3 ran in full at corpus `0.3.0`** and the package **HOLDS**: 48 runs of 48
attempted, contamination 0/48, twelve tasks x two surfaces x two arms. Lift 4 of 12 — 3.3 of 10
normalised, all attributable — with **harm 0**, and false positives among emitted finding lines
down to 1 of 18 from 25% at `0.1.0`. It was the **first evaluation of the package as it actually
ships**: rounds 1 and 2 both ran with `spec-facts.md` absent, and no degradation clause fired in
round 3.

**The second debt closed with a NO at `0.3.0`.** AUDIT's availability conjunct short-circuited on
Copilot. Across 15 AUDIT runs: `claude` performed the procedural step 9/9 and filed nothing unread
as clean; **`copilot` 0/6, filing 4 of 6 rules into "checked, no finding" whose inputs it had never
read.** The matched pair on T08b isolates the surface as the variable. That fix was prose, and its
author wrote at the time that he could not claim it would change Copilot's behaviour. It did not,
and round 3 concluded the next lever had to be mechanical.

**Gate E round 4 ran that lever at `0.4.0`, and it FAILED its own pre-registered criterion while
moving the behaviour a long way.** 18 runs of 18, contamination 0/18, nine tasks × two surfaces,
WITH arm only against round 3's reused control. The criterion is a conjunction: (b) and (c) pass,
(a) fails on the proportional reading its own wording implies, **(d) fails outright**, so the
outcome does not turn on how (a) is read.

- **Moved:** the input-check went **0 of 6 → 7 of 7** copilot runs; the exact Task 10 Feature case
  went **2 of 6 → 0 of 7** and did not occur once; hallucinated `read:` evidence **0 of 18**;
  false positives **0 of 20** finding lines; HARM 0; claude 9/9 fired and 9/9 correct; copilot
  9/9 correct.
- **Did not move, and one cell went backwards:** **2 of 7** copilot runs still file `DC-USER-001`
  into the clean bucket on an evidence line that omits `containerUser` and the conditionally
  required image metadata label, and **T11 REGRESSED** — its clean bucket was empty in round 3 and
  carries an unread-clean entry now, because the evidence format gave the model a way to justify
  an entry it had previously declined to file. **On the five fixtures common to both rounds:
  4 of 5 → 2 of 5.**
- **The criterion itself was defective and is recorded as failed rather than rewritten.**
  Sub-criterion (d) demanded a finding set identical to round 3's — an identity test on exactly
  what the lever was built to change.
- **What ships is a limitation, not a fix.** Round 3's blanket "treat the bucket as unreliable" is
  **RETIRED** — round 4 contradicts it. The note now in `SKILL.md` and `README.md`: **a Copilot
  AUDIT's "checked, no finding" entry may omit an input, characteristically the conditional image
  metadata label and a property the config does not set, so read it as a claim to check against
  the rule's `Inputs` line rather than a guarantee.** Per the plan's FAIL branch there is no third
  prose round.

## What is actually left

1. **Land `inputs-lever`.** The branch is complete and unpushed. Merging it means resolving the
   four collisions listed at the top of this file — the symlinked host files, `RULE_FIELDS`
   needing `Inputs`, a CI step for `tools/check-inputs.mjs`, and the check numbering — and then
   pushing `main`, which currently carries a peer session's unpushed merge as well.
2. **The upstream `github/awesome-copilot` PR — still the owner's to open.** The payload is
   written at `upstream/awesome-copilot-devcontainers.instructions.md` and was regenerated for
   `0.4.0`; `upstream/.generated-from` is the authority on its currency, not any prose. **Nothing
   has been submitted, no PR exists, and no outcome is recorded.** What it needs from the owner,
   all in `README.md`'s `upstream/` section: the decision to open it at all; running their
   `npm start` generator and committing what it produces, because a GitHub Action fails the PR if
   the generator would change anything and the original brief's "update the index by hand" is
   wrong; targeting `main` rather than `staged`, which "may be outright rejected"; and the call on
   whether to append `🤖🤖🤖` to the PR title, which their CONTRIBUTING asks of an AI agent and
   which depends on who presses the button. Note also that `npm install` in their repository runs
   third-party install scripts on the machine that opens the PR. The round-4 finding bears on the
   payload: it targets the Copilot surface, which is where the audit bucket's residual sits.
3. **A further lever for the Copilot bucketing residual — only if it is worth it.** Prose has been
   tried twice and an output requirement once. The residual is now **one rule and one conditional
   clause** — a partial-enumeration failure, not the no-enumeration failure of round 3. The
   cheapest remaining mechanical target, from round 4's own observations: **Copilot's tally
   arithmetic is unreliable** (counts beside the buckets disagree with the entries listed, on
   three runs; the assignments themselves are sound and all reconcile to twelve), so a count that
   must equal the number of listed entries is the smallest thing that could be bound. **Weigh it
   against round 4's own cost:** giving the model a format for justifying a clean entry made one
   run willing to file an entry it had previously declined to file.
4. **A directional criterion for the next round.** Round 4's sub-criterion (d) was an identity
   test on a finding set the lever was designed to change. Replace it with "no new false positive,
   no lost true positive" before running anything else.
5. **Optional, all documented, none blocking:** VS Code agent mode is unmeasured in all four
   rounds and the `.github/instructions/` pointer is still untested. Copilot firing is 7 of 9 in
   round 4 against 6 of 9 on the same nine tasks in round 3 — a net +1 that hides **T05 firing in
   round 3 and not in round 4**. Feature version pinning still has no rule. Gate D is still
   deferred, so Phase 2 (Tasks 12-13) still does not run.

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
- **The repo is PUBLIC and merged**, so the documented install paths work — and publication is
  what created the Gate E contamination vector below. This bullet said "private" until 2026-09-02;
  it was stale, not a second opinion.
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
