# Harness Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute section 3 of `docs/ARCHITECTURE-REVIEW.md`: make the package's verification harness complete, tested and run in CI, realign the Gate D heuristics with the current corpus, and collapse the seven-way instruction-file fan-out to one source.

**Architecture:** The shipped skill (`.claude/skills/devcontainers/`) is untouched. Everything here is tooling and workspace configuration around it: `tools/check-skill.sh` gains a sixth check, the two `.mjs` tools become importable modules with `node:test` suites, a GitHub Actions job runs all of it, and five host-specific instruction files become symlinks to `AGENTS.md`.

**Tech Stack:** bash, Node 22+ (`node:test`, `node:assert/strict`), GitHub Actions, git symlinks.

**Spec:** `docs/ARCHITECTURE-REVIEW.md` §3 (3.2–3.6) and §2 (P3, P6).

**Executed:** 2026-09-02, merged as `e5d4c00`. `2026-09-02-harness-consolidation-ledger.md`,
beside this file, records the rulings taken during execution and the five review findings
left deferred.

## Global Constraints

- **Never edit** `.claude/skills/devcontainers/SKILL.md`, `references/rules.md`, `references/spec-facts.md`, or `upstream/`. Read them; do not write them.
- Every commit must leave `tools/check-skill.sh` exiting 0.
- Rule IDs are a published interface: do not add a `DC-` id to `rules.md`; `DC-FEAT-PIN` stays a *candidate* measured by the harness, never a rule.
- Corpus version stays `0.3.0`; package version stays `0.1.0`. Nothing in this plan changes what the skill emits.
- Commit after every task with the trailer:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01VkUAjYQCjFdM3Q7bp2VkW4
  ```
- Work on branch `refactor/harness-consolidation` (already checked out). Do not push.
- macOS `sed -i` needs `-i ''`; prefer writing files whole or using the Edit tool over `sed -i`.

---

### Task 1: Express the harvest-artefact intent in `.gitignore`

The three tracked files under `docs/gates/.harvest/` are currently tracked only by a past `git add -f`; the ignore file says the whole directory is ignored. Replace that with negation patterns so a plain `git add` works and the intent is in the file.

**Files:**
- Modify: `.gitignore`

**Interfaces:**
- Produces: nothing code-facing; `git check-ignore` behaviour changes.

- [ ] **Step 1: Verify the current (wrong) state**

Run:
```bash
git check-ignore -v docs/gates/.harvest/harvest.sh; echo "exit=$?"
```
Expected: prints `.gitignore:6:docs/gates/.harvest/	docs/gates/.harvest/harvest.sh` and `exit=0` (ignored, despite being tracked).

- [ ] **Step 2: Rewrite `.gitignore`**

Replace the whole file with:

```gitignore
# Added by code-review-graph
.code-review-graph/

