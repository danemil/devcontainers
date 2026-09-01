# Dev Container Agent Package — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single portable `SKILL.md` (plus a twelve-rule cited corpus) that makes Claude Code, GitHub Copilot chat, and the Copilot CLI reliably correct about dev containers — and get the highest-value slice of it upstream into `github/awesome-copilot`.

**Architecture:** One physical skill directory at `.claude/skills/devcontainers/`, **discovered** by both hosts (Copilot's Agent Skills went GA 2025-12-18 and reads `.claude/skills/`). Note the precision: both hosts do three-level progressive disclosure, so what is guaranteed is that `name` + `description` reach the model at discovery and the body loads *on match*. Nothing guarantees the body is read on any given turn — which is why Task 10 measures firing rate and Gate E measures whether firing changes the answer. Frontmatter is restricted to four of the five portable keys. Rules live in a citation-bearing reference file loaded only at level-3 disclosure. Everything host-divergent (agents, prompts, MCP) is deliberately **not shipped at v0.1**. An executable checker is Phase 2 and is *conditional on Gates D and E*.

**Tech Stack:** Markdown + YAML frontmatter only at v0.1. Phase 2 adds zero-dependency Node (stdlib only, no `package.json`, no build step). No Go, no Docker, no npm install required for first value.

**Spec:** `/private/tmp/claude-501/-Users-emildan-work-devcontainers/a20885cc-5e6c-44db-9455-632f7c67942e/scratchpad/BRIEF.md` — verified, adversarially fact-checked ground truth gathered 2026-08-31. **Copy this file into the repo as `docs/RESEARCH-BRIEF.md` in Task 1**; the scratchpad is session-scoped and will not survive. Cached primary sources sit beside it in the same directory (`base.json`, `jsonref.md`, `sp-*.md`, `cli-changelog.md`, `settings-reference.md`, `hooks.md`, `notes-*.md`) — copy the ones Task 6 cites into `docs/sources/`.

**Visual overview:** `docs/devcontainer-agent-package-explainer.html`

---

## Global Constraints

Copied verbatim from the research brief. Every task's requirements implicitly include this section.

- **The portable frontmatter set is five keys:** `name`, `description`, `license`, `metadata`, `allowed-tools`. (`compatibility` is portable to Claude Code and the Skills API but is not in Copilot's documented optional list, so it is excluded.) Any key outside this set is a **hard error** on the Skills API path.
- **We ship four of the five. `allowed-tools` is deliberately omitted — a choice, not a constraint.** The key is portable; its *value grammar* is not (Claude: `Bash(node:*)`; Copilot: `shell(...)`, `write` kinds). A single string is wrong on one host either way, so we omit it and let each host apply its own permission flow. Portability of a key does not imply portability of its value. **Do not write "four keys are the only legal set" anywhere — that is false and the README must not repeat it.**
- **`metadata` acceptance on Copilot is UNVERIFIED.** It is in the agentskills.io portable six, but Copilot's own documented optional-key list does not name it. Gate A settles this; if Copilot rejects or warns on it, `corpus_version` moves into the body as a plain line and the shipped set drops to three keys.
- **Skill directory name determines the invoked command name** on Claude Code for personal/project skills — frontmatter `name` is only a display label. Directory must be `devcontainers`.
- **SKILL.md must stay under 500 lines** (Claude Code documented guidance). `description` must be ≤1024 chars (Copilot hard limit). `name` ≤64 chars, lowercase letters/digits/hyphens only.
- **Body portability rules — grep-enforced in review:**
  - No `` !`command` `` inline bash and no fenced `!` blocks (Claude-only execution).
  - No `$ARGUMENTS`, `$1`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, or any `${CLAUDE_*}` substitution.
  - No host-specific tool names in prose. Write "read the file", never "use the Read tool".
  - Every shell snippet is preceded by a `command -v` probe. None of `devcontainer`, `hadolint`, `trivy`, `dockle`, `docker scout` is installed on the target machine.
- **No generated prose projection of the rule corpus may land in the model's context path.** No `RULES.md`, no `applyTo`-globbed instructions file listing rules. Four of six council advisors independently refused this: it is a second source of truth at the consumption boundary and a leaked answer key.
- **Every rule requires, without exception:** a banded never-reused ID, a severity, a `SPEC` or `OPINION` tier tag, a source URL, a verbatim quote under 300 characters, a `verified_on: YYYY-MM-DD` date, a detection method, and a fix. A rule missing any of these does not merge.
- **Rule IDs are a published interface.** Never reuse an ID. Retire with `superseded_by`, never by deletion-and-renumber. The moment a user writes a suppression, IDs carry compatibility obligations.
- **Rules are suppressed, never deleted.** When a base model reliably handles a rule unaided, mark it `prompt_include: false` — it leaves the prose the model reads but stays in the corpus, in the checker, and in any SARIF baseline. Deleting it would break stable IDs, erase provenance, and leave nothing to fall back on when a future model regresses. Passing an eval once is not evidence a model applies a fact reliably in a noisy repo, on every surface, at every version. **Suppression is reversible; deletion is not.**
- **Claude Code does NOT read `AGENTS.md`.** Copilot does. Any AGENTS.md guidance must be reached from `CLAUDE.md` via `@AGENTS.md`.
- **Flip-triggers, written into the README as decision records:** at ≥4 target hosts or ≥4 host-divergent files, stop hand-maintaining and adopt `rulesync`. Below that, a consistency check beats a generator.

---

## File Structure

```
docs/
  RESEARCH-BRIEF.md                              # Task 1 — copied from scratchpad, the plan's spec
  sources/                                       # Task 1 — cached primary sources cited by rules
  devcontainer-agent-package-explainer.html      # already written
  gates/GATE-RESULTS.md                          # Tasks 2-5 — one section per gate
.claude/skills/devcontainers/
  SKILL.md                                       # Task 7 — the product; 3 modes; <500 lines
  references/rules.md                            # Task 6 — 12 cited rules
  references/spec-facts.md                       # Task 8 — mechanics the model gets wrong
.github/instructions/
  devcontainers.instructions.md                  # Task 9 — pointer only, zero rules
README.md                                        # Task 9
LICENSE                                          # Task 9 — MIT, WITH a copyright holder name
upstream/awesome-copilot-devcontainers.instructions.md   # Task 11 — the PR payload
```

Phase 2 (Task 12+, **conditional**) adds `bin/dcaudit.mjs`, `rules.json`, `rules.schema.json`, `fixtures/{clean,dirty}/`, `.github/workflows/audit.yml`.

---

## Task 1: Preserve the research brief into the repo

**Files:**
- Create: `docs/RESEARCH-BRIEF.md`
- Create: `docs/sources/` (directory)
- Create: `docs/gates/GATE-RESULTS.md` (skeleton)

**Interfaces:**
- Produces: `docs/RESEARCH-BRIEF.md` — the single spec every later task reads. `docs/sources/*.md` — primary sources rules cite.

- [ ] **Step 1: Copy the brief and the sources it depends on**

```bash
S=/private/tmp/claude-501/-Users-emildan-work-devcontainers/a20885cc-5e6c-44db-9455-632f7c67942e/scratchpad
mkdir -p docs/sources docs/gates
cp "$S/BRIEF.md" docs/RESEARCH-BRIEF.md
for f in base.json jsonref.md devcontainer-reference.md image-metadata.md \
         devcontainer-lockfile.md declarative-secrets.md secrets-support.md \
         features-user-env-variables.md parallel-lifecycle-script-execution.md \
         sp-devcontainer-features.md sp-feature-dependencies.md \
         sp-features-contribute-lifecycle-scripts.md \
         sp-features-legacyIds-deprecated-properties.md \
         sp-devcontainer-id-variable.md cli-readme.md cli-changelog.md sup.md; do
  cp "$S/$f" docs/sources/ 2>/dev/null || echo "MISSING: $f"
done
ls docs/sources/
```

Expected: no `MISSING:` lines. If the scratchpad is gone, **stop** — re-run the research workflow rather than proceeding on memory.

- [ ] **Step 2: Write the gate-results skeleton**

```bash
cat > docs/gates/GATE-RESULTS.md <<'EOF'
# Phase 0 gate results

Each gate is answered EMPIRICALLY. "Documented as" is not an answer; "I ran it and observed" is.

## Gate A — installer fidelity
STATUS: not run
## Gate B — Copilot resolves references/ from .claude/skills/
STATUS: not run
## Gate C — Copilot code review can shell out
STATUS: not run
## Gate D — false-positive AND recall rate on real configs
STATUS: not run
## Gate E — blinded usefulness (firing rate, lift, harm) — runs after the draft skill exists
STATUS: not run

## DECISIONS
Phase 1 SHIPS only if Gate E shows lift on >= 3 of 10 tasks with zero harm cases.
  Lift 0 => stop and fall back to twelve facts in AGENTS.md. Record that as the finding.
Phase 2 (executable checker) proceeds only if Gate E passed AND Gate D flagship-heuristic
  false positives on working public configs are <= 10% with usable recall.
Record all numbers here, including the corpus size and how it was obtained.
EOF
```

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: preserve research brief and primary sources"
```

---

## Task 2: Gate A — installer fidelity

**Files:**
- Modify: `docs/gates/GATE-RESULTS.md` (Gate A section)

**Question:** Do `npx skills add`, `gh skill add`, and `copilot skill add` preserve subdirectories and the executable bit? If any flattens the tree, every design with `bin/` or `references/` breaks on its own advertised install channel — which invalidates Phase 2 and forces all depth into one file.

- [ ] **Step 1: Build a probe skill with a subdirectory and an executable**

```bash
mkdir -p /tmp/probe-skill/skills/probe-devc/references /tmp/probe-skill/skills/probe-devc/bin
cat > /tmp/probe-skill/skills/probe-devc/SKILL.md <<'EOF'
---
name: probe-devc
description: Installer fidelity probe. Do not use.
license: MIT
---
See references/deep.md
EOF
echo "MARKER-DEEP-FILE-SURVIVED" > /tmp/probe-skill/skills/probe-devc/references/deep.md
printf '#!/usr/bin/env node\nconsole.log("MARKER-EXEC")\n' > /tmp/probe-skill/skills/probe-devc/bin/probe.mjs
chmod +x /tmp/probe-skill/skills/probe-devc/bin/probe.mjs
find /tmp/probe-skill -type f -exec ls -l {} \;
```

- [ ] **Step 2: Install it three ways and inspect what landed**

Publish the probe to a scratch public GitHub repo first (the installers take a repo ref, not a local path). Then, for each installer, record: (a) does `references/deep.md` exist, (b) does `bin/probe.mjs` exist, (c) is the executable bit still set, (d) did anything get written into the SKILL.md frontmatter.

```bash
npx skills add <you>/probe-skill        && find ~/.claude/skills/probe-devc ~/.agents/skills/probe-devc -type f -exec ls -l {} \; 2>/dev/null
gh skill install <you>/probe-skill      && find ~/.copilot/skills/probe-devc -type f -exec ls -l {} \; 2>/dev/null
copilot skill add <you>/probe-skill     && find ~/.copilot/skills/probe-devc -type f -exec ls -l {} \; 2>/dev/null
```

If a command name is wrong, run its `--help` and record the correct one — do not guess.

- [ ] **Step 3: Record the finding, including the frontmatter question**

`gh skill update` is documented to write provenance (source repo, ref, tree SHA) **into the SKILL.md frontmatter** on install. Diff the installed SKILL.md against the source and record exactly which keys were added. This decides whether a strict four-key frontmatter CI gate would fail on our own advertised install channel.

```bash
diff /tmp/probe-skill/skills/probe-devc/SKILL.md ~/.copilot/skills/probe-devc/SKILL.md
```

- [ ] **Step 4: Write the verdict and commit**

Write into `docs/gates/GATE-RESULTS.md` under Gate A: per-installer PASS/FAIL for subdirs, exec bit, and frontmatter injection. State the consequence explicitly, e.g. *"npx skills add flattens references/ → depth must live in SKILL.md; Phase 2 bin/ is not installable this way."*

```bash
git add docs/gates/GATE-RESULTS.md && git commit -m "test: gate A — skill installer fidelity"
```

---

## Task 3: Gate B — does Copilot resolve `references/` from `.claude/skills/`?

**Files:**
- Modify: `docs/gates/GATE-RESULTS.md` (Gate B section)

**Question:** Copilot's three-level progressive disclosure is documented, and `.claude/skills/` is a documented Copilot project skill directory. What is **not** documented is whether skill-relative `references/*.md` links resolve when the skill lives in `.claude/skills/` rather than `.github/skills/`. Level-3 disclosure is the entire reason depth is affordable; if it fails, the twelve rules must move into the SKILL.md body and the body budget shrinks accordingly.

- [ ] **Step 1: Plant a canary in a real repo**

```bash
mkdir -p .claude/skills/probe-refs/references
cat > .claude/skills/probe-refs/SKILL.md <<'EOF'
---
name: probe-refs
description: Use when the user says the exact phrase "run the reference canary". Reads a bundled reference file and reports a marker string.
license: MIT
---
When invoked, read `references/canary.md` in this skill directory and report the marker
string it contains, verbatim. If you cannot read that file, say exactly:
"CANARY UNREACHABLE".
EOF
echo 'MARKER: PELICAN-7731' > .claude/skills/probe-refs/references/canary.md
```

- [ ] **Step 2: Invoke on all three surfaces and record verbatim output**

```bash
copilot -p 'run the reference canary' -s          # Copilot CLI
claude -p 'run the reference canary'              # Claude Code — control, expected PASS
```

For VS Code agent mode, open the workspace and type `run the reference canary` in Copilot Chat. Record whether `PELICAN-7731` came back or `CANARY UNREACHABLE` did.

- [ ] **Step 3: If Copilot CLI fails, test the documented escape hatch**

Copilot exposes `chat.agentSkillsLocations` for additional skill directories. Test whether pointing it at `.claude/skills` fixes resolution — this is the one-line documented recovery nobody in the design exercise named, and it is cheaper than duplicating a file.

- [ ] **Step 4: Record the verdict and commit**

Write PASS/FAIL per surface. Consequence if FAIL: *"references/ unreachable on Copilot → the twelve rules move into the SKILL.md body; budget SKILL.md at ~380 lines and drop spec-facts.md to a linked URL list."*

```bash
rm -rf .claude/skills/probe-refs
git add docs/gates/GATE-RESULTS.md && git commit -m "test: gate B — Copilot reference resolution from .claude/skills"
```

---

## Task 4: Gate C — can Copilot code review shell out?

**Files:**
- Modify: `docs/gates/GATE-RESULTS.md` (Gate C section)

**Question:** Skills are documented as supported on Copilot code review. Code review is the highest-value surface for an auditor — findings land on the diff line rather than in a log nobody opens. But it is plausibly non-executing. If it cannot run a shell command, the Phase 2 executable-checker story degrades to prose on exactly the surface where determinism mattered most, and SARIF/Actions becomes the only path to diff-line findings.

- [ ] **Step 1: Build a scratch repo with an execution canary skill**

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

Note: `.github/skills/` is used here deliberately — this gate tests *execution*, not directory discovery, so use the surface's most-documented path to avoid confounding with Gate B.

- [ ] **Step 2: Open a PR touching `exec-canary.txt` and request Copilot review**

```bash
git checkout -b probe/exec && echo "change" >> exec-canary.txt
git commit -am "test: exec canary" && git push -u origin probe/exec
gh pr create --title "probe: exec canary" --body "Copilot review execution probe"
gh pr edit --add-reviewer copilot-pull-request-reviewer
```

- [ ] **Step 3: Read the review comment and record which marker appeared**

```bash
gh pr view --json reviews --jq '.reviews[].body'
```

- [ ] **Step 4: Record the verdict and commit**

Consequence if FAIL: *"Copilot code review cannot execute → diff-line findings come only from the Phase 2 SARIF upload, not from the skill. The skill on that surface is prose-only, and the tamper-evident header will be absent there by design — document this so a missing header on code review is not read as a failure."*

```bash
git checkout main && git branch -D probe/exec
git add docs/gates/GATE-RESULTS.md && git commit -m "test: gate C — Copilot code review execution"
```

---

## Task 5: Gate D — false-positive rate on real configs

**Files:**
- Create: `docs/gates/fp-corpus/` (harvested configs, gitignored if large)
- Create: `docs/gates/fp-measure.mjs`
- Modify: `docs/gates/GATE-RESULTS.md` (Gate D section)

**This gate decides whether Phase 2 exists.** Every quality gate proposed in the design exercise was self-referential — fixtures purpose-built to trip the rule they test pass by construction and measure nothing. Four of six advisors independently demanded this measurement; zero designs contained it.

**Honest cost: half a day to a day, not the 2–3 hours budgeted for Gates A–C.** Harvesting a representative corpus and hand-adjudicating 20 hits per rule is the bulk of it, and the adjudication cannot be delegated to a heuristic without defeating the point. Budget it as its own task and do not let it be rushed into the gate block.

**Measure recall too, not only false positives.** A heuristic that fires on nothing has a perfect false-positive rate and zero value. For each rule, also hand-check 20 configs it did *not* flag and count how many actually had the problem. A rule with low FP and low recall belongs in prose, not a checker.

**Interfaces:**
- Produces: a per-rule hit-rate table. Phase 2 proceeds only if flagship-heuristic false positives on *working* configs are ≤10%.

- [ ] **Step 1: Harvest a corpus of real public devcontainer.json files**

```bash
mkdir -p docs/gates/fp-corpus
gh api -X GET search/code --paginate \
  -f q='filename:devcontainer.json path:.devcontainer' -f per_page=100 \
  --jq '.items[] | [.repository.full_name, .path] | @tsv' 2>/dev/null | head -400 > /tmp/hits.tsv
wc -l /tmp/hits.tsv
```

If GitHub code search is rate-limited or requires scopes you lack, fall back to cloning the `devcontainers/images`, `devcontainers/templates`, and `devcontainers/features` repos plus the top 100 results of `gh search repos --topic devcontainer --limit 100`, and say so in the results file. **Record the actual corpus size and how it was obtained** — a silently small corpus reads as a clean result.

- [ ] **Step 2: Write the measurement harness**

The harness implements *only* the detection halves of the four flagship heuristics — the ones that guess at intent and can therefore be wrong. Deterministic structural facts (enum legality, deprecated property present) cannot false-positive and are excluded.

```javascript
// docs/gates/fp-measure.mjs — run: node docs/gates/fp-measure.mjs docs/gates/fp-corpus
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// JSONC: devcontainer.json permits comments and trailing commas.
// WARNING: this stripper is deliberately crude and is ACCEPTABLE ONLY HERE, in a
// measurement harness that reports its own unparseable count. It will mangle a `//`
// inside a string literal. Count `unparseable` and eyeball a sample of failures — if
// the rate exceeds ~2%, the corpus is being silently biased toward simple configs.
// DO NOT reuse this in the Phase 2 checker. See the JSONC note in Task 12.
const parse = s => JSON.parse(
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/,(\s*[}\]])/g, '$1')
)
const flat = c => Array.isArray(c) ? c.join(' ') : typeof c === 'object' && c ? Object.values(c).flat().join(' ') : String(c ?? '')

const HEURISTICS = {
  'DC-LIFE-001': d => /\b(npm (ci|i|install)|yarn|pnpm|pip install|bundle install|go mod download|cargo build|mvn|gradle)\b/
    .test(flat(d.postCreateCommand)),
  'DC-SEC-001': d => Object.entries({ ...(d.remoteEnv || {}), ...(d.containerEnv || {}) })
    .some(([k, v]) => /TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL/i.test(k) && !/^\$\{localEnv:/.test(String(v))),
  'DC-PERF-001': d => (d.mounts || []).some(m => /type=volume/.test(typeof m === 'string' ? m : JSON.stringify(m)))
    && !/chown/.test(flat(d.postCreateCommand)),
  'DC-FEAT-PIN': d => Object.keys(d.features || {}).some(f => !/[:@]/.test(f) || /:latest$/.test(f)),
}

const counts = {}, total = { parsed: 0, failed: 0 }
for (const f of readdirSync(process.argv[2])) {
  let d
  try { d = parse(readFileSync(join(process.argv[2], f), 'utf8')); total.parsed++ }
  catch { total.failed++; continue }
  for (const [id, fn] of Object.entries(HEURISTICS)) {
    try { if (fn(d)) (counts[id] ??= []).push(f) } catch {}
  }
}
console.log(`parsed=${total.parsed} unparseable=${total.failed}`)
for (const [id, hits] of Object.entries(counts))
  console.log(`${id}\t${hits.length}\t${(hits.length / total.parsed * 100).toFixed(1)}%\t${hits.slice(0, 5).join(', ')}`)
```

- [ ] **Step 3: Run it and hand-adjudicate the hits**

```bash
node docs/gates/fp-measure.mjs docs/gates/fp-corpus
```

For each rule, open **at least 20 hits by hand** and classify each as TRUE POSITIVE (the config really has the problem) or FALSE POSITIVE (the config is fine and the heuristic misread it). Percent-of-corpus is not the false-positive rate — adjudicated FP / total hits is. `DC-LIFE-001` in particular will fire on configs that are correct because they never use prebuilds; decide and document whether that counts as a false positive (it does: severity should drop to INFO if so).

- [ ] **Step 4: Record the verdict and the architecture decision**

Write the per-rule table (hits, adjudicated TP, adjudicated FP, FP rate) and then the explicit decision line:

- FP ≤10% on all four → **Phase 2 proceeds.** Corpus-plus-checker earns its keep.
- FP >10% on any flagship → **Phase 2 is cancelled or that rule is demoted to INFO and moved to prose-only.** An auditor that cries wolf gets deleted.

```bash
git add docs/gates/ && git commit -m "test: gate D — false-positive rate on real configs"
```

---

## Task 5b: Gate E — blinded usefulness evaluation

**Files:**
- Create: `docs/gates/usefulness/tasks.md`, `docs/gates/usefulness/results.md`
- Modify: `docs/gates/GATE-RESULTS.md` (Gate E section)

**This is the gate that tests the central claim, and no candidate architecture contained it.** Gate D tests whether the *heuristics* are accurate. Gate E tests something more fundamental and more likely to fail: **is the skill selected when it is needed, and does having it materially change the answer versus the base model?** Everything downstream — the rules, the checker, the upstream PR, any future agent — is premature until this has a number.

Run it **after Task 7 and Task 6 exist in draft** (you cannot evaluate a skill that is not written) but **before Task 11 and before any Phase 2 work**. It is the real Phase 1 exit criterion.

**Interfaces:**
- Consumes: draft `SKILL.md` and `references/rules.md`.
- Produces: a per-task, per-host, with-vs-without success table. Task 11 and Task 12 both gate on it.

- [ ] **Step 1: Write 10 realistic tasks with expert-labelled correct answers**

Not rule-recitation questions — **decisions a developer actually makes**, where the correct answer is knowable and where the base model plausibly gets it wrong. Each task is a repo state plus a request. Label the correct outcome before running anything.

Suggested set (adjust to what Gate D showed is real):
1. A config installing dependencies in `postCreateCommand`, in a repo with Codespaces prebuilds configured. *Correct: move to `onCreateCommand`/`updateContentCommand`.*
2. `remoteEnv` containing `GITHUB_TOKEN: ${localEnv:GITHUB_TOKEN}` vs. a literal. *Correct: flag only the literal; the `localEnv` form is fine.* (This one tests for **over**-flagging.)
3. `"waitFor": "postAttachCommand"`. *Correct: illegal enum value.*
4. "My `nvm use` works in the terminal but not in `postCreateCommand`." *Correct: `userEnvProbe`.*
5. A named volume for `node_modules` with no `chown`. *Correct: root-owned, needs chown.*
6. `overrideFeatureInstallOrder` attempting to put a feature before its `dependsOn` target. *Correct: cannot work; explain the topological sort.*
7. Top-level `"extensions": [...]`. *Correct: deprecated, move to `customizations.vscode.extensions`.*
8. A **correct, idiomatic** config. *Correct: report no findings.* (Tests for false-positive noise.)
9. "Set up Claude Code in this dev container." *Correct: non-root `remoteUser`, the two-part `~/.claude` + `CLAUDE_CONFIG_DIR` auth mount.*
10. `postCreateCommand` in **object form** with parallel entries. *Correct: recognise the form; do not misread it as one shell string.*

- [ ] **Step 2: Run each task twice per host — skill installed and skill removed**

Six cells per task (3 surfaces × 2 conditions), 60 runs. Use fresh sessions; a skill body persists once invoked, so a warm session contaminates the "without" arm.

```bash
# with
claude -p "<task prompt>"
copilot -p "<task prompt>" -s
# without — move the skill directory aside, do not just rename the file
mv .claude/skills/devcontainers /tmp/skill-parked
claude -p "<task prompt>"
copilot -p "<task prompt>" -s
mv /tmp/skill-parked .claude/skills/devcontainers
```

Record for every run: (a) **did the skill fire at all** — this is a separate number from correctness and is the one most likely to disappoint; (b) correct / partially correct / wrong against the pre-written label; (c) any confident wrong answer, which is worse than a miss.

- [ ] **Step 3: Compute and record the three numbers that matter**

```
FIRING RATE    = runs where the skill engaged / runs in the "with" arm, per surface
LIFT           = correct(with) - correct(without), per task and overall
HARM           = tasks where "with" was WORSE than "without" (over-flagging, wrong citation)
```

- [ ] **Step 4: Apply the decision rule, and write it down before you look at the numbers**

- **Lift ≥ 3 of 10 tasks and HARM = 0** → Phase 1 ships. Proceed to Task 11.
- **Lift 1–2, or any HARM** → the corpus is not the problem, *selection* or *phrasing* is. Rewrite the `description` and the AUDIT-mode instructions and re-run. Do not add rules.
- **Lift 0** → **stop.** The base model already handles these unaided, and the honest answer is Rung 1 from "The case for doing less" — twelve facts in `AGENTS.md`, thirty minutes, done. Do not ship a package, do not open the upstream PR, and record the result as the most valuable finding of the exercise.

```bash
git add docs/gates/ && git commit -m "test: gate E — blinded usefulness evaluation"
```

---

## Task 6: The twelve-rule corpus

**Files:**
- Create: `.claude/skills/devcontainers/references/rules.md`

**Interfaces:**
- Consumes: `docs/RESEARCH-BRIEF.md`, `docs/sources/*`
- Produces: rule IDs `DC-LIFE-00N`, `DC-SEC-00N`, `DC-FEAT-00N`, `DC-PERF-00N`, `DC-USER-00N`, `DC-ENV-00N`, `DC-DEP-00N`, `DC-CLAUDE-00N` — referenced by name from `SKILL.md` (Task 7) and, if Phase 2 runs, by `rules.json`.

Twelve rules. Not thirty. The corpus is the delta between what a frontier model already knows and what it confidently gets wrong; padding it with facts the model has memorised makes it longer, staler, and less trusted.

- [ ] **Step 1: Write the file header and the rule-block format**

```markdown
# Dev container rules

Every rule carries a source. `SPEC` means the behaviour is stated in the Dev Container
specification, the reference CLI, or official vendor documentation. `OPINION` means this
package recommends it; the spec does not require it. Never present an OPINION rule as spec.

IDs are a published interface. They are never reused. A retired rule keeps its ID and gains
`superseded_by`.

Format:

### DC-XXX-NNN · <one-sentence assertion>
- **Severity:** ERROR | WARN | INFO
- **Tier:** SPEC | OPINION
- **Source:** <url>
- **Quote:** "<verbatim, under 300 characters>"
- **Verified:** YYYY-MM-DD
- **Detect:** <what to look for when reading devcontainer.json>
- **Fix:** <the concrete change>
```

- [ ] **Step 2: Write the twelve rules**

Write these exact twelve, in this order. The assertions and detection/fix content are given here; **you must still open each source URL and paste a real verbatim quote** — do not carry a quote over from this plan.

| ID | Sev | Tier | Assertion |
|---|---|---|---|
| `DC-LIFE-001` | ERROR | SPEC | Expensive work in `postCreateCommand` is never baked into a Codespaces prebuild — `onCreateCommand` and `updateContentCommand` are; `postCreateCommand` is not, and `--prebuild` stops after `updateContentCommand` and re-runs it. |
| `DC-SEC-001` | ERROR | SPEC | The CLI writes `remoteEnv` from devcontainer.json into the `devcontainer.metadata` image label by default. Real secrets belong in `--secrets-file`, which merges into the lifecycle environment and is redacted from logs. |
| `DC-LIFE-002` | ERROR | SPEC | `postAttachCommand` is not a legal `waitFor` value. The enum is exactly `[initializeCommand, onCreateCommand, updateContentCommand, postCreateCommand, postStartCommand]`, default `updateContentCommand`. |
| `DC-FEAT-001` | WARN | SPEC | `overrideFeatureInstallOrder` cannot reorder a `dependsOn` edge — it only assigns `roundPriority` within a round-based topological sort and can never violate the dependency graph. |
| `DC-FEAT-002` | WARN | SPEC | Feature dependency resolution happens only at initial creation from devcontainer.json; rebuilds from an image freeze resolved deps into the metadata label. Two Features with different options are different Features and both install, so Features must be idempotent. |
| `DC-FEAT-003` | WARN | SPEC | Feature `install.sh` runs as root at build time; `_REMOTE_USER`, `_CONTAINER_USER`, `_REMOTE_USER_HOME`, `_CONTAINER_USER_HOME` are the only sanctioned way to learn the eventual user. Ignoring them is the leading cause of root-owned files. |
| `DC-PERF-001` | WARN | SPEC | A named volume used to dodge the macOS/Windows bind-mount penalty comes up **root-owned** and needs an explicit `chown` in `postCreateCommand`. |
| `DC-USER-001` | WARN | SPEC | `updateRemoteUserUID` defaults to true on Linux whenever `containerUser` or `remoteUser` is set, silently building a second derived `…-uid` image. The CI Action exposes `skipContainerUserIdUpdate`. |
| `DC-ENV-001` | WARN | SPEC | `userEnvProbe` (`none｜loginShell｜loginInteractiveShell｜interactiveShell`, default `loginInteractiveShell`) determines which shell startup files contribute to the lifecycle environment — it is why a command works in the terminal but not in `postCreateCommand`. |
| `DC-LIFE-003` | INFO | SPEC | Lifecycle commands accept an object form whose entries run **in parallel**. `postCreateCommand` is `string｜array｜object`. This changes what "expensive" means and breaks naive single-string analysis. |
| `DC-DEP-001` | WARN | SPEC | Top-level `extensions`, `settings` and `devPort` are deprecated in favour of `customizations.vscode.*` (which now also carries `mcp`); `appPort` is superseded by `forwardPorts`. |
| `DC-CLAUDE-001` | WARN | OPINION | Claude Code in a dev container needs a non-root `remoteUser` (`--dangerously-skip-permissions` is rejected as root) and a two-part auth mount: a volume at `~/.claude` **and** `CLAUDE_CONFIG_DIR` set, because `~/.claude.json` lives outside `~/.claude`. The reference firewall additionally needs `NET_ADMIN` and `NET_RAW` via `runArgs`. |

Adjust severities to match Gate D: any rule whose adjudicated false-positive rate exceeded 10% is demoted to INFO and its `Detect` section rewritten to state the ambiguity ("this is only a problem if you use prebuilds").

- [ ] **Step 3: Verify every citation**

Dispatch a dedicated verification pass. For each of the twelve rules: open the URL, confirm the quote appears verbatim, confirm the quote actually supports the assertion (not merely adjacent to it), and set `Verified:` to today's date. A rule whose quote does not support its assertion is **downgraded to OPINION or cut** — this is the discipline afonsograca got right and mmalyska got wrong, and it is the whole reason to trust this file.

- [ ] **Step 4: Check the file against the global constraints**

```bash
grep -nE '^\s*!`|```!|\$ARGUMENTS|\$\{CLAUDE_' .claude/skills/devcontainers/references/rules.md && echo "FAIL: non-portable syntax" || echo "OK"
grep -c '^### DC-' .claude/skills/devcontainers/references/rules.md   # expect 12
for f in Severity Tier Source Quote Verified Detect Fix; do
  echo "$f: $(grep -c "^- \*\*$f:\*\*" .claude/skills/devcontainers/references/rules.md)"   # each expect 12
done
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/devcontainers/references/rules.md
git commit -m "feat: twelve cited dev container rules"
```

---

## Task 7: The skill body

**Files:**
- Create: `.claude/skills/devcontainers/SKILL.md`

**Interfaces:**
- Consumes: rule IDs from Task 6; `references/spec-facts.md` from Task 8 (write the link now, the file lands in Task 8).
- Produces: the `/devcontainers` command on Claude Code and a matched skill on every Copilot surface.

- [ ] **Step 1: Write the frontmatter — exactly four keys**

```yaml
---
name: devcontainers
description: Use when creating, editing, reviewing, validating or debugging a devcontainer.json, .devcontainer/ directory, Dev Container Feature or Template, or when a containerised dev environment behaves differently from the host, fails to build, or is slow to start. Covers the containers.dev specification, Features, Templates, lifecycle commands, Codespaces prebuilds, and the tools that support them.
license: MIT
metadata:
  corpus_version: "0.1.0"
  spec_verified: "2026-08-31"
---
```

`description` must be ≤1024 characters and must say both *what it does* and *when to use it* — Copilot matches on this string alone at discovery time, and Claude Code caps `description` + `when_to_use` at 1,536 characters in the listing.

- [ ] **Step 2: Write the three modes**

- **AUDIT** — read the config, report findings **by rule ID with the tier tag printed on every line** (`DC-SEC-001 [SPEC]`), never edit files. Load `references/rules.md` here and only here.
- **AUTHOR** — write or modify a config. Load `references/spec-facts.md`. State defaults explicitly and cite them.
- **DEBUG** — symptom-keyed decision list: *won't build* · *behaves differently in Codespaces* · *slow to start* · *changes not taking effect* · *works in my terminal but not in postCreateCommand* (→ `DC-ENV-001`). This is the only content organised around what a developer actually types when stuck.

- [ ] **Step 3: Write the refusals, verbatim**

The skill must state these and hold to them:

1. Will not assert unofficial advice as specification. Anything not in the spec or official docs is tagged `OPINION` or omitted.
2. Will not claim JSON Schema conformance it did not run. `devcontainer.json` validation today is editor-only via SchemaStore; the devcontainer CLI ships no validator.
3. Will not shell out to `devcontainer`, `hadolint`, `trivy`, `dockle`, `docker scout` or `decolint` without a `command -v` probe first, and will never install them. **Every tool that was not run is printed as an explicit "not checked" line** — "not checked" must never read as "passed".
4. Will not put real secrets in `remoteEnv` or `containerEnv` (see `DC-SEC-001`).
5. Will not run `devcontainer up` or `docker build` without explicit confirmation.
6. Will not rewrite a working config to match a style preference.

- [ ] **Step 4: Add the delegation lines**

Two official oracles exist and should be used rather than reasoned around:
- `devcontainer features resolve-dependencies` — prints the resolved Feature install order. Prefer it over reasoning about `dependsOn` / `installsAfter` / `overrideFeatureInstallOrder` by hand.
- `devcontainer features test` — the official conformance harness for Feature authors.
Both behind a `command -v devcontainer` probe.

- [ ] **Step 5: Verify constraints and commit**

```bash
wc -l .claude/skills/devcontainers/SKILL.md          # must be < 500
grep -nE '^\s*!`|```!|\$ARGUMENTS|\$\{CLAUDE_' .claude/skills/devcontainers/SKILL.md && echo FAIL || echo OK
python3 -c "
import sys,re
t=open('.claude/skills/devcontainers/SKILL.md').read()
fm=re.match(r'---\n(.*?)\n---',t,re.S).group(1)
keys=[l.split(':')[0] for l in fm.split('\n') if l and not l.startswith((' ','\t','-'))]
allowed={'name','description','license','metadata'}
bad=set(keys)-allowed
print('FAIL extra keys:',bad) if bad else print('OK frontmatter')
d=re.search(r'^description:\s*(.*)$',fm,re.M).group(1)
print('description chars:',len(d),'(limit 1024)')
"
git add .claude/skills/devcontainers/SKILL.md && git commit -m "feat: devcontainers skill body with audit, author and debug modes"
```

---

## Task 8: The spec-facts reference

**Files:**
- Create: `.claude/skills/devcontainers/references/spec-facts.md`

Mechanics a model reliably gets wrong, loaded only in AUTHOR and DEBUG modes. This is *not* a second copy of the rules — it is the machinery the rules refer to. If Gate B failed, this file becomes a linked URL list instead and its content is cut to fit the SKILL.md body budget.

**Interfaces:**
- Consumes: `docs/sources/*`
- Produces: the file `SKILL.md` links to for AUTHOR/DEBUG depth.

- [ ] **Step 1: Write the sections**

1. **Lifecycle** — full ordering; `initializeCommand` runs on the **host** and is the only one that does, and is deliberately unavailable to Features; marker-file re-run gating (`onCreate`/`updateContent`/`postCreate` keyed to `createdAt`, `postStart` to `startedAt`, `postAttach` always runs); the string/array/**object-parallel** forms; Feature-contributed commands always run before the user's command for the same hook.
2. **Prebuilds** — what `--prebuild` does; what Codespaces bakes; why this drives `DC-LIFE-001`.
3. **Features** — round-based topological sort; `dependsOn` (hard, recursive, version-pinnable) vs `installsAfter` (soft, non-recursive); option→env-var mangling; the `_REMOTE_USER` family; version pinning tags `1` / `1.2` / `1.2.3` / `latest` / `@sha256:`; lockfiles stable since CLI 0.87.0 (`devcontainer-lock.json`).
4. **Image metadata merge** — the property-specific rules (`init`/`privileged` any-true; `capAdd`/`securityOpt` union; lifecycle commands collected; `remoteEnv` per-variable last-wins; `hostRequirements` max-wins) and the **not-label-storable list**.
5. **Codespaces divergences** — reads `customizations.codespaces` and `hostRequirements` from devcontainer.json only, not the image label; ignores bind mounts except the Docker socket; no `"host:port"` `forwardPorts` form; `shutdownAction` does not apply.
6. **Performance** — macOS/Windows bind-mount penalty; the named-volume and `workspaceMount` fixes; the root-ownership consequence; a WSL2 note (repo in `/mnt/c` vs the WSL filesystem is the biggest Windows penalty) and an arm64/amd64 note (`--platform`, `build.options`) — both flagged `OPINION`, both leading "won't build" causes that no prior corpus covers.
7. **Docker-in-docker vs docker-outside-of-docker** — the two shapes and what each implies.
8. **Substitutions** — `${devcontainerId}` and its **restricted property list** (not available in image-build inputs); `${localEnv:VAR:default}` and `${containerEnv:VAR:default}`.
9. **`customizations` is an open namespace** — no registry, no schema constraint. Two consequences: it is the spec-sanctioned home for per-repo tool configuration, and an unknown-property check must **never** descend into `customizations.*`.
10. **CLI surface** — `up`, `set-up`, `build`, `run-user-commands`, `read-configuration`, `outdated`, `upgrade`, `exec`, `features {test,package,publish,info,resolve-dependencies,generate-docs}`, `templates {apply,publish,metadata,generate-docs}`.

- [ ] **Step 2: Verify and commit**

```bash
grep -nE '^\s*!`|```!|\$ARGUMENTS|\$\{CLAUDE_' .claude/skills/devcontainers/references/spec-facts.md && echo FAIL || echo OK
git add .claude/skills/devcontainers/references/spec-facts.md
git commit -m "feat: spec-facts reference for author and debug modes"
```

---

## Task 9: README, licence, and the Copilot pointer

**Files:**
- Create: `README.md`, `LICENSE`, `.github/instructions/devcontainers.instructions.md`

- [ ] **Step 1: Write the instructions pointer — zero rules**

```markdown
---
applyTo: '**/devcontainer.json,**/.devcontainer/**,**/.devcontainer.json,**/devcontainer-feature.json,**/devcontainer-template.json'
description: Points at the devcontainers skill for dev container files.
---

Before editing any of these files, consult the `devcontainers` skill. It carries the
cited rule corpus, the specification mechanics, and the audit checklist. Do not restate
its rules here.
```

It exists **only** because VS Code has silent path-scoped inline-edit surfaces where no chat message describes the task, so description-based skill matching never fires. It carries no guidance, therefore it cannot drift. **Adding a rule to this file is a review-blocking change.**

**Its mechanism is unproven and must be measured, not assumed.** What is documented is that `applyTo` routes an instructions file into context for matching paths. What is *not* documented is that an instructions file saying "consult the X skill" actually causes the skill to be invoked. Fold this into Gate E: run two of the ten tasks as a silent inline edit on an open `devcontainer.json` with the pointer present and absent, and record whether the skill engaged. **If the pointer changes nothing, delete the file** — an inert artifact with a maintenance rule attached is worse than no artifact.

- [ ] **Step 2: Write the README**

Must contain, as decision records rather than prose:
- Install: copy `.claude/skills/devcontainers/` into the repo (or `~/.claude/skills/`). Note both hosts read it. Note what Gate A found about the packaged installers.
- The four-key frontmatter contract and *why* `allowed-tools` is omitted (key portable, value grammar is not).
- The `SPEC` vs `OPINION` tier convention and the citation invariant.
- The body-portability rules, with the exact `grep` that enforces them.
- Six hand-run cross-host verification prompts (three per host) that prove the skill still fires after a vendor changes discovery. These replace an eval harness at v0.1 and cost nothing to run.
- **Flip-triggers:** at ≥4 target hosts or ≥4 host-divergent files → adopt `rulesync`. Today there is one shared skill and one contentless pointer, so a generator is unjustified.
- **Phase 4 cadence:** quarterly, re-run the Gate E task set *unaided*. A rule the base model now handles reliably is **suppressed from the prose prompt, never deleted from the corpus** — see the note below on why deletion is wrong.
- What this deliberately does not do: no Feature/Template authoring guidance beyond a pointer to `devcontainer features test`; no compose-specific semantic rules yet; no migration mode. Say so, so a user is not surprised.

- [ ] **Step 3: Write the LICENSE — with a copyright holder**

MIT, with a real name and the correct year. afonsograca's has neither; do not repeat it.

- [ ] **Step 4: Commit**

```bash
git add README.md LICENSE .github/instructions/
git commit -m "docs: README with portability contract, MIT licence, Copilot pointer"
```

---

## Task 10: Cross-host verification

**Files:**
- Create: `docs/VERIFICATION.md`

The only thing that proves the skill still fires after a vendor changes discovery. Run it now and record the baseline.

- [ ] **Step 1: Run the six prompts on both hosts**

```bash
# Claude Code
claude -p 'Review .devcontainer/devcontainer.json for problems'
claude -p 'Why does my command work in the terminal but not in postCreateCommand?'
claude -p 'Set up a Node 22 dev container for this repo'
# Copilot CLI
copilot -p 'Review .devcontainer/devcontainer.json for problems' -s
copilot -p 'Why does my command work in the terminal but not in postCreateCommand?' -s
copilot -p 'Set up a Node 22 dev container for this repo' -s
```

Use a scratch repo containing a deliberately flawed `devcontainer.json` (dependency install in `postCreateCommand`, a `TOKEN` in `remoteEnv`, an unpinned Feature, `waitFor: postAttachCommand`).

- [ ] **Step 2: Record, per prompt and per host**

Did the skill fire? Did the right mode engage? Did it cite rule IDs with tier tags? Did it hit `DC-ENV-001` on the `userEnvProbe` question? Did any refusal get violated? Record verbatim output for the two most important prompts.

- [ ] **Step 3: Commit**

```bash
git add docs/VERIFICATION.md && git commit -m "test: cross-host skill firing baseline"
```

---

## Task 11: The upstream PR — run this early

**Files:**
- Create: `upstream/awesome-copilot-devcontainers.instructions.md`

`github/awesome-copilot` — the canonical, GitHub-maintained, high-traffic Copilot customization catalogue — contains **zero** devcontainer instruction, prompt, or chat-mode files today. One file there reaches more users on day one than this repo will in a year, with zero ongoing maintenance surface. That four architectures were designed and nobody proposed this is the finding worth taking most seriously.

**Sequencing — one deliberate disagreement with the Codex review, recorded here rather than buried.** Codex argued the reach claim is speculation and the PR is not a substitute for proving the artifact helps. Both true, and it is not proposed as a substitute. But the two arguments come apart: the twelve rules are *cited spec facts*, and their correctness is established by Task 6's citation verification independently of whether the skill fires. Their usefulness *as an instructions file* is a separate question from their usefulness *as a skill*.

The resolution: **gate this on Gate E, not on Task 12.** If Gate E shows lift, the rules demonstrably help a model and the PR is well-founded. If Gate E shows zero lift, do not open it — submitting rules that measurably change nothing wastes a maintainer's review and is exactly the "building over shipping" failure this task was meant to correct. Run it immediately after Gate E passes, in parallel with Tasks 8–10.

- [ ] **Step 1: Read the repo's contribution conventions**

```bash
gh repo clone github/awesome-copilot /tmp/awesome-copilot
ls /tmp/awesome-copilot/instructions/ | head -30
cat /tmp/awesome-copilot/CONTRIBUTING.md
head -20 /tmp/awesome-copilot/instructions/docker-*.instructions.md
```

Match their frontmatter shape and README-index convention exactly. Do not invent a format.

- [ ] **Step 2: Write the file**

A self-contained `.instructions.md` carrying the twelve rules **in their instruction form** — assertion plus fix, with source links, no rule IDs (IDs are our interface, not theirs) — under an `applyTo` glob for devcontainer paths. This is the one place a prose projection of the corpus is correct, because there is no checker on the other side to be short-circuited.

- [ ] **Step 3: Open the PR**

```bash
cd /tmp/awesome-copilot && git checkout -b add-devcontainer-instructions
cp <this-repo>/upstream/awesome-copilot-devcontainers.instructions.md instructions/devcontainers.instructions.md
# update their README index per CONTRIBUTING
git add . && git commit -m "Add dev container instructions"
gh pr create --title "Add dev container instructions" --body "..."
```

- [ ] **Step 4: Record the outcome**

Whether merged, changes-requested, or rejected, write the result into `README.md`. A rejected PR costs a day and teaches you the maintainer's bar — which is information the standalone repo cannot buy.

---

## Task 12 (CONDITIONAL): The executable checker

**Gate:** Runs only if Gate D reported ≤10% adjudicated false positives on every flagship heuristic. If it did not, **stop here** — v0.1 is the product, and the correct next action is Task 11's PR plus the Phase 4 cadence.

**Files:**
- Create: `bin/dcaudit.mjs`, `rules.json`, `rules.schema.json`, `fixtures/clean/`, `fixtures/dirty/`, `.github/workflows/audit.yml`

Design constraints, all load-bearing:
- Zero dependencies, stdlib only, runnable as bare `node bin/dcaudit.mjs <path>`. No `package.json`, no `npm install`, no lockfile, no build step. Hard cap ~150 lines.
- **JSONC is the biggest hidden cost in this task, and it is where a home-grown checker quietly becomes a worse `decolint`.** `devcontainer.json` permits comments and trailing commas; `JSON.parse` does not. A regex stripper mangles `//` inside string literals. Three options, in order of preference: (a) **don't parse it yourself** — shell out to `devcontainer read-configuration`, which already parses and merges, and check its output (costs the zero-dependency property, gains correctness); (b) write a real ~40-line character-scanner that tracks string state (defensible, testable, and roughly a quarter of the line budget); (c) abandon Phase 2 and contribute to `decolint` instead (Task 13). **A regex stripper is not on the list.** Decide this explicitly before writing a line, and record the choice in the README. Note also that full schema conformance is *not* on the table here: `devContainer.base.schema.json` is draft 2019-09 with `unevaluatedProperties: false` under a top-level `oneOf`, which rules out a stdlib implementation entirely.
- **Provenance header** on every report: `tool_version`, `corpus_version`, `generated_on`. Call it exactly that — **it is not tamper-evident**, it is self-reported, and anything (including a model writing a plausible report by hand) can emit the same three lines. What it actually buys is a *cheap, honest signal in the common case*: when the checker did not run, the header is absent, and a reader who knows to look for it can tell a real report from an improvised one. If that guarantee needs to be real rather than conventional, bind it to a hash of `rules.json` plus the input file — but do not claim the strong property until you have. If Gate C found code review cannot execute, document that the header is expected to be absent on that surface, so its absence there is not read as a failure.
- One printed line per tool that was **not** run, so "not checked" cannot read as "passed".
- SARIF output for GitHub code scanning, with Actions annotations as the fallback for repos without Advanced Security.
- A bijection test: every rule in `rules.json` has a check in the checker, and every check has a rule. No orphans in either direction.
- `fixtures/clean/` trips nothing; `fixtures/dirty/` trips a known ID list. **Note in the README that fixtures pass by construction and are not evidence of a low false-positive rate** — only Gate D's corpus is.
- Ship a recommended `.claude/settings.json` permissions snippet and a Copilot CLI `--allow-tool` line. **Do not call these "matching" — they are two different grammars solving the same problem separately**, and neither pre-authorises Copilot code review or VS Code agent mode, where tool approval is not a config file the repo controls. Say in the README exactly which surfaces each covers, so nobody assumes the two lines make the checker run everywhere.
- If Gate A found the installers flatten subdirectories, `bin/` is not reachable via `npx skills add` — publish to npm with a `bin` entry and make `npx <pkg> audit` the primary path instead.

---

## Task 13 (CONDITIONAL): The decolint contribution

Runs after Task 12, or instead of it if Gate D was clean but the maintenance cost of a second checker is judged too high.

`decolint` is the only standalone devcontainer linter (31 rules, Go) and already owns `--merge` effective-config resolution — the asset every candidate architecture declined to rebuild. Contribute the 5–8 semantic rules it lacks: lifecycle placement against prebuild boundaries, `waitFor` enum legality, label-storability, `${devcontainerId}` scoping, Codespaces divergence, `userEnvProbe`, root-owned named volumes.

Stated risk: 1 star, seven weeks old, requires `GOEXPERIMENT=jsonv2`, unknown bus factor. Mitigation: a rejected PR costs a day and reveals the bus factor, which is worth knowing before depending on it.

---

## Self-Review

**Spec coverage.** Every section of the brief maps to a task: the subject-repo assessment → this plan's framing and the explainer; the spec facts → Tasks 6 and 8; the Copilot surfaces → Tasks 3, 4, 7, 9, 11; the Claude surfaces → Tasks 7, 9, and `DC-CLAUDE-001`; prior art → Tasks 11 and 13. The critic's five missed facts are all placed: object-parallel lifecycle (`DC-LIFE-003`), `userEnvProbe` (`DC-ENV-001`), the `_REMOTE_USER` family (`DC-FEAT-003`), the Claude-in-devcontainer cluster (`DC-CLAUDE-001`), and the permissions snippet (Task 12).

**Known gaps, stated rather than hidden.** Three unserved jobs are *deliberately* out of scope at v0.1 and named in the README: Feature/Template authoring beyond a pointer to `devcontainer features test`; compose-specific semantic rules (anyone with a database in their dev environment is unserved); and migration ("bring our 2021 config to 2026", and the baselining problem when an existing working config produces 40 findings). Prebuild economics is framed as a rule but not computed as a cost model. These are scope decisions, not oversights — reopen them after Task 11 tells us whether anyone wants this at all.

**Type consistency.** Rule IDs are used identically in Tasks 6, 7, 10, 12 and the explainer. `corpus_version` appears in `SKILL.md` frontmatter metadata (Task 7) and in the checker header (Task 12) and must match.

---

## The case for doing less

This belongs in the plan, not a footnote, because the completeness critic made it well and it should be a live option at approval time.

Revealed demand is measurably near zero: afonsograca 1★ and abandoned at three months; decolint 1★; mmalyska 0★ and unlicensed; `awesome-copilot` has zero devcontainer files; `anthropics/skills` has none. The most-used devcontainer skill in the wild is a **generator** — people want a devcontainer created, not audited. Every architecture in the design exercise reasoned "the prior art is thin, therefore build a better one"; the alternative reading is that the prior art is thin because the market is thin.

The honest ladder, ascending in cost:

- **Rung 0** — nothing. Accept SchemaStore squiggles in the editor and a build error within minutes.
- **Rung 1** — the twelve facts in the `AGENTS.md` the team already has, plus one `@AGENTS.md` line in `CLAUDE.md` (Claude Code does not read AGENTS.md; Copilot does). Thirty minutes, reaches both hosts today, and **a fact you did not write down cannot rot.**
- **Rung 2** — Phase 1 of this plan: the same twelve facts as one portable `SKILL.md` with a source and a date on each.
- **Rung 3** — Phase 2, conditional on Gate D.

Rung 1 captures most of the value at roughly 2% of the cost, and no candidate architecture costed it. The case for Rung 2 over Rung 1 rests on three things: the citation and date discipline that keeps a corpus honest, three-level progressive disclosure so depth costs nothing until needed, and Task 11's upstream PR — which needs the corpus to exist in a reviewable form regardless.

**Obsolescence is scheduled, not hypothetical.** A `devcontainer validate` subcommand upstream (6–12 months, likely — the CLI shipped 0.86, 0.87 and 0.89 in 2026 alone) makes schema conformance a wrapper around one command. decolint growing eight semantic rules (3–9 months) makes the checker a wrapper around a binary we do not control. And the model learning the rules (12 months, certain) shrinks the corpus toward nothing. Phase 4 is the only proposed defence, and Task 11 is the only work whose value survives all three.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-31-devcontainer-agent-package.md`.**

Recommended execution shape for the next session:

- **Tasks 2–4 (Gates A–C) run in parallel** — three independent subagents, no shared state, ~2–3 hours total. They are cheap and each invalidates a different downstream assumption.
- **Task 5 (Gate D) runs as its own task**, budgeted at half a day to a day. Its hand-adjudication step cannot be delegated to a heuristic without defeating the point.
- **Tasks 6 and 7 run next, in parallel** (corpus and skill body), then a dedicated **citation-verification subagent** over Task 6. Nothing merges before that pass.
- **Task 5b (Gate E) is the Phase 1 exit criterion** and needs real terminals on all three surfaces. It cannot run before Tasks 6–7 exist in draft, and nothing downstream of it should start before it reports. **A zero-lift result ends the project at Rung 1, and that is a successful outcome, not a failure.**
- **Tasks 8–11 run in parallel once Gate E passes.** Task 10 needs real terminals.
- **Tasks 12–13 gate on Gates D and E together.**
- **Codex advises at each phase boundary**, time-boxed and non-blocking, with local review as the fallback. A failed Codex run is not a finding — check `rawOutput: ""` with `touchedFiles: []` before treating a non-zero exit as a review.

### What the first Codex advisory already changed

Its critique of this plan is folded in above rather than appended; the substantive corrections were:

| Codex point | Change made |
|---|---|
| `allowed-tools` **is** in the portable set — "four keys are the only legal set" is false | Global Constraints now says five portable keys, four shipped, and the omission is stated as a choice |
| "Read verbatim by all Copilot surfaces" overstates progressive disclosure | Architecture paragraph rewritten to "discovered by"; firing is now something Task 10 and Gate E measure |
| The pointer instructions file has an unproven mechanism | Task 9 now folds it into Gate E, with an explicit delete-if-inert rule |
| Gate D cannot fit 2–3 hours, and needs recall as well as FP | Gate D rebudgeted to half a day–day, recall measurement added |
| A stdlib JSONC parser is how you accidentally rebuild a worse decolint | Task 12 now forces an explicit three-way parser decision and rules the regex stripper out |
| The "tamper-evident header" is not tamper-evident | Renamed to provenance header, property honestly restated, hash-binding named as the real fix |
| "Matching" Claude/Copilot permission lines is a portability mirage | Reworded; the surfaces neither line covers are now named |
| Deleting rules the model knows is unsound | Replaced with `prompt_include: false` suppression — reversible, keeps IDs and SARIF baselines stable |
| **Missing: a blinded usefulness evaluation** | Added as **Gate E (Task 5b)**, and made the Phase 1 exit criterion |

The one place this plan **disagrees** with Codex: it keeps the upstream `awesome-copilot` PR as a first-class task rather than deferring it indefinitely, on the grounds that the rules' correctness is established by citation independently of whether the skill fires. It now gates on Gate E rather than running unconditionally in parallel — which concedes the sequencing without conceding the task.

Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.
**2. Inline Execution** — execute tasks in-session with checkpoints for review.

Which approach?
