# Plan: a mechanical lever for the Copilot bucketing short-circuit (corpus 0.3.0 → 0.4.0)

**Approved 2026-09-02.** Spec: the approved plan message in the session, restated here in full.
`docs/plans/RESUME.md`, `README.md` and `docs/gates/usefulness/results.md` (Round 3) are the
evidence base; where this plan and those disagree, those files win and the disagreement is a
finding.

## The finding this plan answers

Gate E round 3, 15 AUDIT-mode WITH runs: `claude` performed AUDIT's procedural input-check 9/9
and filed nothing unread as "checked, no finding"; `copilot` 0/6, filing 4 of 6 rules into
"checked, no finding" whose inputs it never read. The matched pair on T08b (same fixture,
corpus, prompt) is a **conjunct-1** failure: `DC-FEAT-002` is fully label-attested, so the
label conjunct was satisfied; Copilot filed it clean because it never opened the Feature.
T07 is the **conjunct-2** shape: five absence-dependent rules filed clean with the label
unpulled. Copilot filled every required *output shape* 15/15 (not-checked block, docker scout
row, tally) and skipped the one *procedure* with no output of its own 0/6.

**Lever:** an output requirement whose content is *copied* from the corpus, not derived from
`Detect` prose. Two halves:

1. `references/rules.md` gains one field per rule, **`Inputs:`**, enumerating what the
   `Detect` reads. It states what is true about the rule (its evidentiary preconditions); it
   is not an instruction about reporting.
2. `SKILL.md` AUDIT: step 5 copies the rule's `Inputs` line and marks each input read (where)
   or not read; a "checked, no finding" tally entry must carry that evidence
   (`DC-XXX-NNN  read: <input> (<where>), …`); an entry that cannot name every input is
   **not checked**.

The named prior candidate (`label-sensitivity: presence|absence`) is **not** implemented: it
mechanises conjunct 2 only, would not have moved the matched pair, and encodes a merge-time
reporting concept rather than a fact about the rule.

## Global Constraints (binding on every task; copy verbatim into reviewer dispatches)

- **Never mechanically re-flow `SKILL.md`.** It is 502 lines against a 500-line guideline on
  purpose. A reflow has silently dropped an item from an inline enumeration four times. Every
  edit to `SKILL.md` is surgical: the diff must touch only the lines the task names. Budget
  pressure is resolved by accepting the overage, never by reflowing.
- **The thirteen-item not-label-storable list in `SKILL.md`** (item 6 under "My changes
  aren't taking effect") **is fenced non-movable and its membership is not edited.** AUDIT's
  bucket table reads it and AUDIT does not load `spec-facts.md`.
- **The worked tally in `SKILL.md` ("The tally") and the eight-row not-checked block are not
  edited** in this plan. A future harness parses them.
- **Label-immunity is read off the reference's positive per-property marker, never derived
  by complement.** The thirteen-item list is the in-package source of that attestation. A
  property with no row is one the source is *silent* about, and silence is not immunity: for
  such a property the merged configuration (image metadata label) must be read.
- **Rules live only in `rules.md`.** No other file in the package restates a rule. `upstream/`
  is the one sanctioned projection and has no checker; it is regenerated whenever the corpus
  changes and `upstream/.generated-from` moves with it.
- **Do not add a count to prose that neither a check nor its own list can verify.**
- **Corpus bump policy**: this change is a **minor** bump, `0.3.0` → `0.4.0`. `corpus_version`
  is authoritative in `rules.md` and mirrored in `SKILL.md` frontmatter; check 3 must print OK.
- **Frontmatter stays four top-level keys**: `name`, `description`, `license`, `metadata`.
  Package `metadata.version` stays `0.1.0` unless a task says otherwise (none does).
- **No host-specific syntax** in `SKILL.md` or `references/*.md` (check 1 prints OK).
- **The seven host instruction files are kept byte-identical**: `CLAUDE.md`, `AGENTS.md`,
  `GEMINI.md`, `QODER.md`, `.windsurfrules`, `.kiro/steering/code-review-graph.md`. Editing one
  means syncing all; `md5 -q` on all six must print one hash.
- **Gate E rules**: never run in this repository; scratch tree under `/tmp`; five decoy skills
  installed; fresh session and fresh working directory per run; network-reachable tooling
  disabled in every run and the flags stated (`claude -p … --strict-mcp-config --mcp-config
  '{"mcpServers":{}}'`; `copilot -p … --disable-builtin-mcps`); contamination sweep of every
  raw trace for `Users/emildan/work/devcontainers`, `danemil`, `GATE-RESULTS`, `usefulness`.
- **Enumerations get a mechanical check.** A checker whose count stays flat across an edit
  that should have moved it is a bug in the checker: every new or extended check is proved to
  move on a deliberately broken scratch copy, and the proof is in the task report.
- **Git**: work on branch `inputs-lever` off `main`; commit per task with the standard
  trailers; **never push**; never commit to `main`.
- **No Codex advisory, no outward-facing action** (no PR, no push, no publish) in this plan.

## Task 1 — `Inputs:` field in `rules.md` + the two mechanical checks

Files: `.claude/skills/devcontainers/references/rules.md`, `tools/check-inputs.mjs` (new),
`README.md` (check 2 block and its prose, lines ~264–271 and the "Half two" bullet list),
`CLAUDE.md` and its five synced copies (check 2 block).

1. **Template.** In the fenced rule template in `rules.md`, add the line
   `  - **Inputs:** <what the Detect reads — config properties in backticks; files outside the config; the image metadata label when a property read is not on SKILL.md's not-label-storable list>`
   after `Verified` and before `Detect`, keeping the two-space indent (it is load-bearing for
   check 2).
2. **Every rule** gets `- **Inputs:** …` after its `Verified` line and before `Detect`. Rules
   for the content, in order of precedence:
   - Name every `devcontainer.json` property the `Detect` reads, in backticks, using the
     top-level property name (`build.args` is written `build.args`; the check collapses it to
     `build.*`). Include properties the `Detect` reads to *scope* the rule (`remoteUser` for
     `DC-PERF-001`, evidence of Claude Code for `DC-CLAUDE-001`).
   - Name every input outside the config the `Detect` reads: a Feature's
     `devcontainer-feature.json` (`DC-FEAT-001`), a Feature's `install.sh` (`DC-FEAT-002`,
     `DC-FEAT-003`), CI workflow evidence (`DC-USER-001`), prebuild evidence (`DC-LIFE-001`),
     the resolved install order / devcontainer CLI (`DC-FEAT-001`).
   - Name **the image metadata label** with the exact phrase `image metadata label` **iff**
     at least one property the rule reads is **not** on the thirteen-item list, phrased as a
     condition: "the image metadata label when `<property>` is absent from the file". A rule
     whose every property is on the list, or that reads no config property, must **not**
     name the label. Do not derive this by complement from any other list; the thirteen-item
     list is the positive attestation and is the only source.
   - `Inputs` states what is read. It carries no bucket names, no "presence/absence", no
     reporting instruction.
   - Keep each `Inputs` line factual and short; it is copied verbatim into audit reports.