# Gate D corpus: reproducible from docs/gates/gate-d.md, not committed.
# The harvest directory is ignored EXCEPT the two scripts and the deduplicated
# hit list, which are the expensive-to-recreate inputs (see README, "Also in
# this repository"). Everything else in there is derived on each run.
docs/gates/fp-corpus/
docs/gates/.harvest/*
!docs/gates/.harvest/harvest.sh
!docs/gates/.harvest/fetch.sh
!docs/gates/.harvest/hits.uniq.tsv

# Cached copy of a third-party docs page (code.claude.com), kept locally for
# offline verification but not redistributed. DC-CLAUDE-001 cites the live URL.
docs/sources/devcontainer.md
```

- [ ] **Step 3: Verify the new state**

Run:
```bash
for f in harvest.sh fetch.sh hits.uniq.tsv; do git check-ignore -q docs/gates/.harvest/$f && echo "STILL IGNORED $f" || echo "tracked-ok $f"; done
for f in hits.tsv blobs.tsv harvest.log; do git check-ignore -q docs/gates/.harvest/$f && echo "ignored-ok $f" || echo "NOT IGNORED $f"; done
git check-ignore -q docs/gates/fp-corpus/x.json && echo "ignored-ok fp-corpus" || echo "NOT IGNORED fp-corpus"
git status --short
```
Expected: three `tracked-ok`, three `ignored-ok`, `ignored-ok fp-corpus`, and `git status` shows only ` M .gitignore` (no harvest files appear as untracked).

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: express the harvest-artefact exceptions in .gitignore

The two scripts and hits.uniq.tsv were tracked only by a past force-add.
Negation patterns say the same thing in the ignore file itself.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VkUAjYQCjFdM3Q7bp2VkW4"
```

---

### Task 2: Sixth check — the not-label-storable list agrees across the two files

The list lives in `SKILL.md` (canonical, under "My changes aren't taking effect") and is reproduced in `spec-facts.md` (section 4, "What the label never carries"). Both are prose lists of back-ticked names ending in a period. Nothing verifies they agree. Add a check that extracts both, requires thirteen items, and requires the sets to be equal.

**Files:**
- Modify: `tools/check-skill.sh` (append check 6 before `exit "$status"`; add `SPEC_FACTS` variable next to `RULES`)

**Interfaces:**
- Consumes: `ok`, `fail`, `$SKILL`, `$SKILL_DIR`, `$status` already defined in the script.
- Produces: a line `OK    label list: 13 items, both copies agree` on success.

- [ ] **Step 1: Confirm the anchors exist and see the raw lists**

Run:
```bash
S=.claude/skills/devcontainers/SKILL.md; F=.claude/skills/devcontainers/references/spec-facts.md
sed -n '/Not label-storable:/,/`\.$/p' "$S" | sed 's/.*Not label-storable://' | grep -oE '`[^`]+`' | sort | tr '\n' ' '; echo
sed -n '/^`name`, `initializeCommand`/,/`\.$/p' "$F" | grep -oE '`[^`]+`' | sort | tr '\n' ' '; echo
```
Expected: two identical lines of thirteen back-ticked names each (`appPort`, `build.*`, `dockerComposeFile`, `features`, `image`, `initializeCommand`, `name`, `overrideFeatureInstallOrder`, `runArgs`, `runServices`, `service`, `workspaceFolder`, `workspaceMount`).

- [ ] **Step 2: Add the variable and the check**

In `tools/check-skill.sh`, after the line `RULES="$SKILL_DIR/references/rules.md"` add:
```bash
SPEC_FACTS="$SKILL_DIR/references/spec-facts.md"
LABEL_LIST_SIZE=13   # spec-facts.md §4 argues the number; this pins it
```

Update the header comment's numbered list to include:
```
#   6. label list       the not-label-storable list is thirteen items in both files and identical
```

Insert before `exit "$status"`:
```bash
# --- 6. label-list agreement -------------------------------------------------
# The not-label-storable list is deliberately duplicated: AUDIT reads it from
# SKILL.md and never loads spec-facts.md. Both copies are prose lists ending in
# a period. Extract, sort, compare.
skill_list=$(sed -n '/Not label-storable:/,/`\.$/p' "$SKILL" | sed 's/.*Not label-storable://' | grep -oE '`[^`]+`' | sort)
facts_list=$(sed -n '/^`name`, `initializeCommand`/,/`\.$/p' "$SPEC_FACTS" | grep -oE '`[^`]+`' | sort)
skill_n=$(printf '%s\n' "$skill_list" | grep -c .)
if [ "$skill_n" -ne "$LABEL_LIST_SIZE" ]; then
  fail "label list: SKILL.md copy has $skill_n items, expected $LABEL_LIST_SIZE"
elif [ "$skill_list" != "$facts_list" ]; then
  fail "label list: SKILL.md and spec-facts.md copies differ: $(comm -3 <(printf '%s\n' "$skill_list") <(printf '%s\n' "$facts_list") | tr -s '\t\n' ' ')"
else
  ok "label list: $skill_n items, both copies agree"
fi
```

- [ ] **Step 3: Run the check on the real tree**

Run: `tools/check-skill.sh; echo "exit=$?"`
Expected: six `OK` lines, the last being `OK    label list: 13 items, both copies agree`, `exit=0`.

- [ ] **Step 4: Negative-test against a mutated copy**

Run:
```bash
T=$(mktemp -d); mkdir -p $T/tools $T/upstream $T/.claude/skills/devcontainers/references
cp tools/check-skill.sh $T/tools/; cp .claude/skills/devcontainers/SKILL.md $T/.claude/skills/devcontainers/
cp .claude/skills/devcontainers/references/*.md $T/.claude/skills/devcontainers/references/; cp upstream/.generated-from $T/upstream/
python3 - "$T/.claude/skills/devcontainers/references/spec-facts.md" <<'PY'
import sys; p=sys.argv[1]; s=open(p).read().replace("`runArgs`, `workspaceMount`", "`workspaceMount`", 1); open(p,'w').write(s)
PY
$T/tools/check-skill.sh; echo "exit=$?"; rm -rf $T
```
Expected: `FAIL  label list: SKILL.md and spec-facts.md copies differ: ...runArgs...` and `exit=1`.

- [ ] **Step 5: Commit**

```bash
git add tools/check-skill.sh
git commit -m "test: check that the not-label-storable list agrees across SKILL.md and spec-facts.md

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VkUAjYQCjFdM3Q7bp2VkW4"
```

---

### Task 3: Realign the Gate D heuristics with corpus 0.3.0 and put them under test

`docs/gates/fp-measure.mjs` carries four heuristics; three no longer match the `Detect` steps in `rules.md` (see review §2 P3). Make the module importable, write failing tests that encode the *current* corpus semantics, then rewrite the predicates until they pass. `DC-FEAT-PIN` stays as a candidate.

**Files:**
- Modify: `docs/gates/fp-measure.mjs`
- Create: `docs/gates/fp-measure.test.mjs`
- Modify: `docs/gates/gate-d.md` (append one dated note)

**Interfaces:**
- Produces (exports from `fp-measure.mjs`):
  - `parseJsonc(text: string): unknown`
  - `HEURISTICS: Array<{ id: string, proxyFor: string | null, test: (config) => boolean }>`
  - `measure(corpusDir: string): { hits: Record<string, string[]>, totals: { parsed: number, failed: number } }`
- The CLI behaviour (`node docs/gates/fp-measure.mjs <dir>`) and its output format are unchanged.

- [ ] **Step 1: Make the module importable without running `main`**

In `docs/gates/fp-measure.mjs`, change the imports at the top to:
```js
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
```
Replace the last line `process.exit(main(process.argv));` with:
```js
export { parseJsonc, HEURISTICS, measure };

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(main(process.argv));
```
Run: `node -e "import('./docs/gates/fp-measure.mjs').then(m => console.log(Object.keys(m).join(',')))"`
Expected: `HEURISTICS,measure,parseJsonc` (any order), and the process exits 0 without printing usage.

- [ ] **Step 2: Write the failing tests**

Create `docs/gates/fp-measure.test.mjs`:
```js
// node --test docs/gates/fp-measure.test.mjs
// Encodes the Detect semantics of corpus 0.3.0 for the three rule-backed
// heuristics, plus the DC-FEAT-PIN candidate. When rules.md changes a Detect,
// change the matching test here first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseJsonc, HEURISTICS, measure } from './fp-measure.mjs';

const fires = Object.fromEntries(HEURISTICS.map((h) => [h.id, h.test]));

test('parseJsonc: comments and trailing commas go, // inside strings stays', () => {
  const src = `{
    // line comment
    "name": "a//b and http://x", /* block */
    "list": [1, 2,],
  }`;
  assert.deepEqual(parseJsonc(src), { name: 'a//b and http://x', list: [1, 2] });
});

// ---- DC-LIFE-001: expensive install in postCreateCommand while onCreate/updateContent are absent or trivial
test('DC-LIFE-001 fires: npm ci in postCreateCommand, no onCreateCommand', () => {
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: 'npm ci && echo ok' }), true);
});
test('DC-LIFE-001 fires on the object form', () => {
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: { deps: ['poetry', 'install'], other: 'echo' } }), true);
});
test('DC-LIFE-001 fires on apt-get install and make (corpus list, not the old regex)', () => {
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: 'sudo apt-get install -y jq' }), true);
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: 'make' }), true);
});
test('DC-LIFE-001 silent when onCreateCommand already carries real work', () => {
  assert.equal(fires['DC-LIFE-001']({ onCreateCommand: 'npm ci', postCreateCommand: 'npm ci' }), false);
});
test('DC-LIFE-001 silent when updateContentCommand carries real work', () => {
  assert.equal(fires['DC-LIFE-001']({ updateContentCommand: ['npm', 'ci'], postCreateCommand: 'npm ci' }), false);
});
test('DC-LIFE-001 silent with no install at all', () => {
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: 'echo hello' }), false);
});

// ---- DC-SEC-001: the VALUE decides, never the key
test('DC-SEC-001 silent on ${localEnv:} under a secret-shaped key (the Gate E harm case)', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { GITHUB_TOKEN: '${localEnv:GITHUB_TOKEN}' } }), false);
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { API_KEY: '${localEnv:API_KEY:default}' } }), false);
  assert.equal(fires['DC-SEC-001']({ containerEnv: { PASSWORD: '${containerEnv:PW}' } }), false);
});
test('DC-SEC-001 fires on a recognisable credential prefix under ANY key', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { FOO: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789' } }), true);
  assert.equal(fires['DC-SEC-001']({ containerEnv: { X: 'AKIAIOSFODNN7EXAMPLE' } }), true);
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { DB: 'postgres://user:s3cret@host/db' } }), true);
});
test('DC-SEC-001 fires on a low-entropy literal under a secret-shaped key', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { PASSWORD: 'hunter2' } }), true);
});
test('DC-SEC-001 silent on obvious placeholders under a secret-shaped key', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { API_KEY: 'changeme' } }), false);
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { API_KEY: '<your-key-here>' } }), false);
});
test('DC-SEC-001 silent on a plain literal under a non-secret key', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { NODE_ENV: 'production', PORT: '3000' } }), false);
});
test('DC-SEC-001 also reads build.args with the same value test', () => {
  assert.equal(fires['DC-SEC-001']({ build: { args: { NPM_TOKEN: 'npm_abcdefghijklmnopqrstuvwxyz012345' } } }), true);
  assert.equal(fires['DC-SEC-001']({ build: { args: { NPM_TOKEN: '${localEnv:NPM_TOKEN}' } } }), false);
});

// ---- DC-PERF-001: volume mount + non-root user + no chown
const volumeMount = 'source=x-node_modules,target=/w/node_modules,type=volume';
test('DC-PERF-001 fires: volume mount, non-root remoteUser, no chown', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: [volumeMount], remoteUser: 'vscode', postCreateCommand: 'npm ci' }), true);
});
test('DC-PERF-001 fires on the object mount form and on workspaceMount', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: [{ source: 'v', target: '/w', type: 'volume' }], containerUser: 'node' }), true);
  assert.equal(fires['DC-PERF-001']({ workspaceMount: 'source=ws,target=/w,type=volume', remoteUser: 'vscode' }), true);
});
test('DC-PERF-001 silent when the container runs as root (no user set, or root)', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: [volumeMount] }), false);
  assert.equal(fires['DC-PERF-001']({ mounts: [volumeMount], remoteUser: 'root' }), false);
});
test('DC-PERF-001 silent when postCreateCommand chowns', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: [volumeMount], remoteUser: 'vscode', postCreateCommand: { fix: 'sudo chown -R vscode /w/node_modules' } }), false);
});
test('DC-PERF-001 silent on a bind mount', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: ['source=/h,target=/w,type=bind'], remoteUser: 'vscode' }), false);
});

// ---- DC-FEAT-PIN: candidate, not a corpus rule
test('DC-FEAT-PIN is a candidate (proxyFor null) and flags unpinned or :latest features', () => {
  const h = HEURISTICS.find((x) => x.id === 'DC-FEAT-PIN');
  assert.equal(h.proxyFor, null);
  assert.equal(h.test({ features: { 'ghcr.io/devcontainers/features/node:1': {} } }), false);
  assert.equal(h.test({ features: { 'ghcr.io/devcontainers/features/node': {} } }), true);
  assert.equal(h.test({ features: { 'ghcr.io/devcontainers/features/node:latest': {} } }), true);
});

// ---- measure(): counts and unparseable
test('measure counts parsed, unparseable and per-heuristic hits', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fp-'));
  try {
    writeFileSync(join(dir, 'a.json'), '{ "postCreateCommand": "npm ci", }');
    writeFileSync(join(dir, 'b.json'), '{ not json');
    writeFileSync(join(dir, 'c.json'), '{ "postCreateCommand": "echo" }');
    const { hits, totals } = measure(dir);
    assert.deepEqual(totals, { parsed: 2, failed: 1 });
    assert.deepEqual(hits['DC-LIFE-001'], ['a.json']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test docs/gates/fp-measure.test.mjs 2>&1 | tail -15`
