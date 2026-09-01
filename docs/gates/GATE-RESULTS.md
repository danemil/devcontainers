# Phase 0 gate results

Each gate is answered EMPIRICALLY. "Documented as" is not an answer; "I ran it and
observed" is. Record verbatim command output, not a summary of it.

## Gate A — installer fidelity (Task 2)
Do `npx skills add` / `gh skill add` / `copilot skill add` preserve subdirectories and
the executable bit? Does `gh skill update` inject provenance keys into the frontmatter?
Also settles whether Copilot accepts a `metadata:` frontmatter block.
STATUS: not run

## Gate B — Copilot resolves references/ from .claude/skills/ (Task 3)
STATUS: not run

## Gate C — Copilot code review can shell out (Task 4)
STATUS: not run

## Gate D — false-positive AND recall rate on real configs (Task 5)
Budget half a day to a day. Record corpus size and how it was obtained.
STATUS: not run

## Gate E — blinded usefulness: firing rate, lift, harm (Task 5b)
Runs AFTER Tasks 6 and 7 exist in draft. This is the Phase 1 exit criterion.
STATUS: not run

## DECISIONS
Phase 1 SHIPS only if Gate E shows lift on >= 3 of 10 tasks with zero harm cases.
  Lift 1-2 => the problem is selection, not rules. Rewrite the description. Do not add rules.
  Lift 0   => STOP. Fall back to twelve facts in AGENTS.md. Record that as the finding.
Phase 2 (executable checker) proceeds only if Gate E passed AND Gate D flagship-heuristic
  false positives on working public configs are <= 10% with usable recall.