3. **Check 2 extension.** In `README.md`, `CLAUDE.md` and the five synced copies, add `Inputs`
   to the field loop: `for fld in Severity Tier Source Quote Verified Inputs Detect Fix`.
   README's sentence "every field must print 12" still holds. Sync the six host files and
   prove `md5 -q` prints one hash.
4. **Check 5, new: `tools/check-inputs.mjs`** (Node, no dependencies, run as
   `node tools/check-inputs.mjs`, exit 0 on pass, 1 on any failure, prints one line per rule
   `DC-XXX-NNN  props=[…]  label-required=<yes|no>  label-named=<yes|no>  OK|FAIL`).
   - Parses the thirteen-item list from `SKILL.md` at runtime from the sentence beginning
     `Not label-storable:` under "My changes aren't taking effect" — never a hard-coded copy,
     never a hard-coded count. Fails loudly if the sentence is not found.
   - Strips fenced blocks from `rules.md` (same semantics as check 2's `awk`), parses each
     `### DC-` rule, its `Inputs` line and its `Detect` line.
   - For each rule: props = backticked identifiers in `Inputs` that are `devcontainer.json`
     property names (identifier chars, dots allowed; drop anything containing `/`, `.sh`,
     `.json`, `${`, spaces, or a `--` flag); collapse `build.<x>` to `build.*`.
     `label-required` = any prop not in the parsed list. `label-named` = `Inputs` contains
     the phrase `image metadata label`. FAIL when they differ. Also FAIL when a rule has no
     `Inputs` line, or when a backticked property present in `Detect` and matching the same
     identifier grammar is absent from `Inputs` — print that as a warning line, and treat it
     as FAIL only for identifiers that are on the thirteen-item list or appear elsewhere in
     `Inputs` of another rule (an under-inclusion of a known property). Document the
     limitation in the script header: `Detect` prose mentions properties it does not read,
     so the Detect-vs-Inputs comparison is advisory beyond that.
   - Prints a final line `12 rules checked` where 12 is **counted**, not written.
5. **Proof the checks move** (in the report, with commands and output): copy `rules.md` to the
   scratchpad, delete one rule's `Inputs` line, run check 2's loop → `Inputs` prints 11; run
   check 5 → FAIL for that rule. Second scratch: change one rule's `Inputs` to name the label
   where it must not → check 5 FAIL. Then run checks 1–5 on the real tree: all pass, check 2
   prints 12 for all eight fields.
6. **Version is NOT bumped in this task** (Task 3 does it).
7. Commit: `feat(corpus): add Inputs field per rule and the check that derives its label entries`.

Report: `.superpowers/sdd/2026-09-02-inputs-lever/task-1-report.md`. Include the per-rule
table (rule, props, label-required, label-named) and the proof-of-movement output.

## Task 2 — `SKILL.md` AUDIT: copy `Inputs`, justify the clean bucket

File: `.claude/skills/devcontainers/SKILL.md` only. Surgical edits; report the exact line
count before and after and `git diff --stat`.

1. **Procedure step 5** (currently "Walk the twelve rules … For each, first list the inputs its
   `Detect` names and mark each one read or not read — **then** pick the bucket. A rule whose
   inputs you never read cannot be "checked, no finding", however clean the config looks.")
   becomes, in substance: walk the twelve rules in order; for each, **copy its `Inputs` line**
   and mark every input **read (naming where you read it)** or **not read** — then pick the
   bucket. Keep the closing sentence. Do not derive inputs from `Detect`; the `Inputs` line is
   the list.
2. **Bucket table row 2** ("checked, no finding") becomes: you read every input on the rule's
   `Inputs` line, **and** every property it reads is label-immune or present in the file and
   winning. Row 3 unchanged.
3. **Immediately after the bucket table's explanatory paragraphs** (before "### The not-checked
   block"), add a short paragraph (target ≤ 5 lines) stating the evidence requirement: every
   "checked, no finding" entry in the tally is written as
   `DC-XXX-NNN  read: <input> (<where>), <input> (<where>) …` naming **every** input on the
   rule's `Inputs` line; an entry that cannot name every input is **not checked**, and a clean
   bucket with a bare count is not a tally. Where an `Inputs` line names the image metadata
   label conditionally, "read" means the image was pulled and the label read.
4. **"Working a row needs …" paragraph**: change "the `Detect`, the config, and whether each
   property it names is label-storable" to name the rule's `Inputs` line as the list of what
   to read, keeping the pointer to the not-label-storable list as the in-file source of
   label-storability and the sentence "A compound `Detect` is only as sound as its weakest
   conjunct." Nothing else in that paragraph moves.
5. **Untouched, verified by diff**: the frontmatter, the not-label-storable list, the eight-row
   not-checked block, the worked tally and the paragraph after it, every section outside AUDIT.
6. Run checks 1 and 3. Report line count (expected ~507; the overage is accepted per the
   standing rule and stated, not hidden). Run `diff <(git show HEAD:…SKILL.md) SKILL.md` and
   confirm every hunk is inside the AUDIT section.
7. Commit: `feat(skill): AUDIT copies each rule's Inputs line and justifies the clean bucket`.

Report: `.superpowers/sdd/2026-09-02-inputs-lever/task-2-report.md`.

## Task 3 — Corpus bump 0.4.0, upstream regeneration, check docs

Files: `rules.md` (`corpus_version`), `SKILL.md` frontmatter (`corpus_version` only — one
line), `upstream/awesome-copilot-devcontainers.instructions.md`, `upstream/.generated-from`,
`README.md`, `CLAUDE.md` + five synced copies.

1. `rules.md`: `corpus_version: 0.4.0`. `SKILL.md`: the frontmatter `corpus_version` line
   only. Check 3 prints `OK 0.4.0`.
2. **Upstream regeneration.** Re-derive the payload from `rules.md` at 0.4.0. The payload has
   no bucket procedure and carries no rule IDs, tiers or severities; the expected content diff
   is empty. If the regeneration wants to change anything, do **not** change it — record the
   proposed diff in the report as a Task-2-of-the-session decision for the owner. Sidecar:
   `corpus_version: 0.4.0`, `generated: 2026-09-02`. Check 4 prints two matching lines.
3. `README.md`: in "Checks" / "Body portability" add check 5 (`node tools/check-inputs.mjs`)
   with two sentences on what it derives and from where; in "The verification harness this
   package specifies" → "Half two", add a bullet that the `Inputs` field is the executed form
   of the availability conjunct and that check 5 is built (not "specified, not yet built");
   in `rules.md`'s own bump-policy prose nothing changes. `CLAUDE.md` "Checks to run after any
   edit": add check 5 as item 5, sync the five copies, `md5 -q` prints one hash.
4. Run checks 1–5; all pass.
5. Commit: `chore(corpus): bump to 0.4.0; regenerate upstream; document check 5`.

Report: `.superpowers/sdd/2026-09-02-inputs-lever/task-3-report.md`.

## Task 4 — Gate E round 4: the bucketing measurement

Scratch tree `/tmp/gate-e4`. **Never this repository.** The round-3 tree and its `run.sh` no
longer exist; rebuild from `docs/gates/usefulness/tasks.md` and the Round 2/3 sections of
`docs/gates/usefulness/results.md`.

**Pre-registered scope and criterion (do not change after the first run):**

- Tasks: the nine AUDIT-mode tasks — T01, T02, T03, T05, T07, T08b, T10, T11, T12.
- Surfaces: `claude -p`, `copilot -p`. Arm: **WITH only** (18 runs). Round 3's WITHOUT cells are
  reused as the control and this is recorded as a deviation.
- Invocations exactly as round 3 (`results.md` "Method"), including `--strict-mcp-config
  --mcp-config '{"mcpServers":{}}' --permission-mode bypassPermissions` on claude and
  `--allow-all-tools --no-color --disable-builtin-mcps --output-format json --log-level none`
  on copilot. Record CLI versions.
- **PASS** iff all of: (a) among copilot AUDIT runs where the skill fired, ≥ 5 of 6 (or the
  equivalent proportion if fewer fire — state the denominator) emit `read:` evidence lines in
  the clean bucket and file **zero** rules as "checked, no finding" whose inputs the trace
  shows unread; (b) claude stays 9 of 9 on both; (c) HARM = 0 against the reused round-3
  control; (d) the set of rule IDs in finding lines per fixture is identical to round 3's
  WITH runs on the same surface (finding set unchanged by a non-Detect bump) — any difference
  is reported line by line.
- **FAIL** → Task 5 documents the behaviour as a surface-dependent limitation; no third
  prose round.

Steps:

1. Build `/tmp/gate-e4/{fixtures,skills,runs,parked,raw}`. Fixtures for the nine tasks from
   `tasks.md` (T08b per `results.md` "T08 was void", with a **real** lockfile via
   `npm install --package-lock-only` and `npm ci --dry-run` verified; T11 and T12 per the
   Round 2 additions; T05 includes the volume mount and `remoteUser`; T10 the object-form
   hook). Copy `.claude/skills/devcontainers/` from the branch (checksums recorded before and
   after the runs, must be identical) plus the five decoys (`changelog`, `sql-review`,
   `terraform-modules`, `gha-workflows`, `api-docs`) with the descriptions in `tasks.md`.
2. Write `run.sh <task> <surface>` reproducing round 3's per-run setup: fresh run dir, copy
   fixture, copy all six skills, invoke, capture stdout/stderr/exit/timing/skills-offered.
3. Run the 18. Sweep every raw trace for the four contamination strings; report the count.
4. Grade each run: fired (trace, not answer text); correctness against the `tasks.md` label;
   finding-line rule IDs; **the bucketing measurement** — did it emit `read:` evidence, did
   every clean-bucket entry name every input on the rule's `Inputs` line, and does the trace
   show each named input actually opened (a `read:` claim with no matching file read in the
   trace is a **hallucinated evidence** count, reported separately). Produce the same three
   tables as round 3's "The availability conjunct" section, plus the hallucinated-evidence
   count.
5. Copy the raw traces into `.superpowers/sdd/2026-09-02-inputs-lever/gate-e4-raw/` (they are
   git-ignored workspace, not committed) and write the grading to
   `.superpowers/sdd/2026-09-02-inputs-lever/task-4-report.md` with verbatim excerpts of the
   decisive runs (the T08b pair and the T07 copilot run at minimum).
6. Leave `/tmp/gate-e4` in place until Task 5 is reviewed; note that in the report.
7. Nothing in the repo is edited in this task; no commit.

## Task 5 — Record the round; update the decision record

Files: `docs/gates/usefulness/results.md` (new `# ROUND 4` section at the end, in the same
register as Round 3), `docs/gates/GATE-RESULTS.md` (a "Gate E round 4" subsection and an update
to "THE AVAILABILITY CONJUNCT…"), `README.md` ("Evaluation state, as of corpus `0.4.0`" and the
Gate E decision-record paragraph), `docs/plans/RESUME.md` (rewrite "What is actually left" and
the status line), and — **only on FAIL** — `SKILL.md` and `README.md` gain the
surface-dependent-limitation note (one sentence in AUDIT's bucket section, one paragraph in
README; surgical edits, reported line count).

1. Every number written is copied from `task-4-report.md`; no number is written into prose
   that the report does not contain. The deviation (reused control) is stated. The network
   mitigation is stated by flag name for both surfaces.
2. The pre-registered criterion is quoted and the outcome stated against it.
3. `RESUME.md` states: corpus `0.4.0`, package `0.1.0`, branch `inputs-lever` unpushed, what
   Task 2 of the session (upstream PR) still needs from the owner.
4. Run checks 1–5; all pass.
5. Commit: `test: gate E round 4 at 0.4.0 — <PASS|FAIL one-liner>` and, if docs only,
   `docs: bring the decision record current through round 4`.

Report: `.superpowers/sdd/2026-09-02-inputs-lever/task-5-report.md`.