Expected: several failures. At minimum `DC-LIFE-001 fires on apt-get install and make`, `DC-LIFE-001 silent when onCreateCommand already carries real work`, `DC-SEC-001 fires on a recognisable credential prefix under ANY key`, `DC-SEC-001 silent on obvious placeholders`, `DC-PERF-001 silent when the container runs as root` fail. `parseJsonc` and `measure` tests pass.

- [ ] **Step 4: Rewrite the heuristics section**

In `docs/gates/fp-measure.mjs`, replace everything from the line `const SECRET_SHAPED_KEY = ...` through the end of the `HEURISTICS` array with:

```js
// Corpus 0.3.0 DC-LIFE-001 Detect: the cacheable, expensive setup commands.
const INSTALL_COMMAND = /\b(npm (ci|install)|yarn install|pnpm install|pip install|poetry install|bundle install|go mod download|cargo fetch|apt-get install|make|gradle|mvn)\b/;

// A lifecycle hook is "trivial" for DC-LIFE-001 when absent or empty. The
// corpus leaves "trivial" to judgement; this is the proxy's reading of it.
const isTrivialHook = (command) => flattenCommand(command).trim() === '';

// Corpus 0.3.0 DC-SEC-001 Detect. Order matters and mirrors the rule:
//   1. substitution reference  -> never a finding, whatever the key
//   2. recognisable credential -> finding, whatever the key
//   3. secret-shaped key       -> finding unless an obvious placeholder
//   4. anything else           -> not a finding
const SUBSTITUTION = /^\$\{(localEnv|containerEnv):/;
const CREDENTIAL_LITERAL = /^(sk_|ghp_|github_pat_|AKIA|xoxb-|glpat-|npm_)|-----BEGIN [A-Z ]*PRIVATE KEY|:\/\/[^/@\s]+:[^@\s]+@/;
const SECRET_SHAPED_KEY = /TOKEN|SECRET|KEY|PASSWORD|PASSWD|CREDENTIAL|_PAT\b/i;
const PLACEHOLDER = /^(changeme|change-me|replace-me|xxx+|todo|<[^>]*>|\$\{?[A-Z_]+\}?)$/i;

function isCredentialEntry([key, rawValue]) {
  const value = String(rawValue ?? '');
  if (SUBSTITUTION.test(value)) return false;
  if (CREDENTIAL_LITERAL.test(value)) return true;
  if (SECRET_SHAPED_KEY.test(key)) return value !== '' && !PLACEHOLDER.test(value);
  return false;
}

const envEntries = (d) => [
  ...Object.entries(d.remoteEnv || {}),
  ...Object.entries(d.containerEnv || {}),
  ...Object.entries((d.build && d.build.args) || {}),
];

// Corpus 0.3.0 DC-PERF-001 Detect: a volume mount, a non-root user, no chown.
const mountAsString = (m) => (typeof m === 'string' ? m : JSON.stringify(m));
const isVolume = (m) => /type=volume|"type":"volume"/.test(mountAsString(m));
const hasVolumeMount = (d) => (d.mounts || []).some(isVolume) || (d.workspaceMount != null && isVolume(d.workspaceMount));
const runsAsNonRoot = (d) => [d.remoteUser, d.containerUser].some((u) => typeof u === 'string' && u !== '' && u !== 'root');

/**
 * Each heuristic: an output id, the corpus rule it approximates (or null for a
 * candidate rule that is not in the corpus), and a predicate over the parsed
 * config. Predicates may throw on odd shapes; the runner counts that as "did
 * not fire". Semantics are pinned by fp-measure.test.mjs.
 */
const HEURISTICS = [
  {
    id: 'DC-LIFE-001',
    proxyFor: 'DC-LIFE-001 ("trivial" hook read as absent-or-empty)',
    test: (d) =>
      INSTALL_COMMAND.test(flattenCommand(d.postCreateCommand))
      && isTrivialHook(d.onCreateCommand)
      && isTrivialHook(d.updateContentCommand),
  },
  {
    id: 'DC-SEC-001',
    proxyFor: 'DC-SEC-001 (value-keyed; prefix list is the rule\'s own)',
    test: (d) => envEntries(d).some(isCredentialEntry),
  },
  {
    id: 'DC-PERF-001',
    proxyFor: 'DC-PERF-001',
    test: (d) =>
      hasVolumeMount(d)
      && runsAsNonRoot(d)
      && !/chown/.test(flattenCommand(d.postCreateCommand)),
  },
  {
    id: 'DC-FEAT-PIN',
    proxyFor: null, // candidate rule; not a corpus ID (see docs/gates/gate-d.md)
    test: (d) => Object.keys(d.features || {}).some((f) => !/[:@]/.test(f) || /:latest$/.test(f)),
  },
];
```

Also delete the now-unused line `const LOCAL_ENV_SUBSTITUTION = ...` if it survives, and update the file's header comment: replace the sentence beginning `(DC-SEC-001 below is the clearest case:` through `stand in for.` with `Their semantics are pinned to corpus 0.3.0 by fp-measure.test.mjs; when a Detect changes, change the test first.`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test docs/gates/fp-measure.test.mjs 2>&1 | tail -8`
Expected: `# pass 20`, `# fail 0` (zero failures is the requirement).

- [ ] **Step 6: Confirm the CLI still works and the checks still pass**

Run:
```bash
D=$(mktemp -d); printf '{ "postCreateCommand": "npm ci" }' > $D/a.json; printf 'nope' > $D/b.json
node docs/gates/fp-measure.mjs $D; rm -rf $D
node docs/gates/fp-measure.mjs; echo "usage exit=$?"
tools/check-skill.sh | tail -1
```
Expected:
```
parsed=1 unparseable=1
DC-LIFE-001	1	100.0%	a.json
usage: node docs/gates/fp-measure.mjs <corpus-dir>
usage exit=2
OK    label list: 13 items, both copies agree
```

- [ ] **Step 7: Record the realignment in `gate-d.md`**

Append to the end of `docs/gates/gate-d.md`:

```markdown

---

## 2026-09-02 — heuristics realigned to corpus `0.3.0`

The harness was written verbatim from the brief before Gate E ran. Gate E round 3 changed
`DC-SEC-001`'s `Detect` from name-keyed to value-keyed; the harness had not followed. All
three rule-backed heuristics now mirror the `0.3.0` `Detect` text and are pinned by
`docs/gates/fp-measure.test.mjs` (`node --test docs/gates/fp-measure.test.mjs`).
`DC-FEAT-PIN` is unchanged and is still a candidate, not a rule. **No numbers were produced;
the corpus is still empty.** When Gate D runs, run it against this version of the harness
or later, never the one the brief specified.
```

- [ ] **Step 8: Commit**

```bash
git add docs/gates/fp-measure.mjs docs/gates/fp-measure.test.mjs docs/gates/gate-d.md
git commit -m "test: pin the Gate D heuristics to corpus 0.3.0 and realign them

DC-SEC-001 was still name-keyed, the harm case Gate E round 3 removed
from the corpus. DC-LIFE-001 used a command list that matched neither
the Detect text nor a subset of it, and DC-PERF-001 ignored the non-root
precondition. fp-measure.mjs is now importable and fp-measure.test.mjs
encodes each Detect; the CLI and its output format are unchanged.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VkUAjYQCjFdM3Q7bp2VkW4"
```

---

### Task 4: Put `wf-preflight.mjs` under test

Same importability change as Task 3, then a small `node:test` suite covering the three fixture shapes used to verify the refactor (parse failure, nested multi-line template, clean).

**Files:**
- Modify: `tools/wf-preflight.mjs` (exports + direct-invocation guard)
- Create: `tools/wf-preflight.test.mjs`

**Interfaces:**
- Produces (exports): `parseError(src: string): string | null`, `findMultilineTemplates(src: string): Array<{ line: number, lines: number }>`.

- [ ] **Step 1: Make the module importable**

In `tools/wf-preflight.mjs`, change the imports to:
```js
import fs from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
```
Replace the last line `process.exit(main(process.argv));` with:
```js
export { parseError, findMultilineTemplates };

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(main(process.argv));
```

- [ ] **Step 2: Write the tests**

Create `tools/wf-preflight.test.mjs`:
```js
// node --test tools/wf-preflight.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseError, findMultilineTemplates } from './wf-preflight.mjs';

const BROKEN = [
  "export const meta = { name: 'x', description: 'y' }",
  "const r = await agent(`Review the `customizations` namespace.`, { label: 'a' })",
  'return r',
].join('\n');

const NESTED = [
  "export const meta = { name: 'x', description: 'y' }",
  '// a comment with a ` backtick and "quote"',
  'const p = `line one',
  "line two ${'inner ' + `nested",
  'tpl`} end`',
  'const s = "double \\" quoted"; const t = \'single \\\' quoted\'',
  'const q = `single line ${1}`',
  'return await agent(p, { label: `l:${t}` })',
].join('\n');

const CLEAN = [
  "export const meta = { name: 'x', description: 'y' }",
  '/* block ` comment */',
  'const p = ["line one with `code`", "line two ${vars}"].join("\\n")',
  'return await agent(p, { label: `l` })',
].join('\n');

test('parseError: a markdown backtick inside a template prompt is a parse failure', () => {
  const err = parseError(BROKEN);
  assert.ok(err, 'expected a message');
  assert.match(err, /customizations/);
});

test('parseError: export const meta and top-level await are accepted', () => {
  assert.equal(parseError(NESTED), null);
  assert.equal(parseError(CLEAN), null);
});

test('findMultilineTemplates: reports the outer literal at its own line, and the nested one', () => {
  const found = findMultilineTemplates(NESTED).sort((a, b) => a.line - b.line);
  assert.deepEqual(found, [{ line: 3, lines: 3 }, { line: 4, lines: 2 }]);
});

test('findMultilineTemplates: single-line templates, strings and comments are ignored', () => {
  assert.deepEqual(findMultilineTemplates(CLEAN), []);
});

test('findMultilineTemplates: an unterminated block comment does not loop', () => {
  assert.deepEqual(findMultilineTemplates('const a = 1 /* never closed'), []);
});
```

- [ ] **Step 3: Run the tests**

Run: `node --test tools/wf-preflight.test.mjs 2>&1 | tail -6`
Expected: `# pass 5`, `# fail 0`. If the nested-template test fails on line numbers, the module's template-start stack is wrong — do not adjust the test.

- [ ] **Step 4: Confirm the CLI is unchanged**

Run:
```bash
printf 'export const meta = { name: "x", description: "y" }\nreturn await agent("hi")\n' > /tmp/wf-ok.js
node tools/wf-preflight.mjs /tmp/wf-ok.js; echo "exit=$?"; node tools/wf-preflight.mjs; echo "usage exit=$?"; rm /tmp/wf-ok.js
```
Expected: `PARSE: ok`, `CONVENTION: ok - no multi-line template literals.`, `exit=0`, then the usage line and `usage exit=2`.

- [ ] **Step 5: Commit**

```bash
git add tools/wf-preflight.mjs tools/wf-preflight.test.mjs
git commit -m "test: cover wf-preflight's parse check and template scanner

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VkUAjYQCjFdM3Q7bp2VkW4"
```

---

### Task 5: Run the harness in CI

**Files:**
- Create: `.github/workflows/checks.yml`

**Interfaces:**
- Consumes: `tools/check-skill.sh` (exit-coded), the two `*.test.mjs` suites, the four shell scripts.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/checks.yml`:
```yaml
# The package invariants and the tooling's own tests. Everything here is
# runnable locally with the same commands; CI only makes "all checks pass"
# a fact rather than a claim.
name: checks

on:
  push:
  pull_request:

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Package invariants
        run: tools/check-skill.sh

      - name: Shell syntax
        run: |
          for f in docs/gates/.harvest/harvest.sh docs/gates/.harvest/fetch.sh \
                   .gemini/hooks/crg-session-start.sh .gemini/hooks/crg-update.sh \
                   tools/check-skill.sh; do
            bash -n "$f" || exit 1
          done

      - name: Node syntax
        run: |
          node --check tools/wf-preflight.mjs
          node --check docs/gates/fp-measure.mjs

      - name: Tool tests
        run: node --test tools/wf-preflight.test.mjs docs/gates/fp-measure.test.mjs
```

- [ ] **Step 2: Validate the YAML and run every step locally**

Run:
```bash
ruby -ryaml -e 'YAML.load_file(".github/workflows/checks.yml"); puts "yaml ok"'
tools/check-skill.sh | tail -1
for f in docs/gates/.harvest/harvest.sh docs/gates/.harvest/fetch.sh .gemini/hooks/crg-session-start.sh .gemini/hooks/crg-update.sh tools/check-skill.sh; do bash -n "$f" || echo "SYNTAX $f"; done; echo "bash -n done"
node --check tools/wf-preflight.mjs && node --check docs/gates/fp-measure.mjs && echo "node --check ok"
node --test tools/wf-preflight.test.mjs docs/gates/fp-measure.test.mjs 2>&1 | grep -E '^# (pass|fail)'
```
Expected: `yaml ok`, the label-list OK line, `bash -n done` with no `SYNTAX` lines, `node --check ok`, `# pass N` and `# fail 0`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/checks.yml
git commit -m "ci: run the package invariants and tool tests on every push

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VkUAjYQCjFdM3Q7bp2VkW4"
```

---

### Task 6: Collapse the instruction-file fan-out to `AGENTS.md`

Six files are byte-identical (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `QODER.md`, `.windsurfrules`, `.kiro/steering/code-review-graph.md`). Keep `AGENTS.md` as the only real file; the other five become symlinks. Then, in `AGENTS.md`, point the "Checks to run" section at `tools/check-skill.sh` and delete the inline shell, and update the "Workspace configuration" bullet. `README.md` gets a one-line pointer in its checks section; its argued shell stays because it is the rationale, not the harness.

**Files:**
- Modify: `AGENTS.md` (title, "Checks to run after any edit to the skill" section, "Workspace configuration" first bullet)
- Replace with symlinks: `CLAUDE.md`, `GEMINI.md`, `QODER.md`, `.windsurfrules`, `.kiro/steering/code-review-graph.md`
- Modify: `README.md` (one sentence after the "Body portability" heading paragraph; one bullet under "Also in this repository")

**Interfaces:**
- Produces: `AGENTS.md` is the single source; all hosts read it through their own filename.

- [ ] **Step 1: Prove the six files are identical before touching anything**

Run:
```bash
for f in CLAUDE.md GEMINI.md QODER.md .windsurfrules .kiro/steering/code-review-graph.md; do cmp -s AGENTS.md "$f" && echo "same $f" || echo "DIFFERS $f"; done
```
Expected: five `same` lines. If any line says `DIFFERS`, stop and report; do not symlink a file that carries unique content.

- [ ] **Step 2: Replace the five copies with symlinks**

Run:
```bash
for f in CLAUDE.md GEMINI.md QODER.md .windsurfrules; do git rm -q "$f" && ln -s AGENTS.md "$f"; done
git rm -q .kiro/steering/code-review-graph.md && ln -s ../../AGENTS.md .kiro/steering/code-review-graph.md
git add CLAUDE.md GEMINI.md QODER.md .windsurfrules .kiro/steering/code-review-graph.md
for f in CLAUDE.md GEMINI.md QODER.md .windsurfrules .kiro/steering/code-review-graph.md; do [ -L "$f" ] && cmp -s AGENTS.md "$f" && echo "link-ok $f -> $(readlink "$f")" || echo "BAD $f"; done
git status --short
```
Expected: five `link-ok` lines; `git status` shows the five as `T` (typechange) or `D`+`A` pairs, nothing else.

- [ ] **Step 3: Edit `AGENTS.md`**

Change line 1 from `# CLAUDE.md` to `# AGENTS.md` and line 3 to:
```
Project instructions for every agent host. `CLAUDE.md`, `GEMINI.md`, `QODER.md`, `.windsurfrules`
and `.kiro/steering/code-review-graph.md` are symlinks to this file; edit only this one.
```

Replace the whole section from `## Checks to run after any edit to the skill` up to (not including) `**Firing check**` with:

```markdown
## Checks to run after any edit to the skill

From the repo root: `tools/check-skill.sh`. Exit 0 means every invariant holds; a `FAIL` line
names the one that does not. It runs six checks — portability (no host-specific syntax in the
shared body), rule-field counting (every rule carries every field, fence-stripped), version
agreement (`SKILL.md` frontmatter mirrors `rules.md`), upstream currency (`upstream/` was
generated from the current corpus), citation integrity (every `DC-` id the package cites is a
heading in `rules.md`) and label-list agreement (the not-label-storable list is thirteen items
in both files that carry it). `README.md` argues each one; the script is the only executable
copy, and `.github/workflows/checks.yml` runs it with the tool tests on every push.

The `awk` fence-strip inside the rule-field check is load-bearing: `rules.md` documents its own
rule template inside a fenced block, and without the strip every count silently reads 13.

```

Replace the first bullet under `## Workspace configuration` with:
```markdown
- `AGENTS.md` is the single source of project instructions; `CLAUDE.md`, `GEMINI.md`, `QODER.md`,
  `.windsurfrules` and `.kiro/steering/code-review-graph.md` are symlinks to it. `.cursorrules`
  is a deliberate subset (the MCP section only) and stays a real file. On Windows, clone with
  `core.symlinks=true` or the five links check out as one-line text files.
```

- [ ] **Step 4: Edit `README.md`**

After the paragraph that ends `Both hosts must read the same bytes.` (under `## Body portability, and the two greps that enforce it`), insert:
```markdown
**The executable copy of every check in this section is `tools/check-skill.sh`**; run it from
the repo root. The shell below is the argument for each check, kept here so the reasoning
travels with the decision record, and CI (`.github/workflows/checks.yml`) runs the script.

```

Under `## Also in this repository`, replace the bullet that begins `- Shared project instructions kept in sync across hosts under host-specific filenames` with:
```markdown
- Shared project instructions live once, in `AGENTS.md`; `CLAUDE.md`, `GEMINI.md`, `QODER.md`,
  `.windsurfrules` and `.kiro/steering/` are symlinks to it, and `.cursorrules` is a deliberate
  subset. These predate the skill and are workspace configuration, not part of the shipped
  package. The MCP configs (`.mcp.json`, `.vscode/`, `.cursor/`, `.kiro/`, `.qoder/`,
  `.opencode.json`) hardcode an absolute `cwd`; update it if you clone this elsewhere.
```

- [ ] **Step 5: Verify**

Run:
```bash
tools/check-skill.sh | tail -1
head -3 CLAUDE.md
grep -n 'tools/check-skill.sh' AGENTS.md README.md | cut -c1-80
grep -c 'awk .*f=!f' AGENTS.md
git status --short
```
Expected: the label-list OK line; `head` prints `# AGENTS.md` and the new second paragraph through the symlink; two grep hits (one per file); `0` (the inline shell is gone from AGENTS.md); status lists `AGENTS.md`, `README.md` and the five links only.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md README.md CLAUDE.md GEMINI.md QODER.md .windsurfrules .kiro/steering/code-review-graph.md
git commit -m "chore: one source of project instructions, symlinked per host

The six instruction files were byte-identical and kept in step by hand.
AGENTS.md is now the only real file. Its checks section points at
tools/check-skill.sh instead of carrying a seventh copy of the shell.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VkUAjYQCjFdM3Q7bp2VkW4"
```

---

### Task 7: Close the record and integrate

**Files:**
- Modify: `docs/ARCHITECTURE-REVIEW.md` (mark §3 items done)
- Modify: `docs/plans/RESUME.md` (prepend a dated section)

- [ ] **Step 1: Mark the review's strategy items done**

In `docs/ARCHITECTURE-REVIEW.md`, change the line `In order. Steps 1 is done; 2–6 are recommendations with the decision each one needs.` to:
```
In order. All six were executed on 2026-09-02 on branch `refactor/harness-consolidation`;
see `docs/superpowers/plans/2026-09-02-harness-consolidation.md` for the task-by-task record.
```

- [ ] **Step 2: Prepend a section to `RESUME.md`**

Insert after the first paragraph (the one ending `Supersedes the pre-execution handoff of the same name.`):

```markdown

## 2026-09-02 — harness consolidation (after the review)

`docs/ARCHITECTURE-REVIEW.md` reviewed the whole repository and its §3 was executed the same
day. What changed, none of it in the shipped skill: `tools/check-skill.sh` is the executable
copy of the invariants (six checks); `tools/wf-preflight.mjs` and `docs/gates/fp-measure.mjs`
are importable and tested (`node --test tools/wf-preflight.test.mjs docs/gates/fp-measure.test.mjs`);
the Gate D heuristics were realigned to corpus `0.3.0` (they had kept the name-keyed
`DC-SEC-001` that Gate E round 3 removed); `.github/workflows/checks.yml` runs all of it;
`AGENTS.md` is the single instruction file and the five host-named copies are symlinks. Corpus
and package versions are unchanged. Gate D is still deferred and still has no numbers.
```

- [ ] **Step 3: Final full verification**

Run:
```bash
tools/check-skill.sh; echo "checks exit=$?"
node --test tools/wf-preflight.test.mjs docs/gates/fp-measure.test.mjs 2>&1 | grep -E '^# (pass|fail)'
git status --short
```
Expected: six OK lines and `checks exit=0`; `# fail 0`; status shows only the two docs.

- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE-REVIEW.md docs/plans/RESUME.md
git commit -m "docs: record the harness consolidation in the review and the handoff

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VkUAjYQCjFdM3Q7bp2VkW4"
```

- [ ] **Step 5: Integrate locally, do not push**

Run:
```bash
git checkout -q main && git merge -q --no-ff refactor/harness-consolidation -m "Merge refactor/harness-consolidation: executable harness, tests, CI, one instruction source" && git log --oneline -10 && tools/check-skill.sh | tail -1
```
Expected: the merge commit on top of `d745020…`'s ancestry and the label-list OK line. The user pushes.
