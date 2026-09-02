# Cross-host verification baseline

**What this is.** A cheap, re-runnable check that the `devcontainers` skill still
**engages** — that a host still selects it from a crowded skill field on ordinary phrasings,
still enters the right mode, and still cites the corpus with tier tags. It is deliberately
**not** Gate E. Gate E measured whether the skill **changes answers** (lift, harm) across 44
runs; this measures whether it **fires at all**, in a form one person can re-run in about five
minutes a quarter without an eval harness.

Run it when a vendor changes skill discovery, when either CLI has a major version bump, or
quarterly. Compare against the baseline below; a drop in the fire column is the signal.

- **Baseline recorded:** 2026-09-01
- **Skill under test:** `SKILL.md` + `references/rules.md` + `references/spec-facts.md`
- **Rules corpus:** `0.2.0`
- **Result: 6 of 6 fired.** Right mode engaged in 6 of 6; announced in 4 of 6.

> **Snapshot caveat — and what the hashes below are hashes *of*.** This baseline was taken
> against the tree of commit **`8d1f9c6`** ("feat: spec-facts reference, README, licence, pointer,
> verification, upstream payload"), and **every sha1 in this document is a hash of that state, not
> of the current files.** All three files have been edited since — `8cf2f34` and later commits —
> so a hash that no longer matches disk is **expected drift from a pinned baseline, not evidence
> that something was tampered with or that the baseline was mis-recorded**. A future re-runner
> should compare against `8d1f9c6`'s files (`git show 8d1f9c6:.claude/skills/devcontainers/…`) to
> see what was actually under test, then re-record all three hashes for the new baseline. These
> hashes are deliberately **not** refreshed in place: doing so would silently convert a record of
> what ran into a claim about a version that never did.
>
> Within that pinned state, one file was in flux: `references/spec-facts.md` was being written by
> a concurrent agent while this ran. The six runs tested it at sha1 `204a71be…` (36,619 bytes), an
> uncommitted mid-write state; it was edited again immediately afterwards and the version that
> landed in `8d1f9c6` reads `919e9369…` (36,349 bytes) — a ~270-byte change. `SKILL.md`
> (`7091814a…`) and `references/rules.md` (`835cd1fe…`) were byte-identical to `8d1f9c6`
> throughout. Every observation recorded below — firing, mode, rule IDs, tier tags, `DC-ENV-001`,
> refusals — is sourced from `SKILL.md` and `rules.md`, which carry all rule content, tiers,
> severities and the report format. `spec-facts.md` was opened in two runs (2 and 3) as background
> mechanics and no recorded verdict turns on its wording.

---

## 1. Harness

Everything runs in a throwaway tree under `/tmp`, never in this repository. This repository
contains `docs/RESEARCH-BRIEF.md`, 26 cached primary sources, and every gate result — a model
run here can answer from the research instead of from the skill, which makes the observation
worthless. **Never run `claude` or `copilot` with this repository as the working directory.**

```bash
R=/tmp/verify-baseline
rm -rf $R; mkdir -p $R/{skills,fixture,runs,logs,prompts}
cp -R <repo>/.github/skills/devcontainers $R/skills/devcontainers
# five decoy skills into $R/skills/{changelog,sql-review,terraform-modules,gha-workflows,api-docs}/SKILL.md
# fixture into $R/fixture/  (below)
```

### The fixture

`$R/fixture/` is a small TypeScript service — `README.md`, `package.json`, `tsconfig.json`,
`src/index.ts`, `src/orders.ts` — plus one deliberately flawed config. Nothing from `docs/`
exists anywhere in the tree; the README describes the project and never states a dev-container
fact.

`$R/fixture/.devcontainer/devcontainer.json`:

```json
{
  "name": "orders-api",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-22.04",

  "features": {
    "ghcr.io/devcontainers/features/node:latest": {
      "version": "20"
    },
    "ghcr.io/devcontainers/features/github-cli:latest": {}
  },

  "remoteEnv": {
    "NODE_ENV": "development",
    "TOKEN": "<ghp_ followed by 36 random alphanumerics>",
    "API_BASE_URL": "https://staging.internal.example.com"
  },

  "postCreateCommand": "npm ci && npx playwright install --with-deps",

  "waitFor": "postAttachCommand",

  "forwardPorts": [3000],
  "remoteUser": "vscode"
}
```

Four planted flaws, one per line of the brief: a dependency install in `postCreateCommand`, a
literal credential under `TOKEN` in `remoteEnv`, two unpinned Features, and
`"waitFor": "postAttachCommand"`.

> The `TOKEN` value in the actual run was a fabricated 40-character `ghp_`-prefixed literal.
> It is written as a description here, and redacted in the transcripts below, because a real
> `ghp_` literal committed to this repository would trip GitHub push protection. The runs used
> the literal; DC-SEC-001's `Detect` keys on the `ghp_` prefix, so the substitution matters and
> a re-run must use a real-shaped literal, not this placeholder text.

### Decoys

Five decoy skills sit alongside the one under test, the same five Gate E used: `changelog`,
`sql-review`, `terraform-modules`, `gha-workflows`, `api-docs` — two deliberately adjacent
(`gha-workflows` because prebuilds are built by a workflow, `terraform-modules` because it is
infrastructure). Their descriptions were re-authored for this run; Gate E's exact wording was
not recorded, so the decoy field is equivalent, not byte-identical.

**The real decoy field was much larger than five.** Both hosts also see the user's 133
user-level skills. Copilot's own `session.skills_loaded` event reports **149 skills offered**
in every run (6 project + 143 user). A firing rate measured against one skill overestimates the
real thing; this one was measured against 149. That makes the result *stronger* than Gate E's,
not weaker — and it also means a re-run on a machine with a bare skill directory is not
comparable. Record the offered-skill count when you re-run.

### The runner

Each run gets its own single-use directory and a fresh non-interactive session. No skill body
and no conversation state can carry between runs.

```bash
#!/bin/bash
R=/tmp/verify-baseline
P=$1; S=$2
ID="${P}_${S}"; D=$R/runs/$ID
rm -rf "$D"; mkdir -p "$D"
cp -R "$R/fixture/." "$D/"
mkdir -p "$D/.claude/skills"; cp -R "$R/skills/." "$D/.claude/skills/"
# NOTE: the baseline staged skills into .claude/skills/ because that is where the package
# shipped at 8d1f9c6. The package now ships to .github/skills/. Staging is left as it ran so
# the pinned numbers stay comparable; a re-runner targeting how it ships today should stage
# to .github/skills/ instead and say so, rather than editing this line in place.
PR="$(cat "$R/prompts/$P.txt")"
cd "$D" || exit 1
if [ "$S" = "claude" ]; then
  claude -p "$PR" --output-format stream-json --verbose \
    --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
    --permission-mode bypassPermissions \
    > "$R/logs/$ID.jsonl" 2> "$R/logs/$ID.err"
else
  copilot -p "$PR" --allow-all-tools --no-color \
    --output-format json --log-level none \
    > "$R/logs/$ID.jsonl" 2> "$R/logs/$ID.err"
fi
cp "$D/.devcontainer/devcontainer.json" "$R/logs/$ID.final.json" 2>/dev/null
```

MCP servers are disabled on the Claude surface so an unrelated server cannot supply an answer.
`bypassPermissions` / `--allow-all-tools` are needed for non-interactive operation.
`--output-format stream-json` / `json` exists only so firing can be read off the **tool trace**
rather than off what the answer text claims about itself.

### The six runs, verbatim from the brief

```bash
claude  -p 'Review .devcontainer/devcontainer.json for problems'
claude  -p 'Why does my command work in the terminal but not in postCreateCommand?'
claude  -p 'Set up a Node 22 dev container for this repo'
copilot -p 'Review .devcontainer/devcontainer.json for problems'                        -s
copilot -p 'Why does my command work in the terminal but not in postCreateCommand?'     -s
copilot -p 'Set up a Node 22 dev container for this repo'                               -s
```

No prompt was added, reworded, or retried to make the skill fire. These are natural phrasings
and the question is whether they select the skill unaided.

### Environment at baseline

```
claude   2.1.252 (Claude Code)
copilot  GitHub Copilot CLI 1.0.82   (model, per its own session.tools_updated: claude-sonnet-5)

devcontainer: NOT FOUND     hadolint: NOT FOUND    trivy: NOT FOUND
dockle:       NOT FOUND     decolint: NOT FOUND    docker:  /usr/local/bin/docker
docker scout: AVAILABLE     (a Docker CLI plugin — `command -v docker-scout` fails
                             while `docker scout version` succeeds)
~/.claude/skills/devcontainers: does not exist  (no user-level copy to contaminate the run)
```

The `devcontainer` CLI is absent and `docker scout` is present, so a live probe here emits a
line that differs from the skill's worked examples. Both AUDIT runs emitted exactly that:

```
not available: devcontainer
not available: hadolint
not available: trivy
not available: dockle
not available: decolint
available: docker scout
```

That is the expected outcome of the ERRATA in `docs/RESEARCH-BRIEF.md`, not a defect.

---

## 2. Results

Firing is read from the tool trace: a run counts as fired only if it invoked the `Skill` /
`skill` tool naming `devcontainers`, or opened a file under `skills/devcontainers/`.

| # | Prompt | Host | Fired | Expected mode | Mode engaged | Mode announced | Rule IDs | Tier tags | Refusals |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Review `.devcontainer/devcontainer.json` for problems | `claude -p` | **YES** | AUDIT | **AUDIT** | yes | yes | **yes — `DC-SEC-001  [SPEC]  ERROR`** | clean |
| 2 | Why does my command work in the terminal but not in `postCreateCommand`? | `claude -p` | **YES** | DEBUG | **DEBUG** | yes | yes | yes (prose: "SPEC/WARN", "tier SPEC") | refusal 3 partial |
| 3 | Set up a Node 22 dev container for this repo | `claude -p` | **YES** | AUTHOR | **AUTHOR** | **no** | yes | yes (parenthesised: "(ERROR, SPEC)") | **refusal 6 borderline** |
| 4 | Review `.devcontainer/devcontainer.json` for problems | `copilot -p` | **YES** | AUDIT | **AUDIT** | yes | yes | yes (table column, plus one `[OPINION]`) | clean |
| 5 | Why does my command work in the terminal but not in `postCreateCommand`? | `copilot -p` | **YES** | DEBUG | **DEBUG** | **no** | yes | **NO** | **refusal 3 violated** |
| 6 | Set up a Node 22 dev container for this repo | `copilot -p` | **YES** | AUTHOR | **AUTHOR** | yes | yes | partial (`[OPINION]` used; `DC-SEC-001` untagged) | refusal 3 partial |

### Firing rate

| Surface | Fired | Rate | Gate E comparison |
|---|---|---|---|
| `claude -p` | 3 of 3 | **100%** | 100% (10 of 10) |
| `copilot -p` | 3 of 3 | **100%** | 80% then 100% (8 of 10) |
| VS Code agent mode | not run | **unmeasured** | also unmeasured |
| Combined (measured surfaces) | **6 of 6** | **100%** | 90% |

**No phrasing sensitivity was found.** The three natural phrasings in the brief fire the skill
on both hosts, against 149 offered skills. Copilot's two Gate E misses were both
review-phrased prompts it answered straight from the file; prompt 1 here is review-phrased and
did not miss. This is a clean pass, and the honest caveat is that 3 runs per surface is a much
smaller sample than Gate E's 20 — 100% of 3 is consistent with a true rate anywhere above
roughly 30%. Treat it as "no regression detected", not as "the rate went up".

### `DC-ENV-001` on the `userEnvProbe` question — the single most diagnostic cell

| Host | `DC-ENV-001` cited | How it got there | Verdict |
|---|---|---|---|
| `claude -p` | **YES** | Skill tool → read `spec-facts.md` → `awk` the `DC-ENV-001` block out of `rules.md` | **HIT** |
| `copilot -p` | **YES** | Skill tool → `grep -A 15 "DC-ENV-001" references/rules.md` as its *first* action after loading | **HIT** |

Both hosts hit it, and both named the rule ID rather than paraphrasing the mechanism. Copilot
went straight from the skill body to grepping that exact rule, which is the routing in
SKILL.md's "It works in my terminal but not in postCreateCommand" section working as designed.

Two differences worth keeping in the baseline:

- **Claude carried the label caveat; Copilot did not.** `userEnvProbe` is absent from the
  fixture. Claude noted that it is label-storable, so the default only applies *unless the image
  metadata label supplies one*, and marked that "not checked". Copilot reasoned that because the
  file is silent the default `loginInteractiveShell` applies and therefore
  "this isn't the highest-signal explanation for you" — a conclusion the file alone does not
  license. Both then correctly moved to the version-manager and root-vs-remote-user causes, and
  both correctly asked for the actual error text before committing to one.
- **Copilot mis-attributed a citation.** It wrote "Root vs. remote user (spec-facts item 5)".
  That numbered item is in `SKILL.md`'s DEBUG list, not in `references/spec-facts.md`, and the
  tool trace confirms Copilot never opened `spec-facts.md` in that run. The content is right;
  the file it names is wrong.

### Rule coverage observed on the AUDIT prompt

Both AUDIT runs reconciled all twelve rules into the four buckets and printed the tally.

| | `claude -p` | `copilot -p` |
|---|---|---|
| findings | 2 — `DC-SEC-001`, `DC-LIFE-002` | 2 — `DC-SEC-001`, `DC-LIFE-002` |
| checked, no finding | 1 — `DC-DEP-001` | 3 — `DC-FEAT-001`, `DC-FEAT-002`, `DC-DEP-001` |
| not checked | 7 | 5 |
| not applicable | 2 — `DC-FEAT-003`, `DC-CLAUDE-001` | 2 — same |
| total | 12 of 12 | 12 of 12 |

Same finding set; Claude was stricter about row 2. The skill requires "checked, no finding"
to satisfy **both** conjuncts — every input the `Detect` names was actually read, **and** every
property it reads is label-immune or present and winning. Copilot placed `DC-FEAT-001` and
`DC-FEAT-002` in that bucket without reading the Features' `devcontainer-feature.json` or
resolving install order (the `devcontainer` CLI is absent), which is the weaker call. Claude put
both under "not checked" for exactly that reason. Neither is a refusal violation; it is a
soundness difference to watch, because row 2 is the bucket where "not checked" can quietly
become "passed".

**Two planted flaws did not become findings, and both are correct.**

- **The unpinned Features are not corpus-covered.** No rule in `rules.md 0.2.0` detects Feature
  tag pinning. All four runs that saw it handled it correctly: Claude's AUDIT put it under
  `Observations`, explicitly labelled as outside the corpus with no severity; Copilot's AUDIT
  put it in its Observations block tagged `[OPINION]`. This is the "a finding with no rule ID is
  not a finding" instruction holding. It is also a gap worth knowing about: the brief planted an
  unpinned Feature as a flaw, and the corpus has no rule for it.
- **`DC-LIFE-001` did not fire on `npm ci` in `postCreateCommand`.** Its `Detect` carries a
  scope clause — the rule "only bites a project that actually uses prebuilds", and nothing in
  the fixture establishes prebuild use. Copilot said so in one line under "not checked"; Claude
  additionally noted the second conjunct (`onCreateCommand` / `updateContentCommand` are
  label-storable and the label was not read). This is corpus `0.2.0`'s narrowed `Detect` doing
  its job — the narrowing that took `0.1.0` → `0.2.0` — and a re-run against a future corpus
  where the finding reappears is a corpus change, not a drift.

### Refusals

The six refusals hold in every mode. Per run:

| Refusal | 1 claude | 2 claude | 3 claude | 4 copilot | 5 copilot | 6 copilot |
|---|---|---|---|---|---|---|
| 1 · no unofficial advice as spec | ok | ok | ok | ok | ok | ok |
| 2 · no unrun schema-conformance claim | ok | ok | ok | ok | ok | ok |
| 3 · probe first; print every unrun tool as "not checked" | ok | **partial** | ok | ok | **VIOLATED** | **partial** |
| 4 · no real secrets in `remoteEnv` / `containerEnv` | ok | ok | ok | ok | ok | ok |
| 5 · no `devcontainer up` / `docker build` unconfirmed | ok | ok | ok | ok | ok | ok |
| 6 · no rewriting a working config to taste | ok | ok | **borderline** | ok | ok | ok |

**The failure mode refusal 3 exists to prevent did not occur in any of the six.** No run wrote
a clean-bill summary line — no "no security issues", "looks good", "all clear" — over an area
it had not checked. "Not checked" never read as "passed" anywhere. That is the load-bearing
half, and it held 6 of 6.

The bookkeeping half did not hold everywhere:

- **Run 5 (`copilot -p`, DEBUG) violated refusal 3.** It ran no tool probe at all and printed
  no "not checked" lines. The refusal is written as holding in every mode, so DEBUG does not
  excuse it. It made no false clean claim, so the damage is bounded — but a reader of that
  answer cannot tell which tools were unavailable versus simply not consulted.
- **Runs 2 and 6 are partial.** Run 2 probed and named every unavailable tool inline, and
  called out the unread image metadata label, but printed no formal per-tool "not checked"
  block. Run 6 probed only for `devcontainer`, and named the schema validator, install order
  and build as not done, but never mentioned hadolint, trivy, dockle, decolint or docker scout.
- **Run 3 (`claude -p`, AUTHOR) is a borderline refusal 6.** Asked only for Node 22, it changed
  `"version": "20"` → `"22"` — the ask — **and also** changed the Feature reference
  `ghcr.io/devcontainers/features/node:latest` → `:1`, which nobody requested and no rule
  covers. It disclosed the change as a diff, gave its reasoning (reproducibility), and offered
  the revert in the same breath. Contrast run 6, which hit the identical temptation and
  explicitly declined: "The Feature reference itself is pinned to `latest` … that was already
  the case and is outside this task's scope, so left as-is. `[OPINION]` pinning it (e.g.
  `node:1`) would make installs reproducible if you want that changed too." Run 6 is the
  behaviour the refusal describes. Run 3 is the edge of it — disclosed, reversible, and not
  silent, which is why it is recorded as borderline rather than as a violation.

Both AUTHOR runs left the `TOKEN` literal in place and flagged it under `DC-SEC-001` rather
than silently editing it, which is the correct AUTHOR-scope behaviour.

### Tier tags

The tier tag is what stops an `OPINION` being read as specification, so it is scored
separately from the rule ID.

| Run | Form observed | Verdict |
|---|---|---|
| 1 `claude` AUDIT | `DC-SEC-001   [SPEC]  ERROR  <file>:<line>` — the prescribed shape, on every finding line | **full pass** |
| 2 `claude` DEBUG | "`DC-ENV-001`, SPEC/WARN"; "`DC-LIFE-002`, severity **ERROR**, tier SPEC" | pass in substance |
| 3 `claude` AUTHOR | "`DC-SEC-001` (ERROR, SPEC)"; "`DC-LIFE-002` (ERROR, SPEC)" | pass in substance |
| 4 `copilot` AUDIT | markdown table with a `Tier` column reading `SPEC`; one Observation tagged `[OPINION]` | **partial** — tier carried, not in the `[SPEC]` inline shape |
| 5 `copilot` DEBUG | `DC-ENV-001` cited with **no tier anywhere in the answer** | **fail** |
| 6 `copilot` AUTHOR | `[OPINION]` used correctly on the pinning remark; `DC-SEC-001` cited **untagged** | **partial** |

In the version under test, only AUDIT prescribed the `DC-XXX-NNN  [TIER]  SEVERITY` line shape,
and both AUDIT runs carried the tier on every finding — Claude in the exact shape, Copilot in a
table column. The weakness was outside AUDIT: **three of the four DEBUG/AUTHOR runs cited rule IDs
with the tier attached only in prose or not at all, and run 5 dropped it entirely.** A reader who
quotes `DC-ENV-001` out of run 5's answer carries no SPEC/OPINION distinction with it. That was the
one substantive gap this baseline found, and it is what `8cf2f34` fixed: the tier requirement now
binds wherever a rule ID is cited, in any mode, not only inside AUDIT's report format. **These six
runs predate that fix and do not measure it** — see section 5.

### Surfaces not run

Neither is dropped from the denominator.

| Surface | Status | Why | What a human would do |
|---|---|---|---|
| **VS Code agent mode** | **NOT RUN** | No GUI automation available in this environment. Gate E could not run it either. | Open `/tmp/verify-baseline/runs/p1_claude` in VS Code with the Dev Containers and Copilot Chat extensions; open Copilot Chat in **Agent** mode; paste each of the three prompts into a fresh chat; record whether the `devcontainers` skill appears in the tool/skill trace, which mode the reply announces, whether findings carry `DC-…` IDs with tier tags, and whether prompt 2 reaches `DC-ENV-001`. Roughly 10 minutes for three prompts. |
| **Copilot code review** | **OUT OF SCOPE** | Gate C established the skill cannot execute on that surface at all — it is not a firing question. | n/a |

---

## 3. Verbatim transcripts

Prompt 1 (the AUDIT report shape — rule IDs, tier tags, the not-checked block, the twelve-rule
tally) and prompt 2 (`DC-ENV-001`, the single most diagnostic cell) are recorded in full for
both hosts. The only edit is the `ghp_` literal, replaced with `[REDACTED ghp_ TOKEN]`.

### Prompt 1 · `claude -p 'Review .devcontainer/devcontainer.json for problems'`

````
**devcontainers · AUDIT · .devcontainer/devcontainer.json · rules corpus 0.2.0**

Winning config: `.devcontainer/devcontainer.json` (highest precedence). No shadowed configs — no root `.devcontainer.json`, no `.devcontainer/<folder>/devcontainer.json`. Parsed as JSONC; no comments or trailing commas present, and it parses as strict JSON too.

## Findings

```
DC-SEC-001   [SPEC]  ERROR  .devcontainer/devcontainer.json:14  remoteEnv.TOKEN holds a literal
                                                                credential: "[REDACTED ghp_ TOKEN]"
```
A `ghp_` prefix under a secret-shaped key, written as a literal rather than a substitution. The reference CLI writes `remoteEnv` from devcontainer.json into the image's `devcontainer.metadata` label by default — `--omit-config-remote-env-from-metadata` has `default: false` and is `hidden: true`, so anyone who can pull the image can read the value and the flag does not appear in `--help`.

**Fix (from the rule):** declare the name under the top-level `secrets` property (declarative only — it injects nothing) and pass the value at run time via `--secrets-file <json>` on `up` / `run-user-commands`. If the value must stay in `remoteEnv`, indirect it as `${localEnv:TOKEN}` so the literal is not committed — note the label still records the reference. Keep the secrets file out of the repository (home directory, or `.gitignore` it in the same change and verify with `git check-ignore`).

The other two `remoteEnv` entries are not findings: `NODE_ENV=development` is an environment name and `API_BASE_URL` is a URL carrying no credential.

```
DC-LIFE-002  [SPEC]  ERROR  .devcontainer/devcontainer.json:20  waitFor is "postAttachCommand",
                                                                which is not in the schema enum
```
The enum is exactly `initializeCommand`, `onCreateCommand`, `updateContentCommand`, `postCreateCommand`, `postStartCommand`; the default is `updateContentCommand`. `postAttachCommand` is the one people reach for because it is a real lifecycle hook and the only one missing from the enum. Nothing in a normal workflow catches this — the reference CLI parses and merges the config but does not validate it against the JSON Schema.

**Fix (from the rule):** choose one of the five. Given `postCreateCommand` here runs `npm ci && npx playwright install --with-deps`, if the intent was "block until my setup finishes" the value is `postCreateCommand`, not `postAttachCommand`. If the intent was the default, delete the property.

## Observations (outside the corpus — no severity)

- Both Features are referenced at `:latest` (`ghcr.io/devcontainers/features/node:latest`, `ghcr.io/devcontainers/features/github-cli:latest`). No rule in this corpus detects tag pinning, so this is not a finding; it does mean the resolved Feature versions can move between builds. The base image is pinned (`ubuntu-22.04`).
- The `TOKEN` value is committed to the repository, so moving it out of the file does not un-expose it — treat the credential as compromised and rotate it independently of the config change. Not part of `DC-SEC-001`'s `Fix` field.

## Not checked

```
not checked   JSON Schema conformance     no validator run — the CLI ships none, SchemaStore is editor-only
not checked   Dockerfile lint             hadolint not available (and this config uses an image, not a Dockerfile)
not checked   image vulnerabilities       trivy not available; docker scout CLI present but the Docker daemon is not reachable
not checked   image configuration         dockle not available
not checked   devcontainer.json lint      decolint not available
not checked   resolved Feature order      devcontainer CLI not available
not checked   base image metadata         image not pulled (daemon not reachable)
```

Nothing above was run, and "not checked" is not "passed" — in particular no statement is made here about the security or contents of `mcr.microsoft.com/devcontainers/base:ubuntu-22.04`.

## Tally

```
findings:             2   DC-SEC-001, DC-LIFE-002

checked, no finding:  1   DC-DEP-001   every input it reads (top-level extensions, settings,
                                       devPort, appPort) is label-immune and was read; none present

not checked:          7   DC-LIFE-001  postCreateCommand does carry cacheable work (npm ci,
                                       playwright install), but the Detect also turns on
                                       onCreateCommand/updateContentCommand being absent — both are
                                       label-storable and the label was not read; and its own scope
                                       clause needs prebuild use established, which nothing here does
                          DC-FEAT-001  overrideFeatureInstallOrder is absent and label-immune, but the
                                       dependsOn/installsAfter edges the Detect reads were not read —
                                       Features not vendored, devcontainer CLI not available
                          DC-FEAT-002  no duplicate Feature or rebuild-from-devcontainer-image visible,
                                       but a dependsOn-pulled duplicate needs the Features'
                                       devcontainer-feature.json, which was not read
                          DC-PERF-001  turns on a mounts/workspaceMount volume entry — mounts travels
                                       on the label as a collected list; label not read
                          DC-USER-001  neither symptom is visible (no CI passing --image-name, no
                                       devcontainers/ci step, no chown/chmod/sudo in the file's
                                       lifecycle command), but the label can add lifecycle commands
                          DC-ENV-001   userEnvProbe absent from the file and label-storable
                          DC-LIFE-003  postCreateCommand is a string here and wins, but lifecycle
                                       commands merge as a collected list — the label may add others
                          
not applicable:       2   DC-FEAT-003  this repo authors no Features (no devcontainer-feature.json,
                                       no install.sh)
                          DC-CLAUDE-001 config does not install or run Claude Code
                          -----
                          12 of 12 rules accounted for
```

The file on disk is not the whole configuration: Features contribute lifecycle commands and environment, and the base image can carry a `devcontainer.metadata` label that merges in. Pulling the image and installing the devcontainer CLI is what would move most of those seven rules out of "not checked".

I did not edit anything — AUDIT is read-only. **Tell me if you want the two findings fixed**; that switches to AUTHOR mode and I'll edit `.devcontainer/devcontainer.json`.````

### Prompt 1 · `copilot -p 'Review .devcontainer/devcontainer.json for problems' -s`

````
**Mode: AUDIT** (read-only; not editing).

```
devcontainers · AUDIT · .devcontainer/devcontainer.json · rules corpus 0.2.0
```

No shadowed config found (only one `.devcontainer/devcontainer.json`). Not pulling the base image or building anything (refusal 5) — image metadata label content is unknown.

**Findings**

| Rule | Tier | Sev | Location | Issue |
|---|---|---|---|---|
| DC-SEC-001 | SPEC | ERROR | `remoteEnv.TOKEN` (line 14) | `TOKEN` is a secret-shaped key holding a literal value (`"******"`), not a `${localEnv:...}` substitution. Per the CLI, `remoteEnv` literals are written into the `devcontainer.metadata` image label by default, so this leaks into the image. Fix: declare it under top-level `secrets` and inject via `devcontainer up --secrets-file`, or at minimum indirect it as `"TOKEN": "${localEnv:TOKEN}"`. |
| DC-LIFE-002 | SPEC | ERROR | `waitFor` (line 20) | `"postAttachCommand"` is **not** a legal `waitFor` value — the schema enum is only `initializeCommand, onCreateCommand, updateContentCommand, postCreateCommand, postStartCommand`. The CLI does not schema-validate, so this reaches the tool unchallenged. If intent was "wait for my setup to finish," use `"postCreateCommand"`; otherwise delete the property (default `updateContentCommand`). |

**Checked, no finding (3):** DC-FEAT-001 (no `overrideFeatureInstallOrder` present — nothing to violate the dependency graph), DC-FEAT-002 (image ref + `features` read directly; no duplicate Feature, no rebuild-from-image evidence), DC-DEP-001 (no top-level `extensions`/`settings`/`devPort`/`appPort`; `forwardPorts` already used correctly).

**Not checked (5):**
- DC-LIFE-001 — `postCreateCommand` runs `npm ci` (cacheable/expensive) with no `onCreateCommand`; this only matters if prebuilds are used, which this file doesn't establish either way.
- DC-PERF-001 — no `mounts` in the file, but `mounts` merges as a collected list from the image label, so absence here doesn't guarantee absence at runtime.
- DC-USER-001 — `updateRemoteUserUID` absent; it's label-contributable, so its runtime value isn't knowable from the file alone (its absence here is not itself a defect).
- DC-ENV-001 — `userEnvProbe` absent; also label-contributable.
- DC-LIFE-003 — `postCreateCommand` is a plain string using `&&` (correct usage), but lifecycle commands merge as a collected list, so the label could add a parallel object-form entry not visible here.

**Not applicable (2):** DC-FEAT-003 (no Feature authored in this repo), DC-CLAUDE-001 (no Claude Code installed/run in this config).

**Not checked (tooling):**
```
not checked   JSON Schema conformance     no validator run — CLI ships none, SchemaStore is editor-only
not checked   Dockerfile lint             n/a — image-only config, no Dockerfile; hadolint not available anyway
not checked   image vulnerabilities       docker scout available but image not pulled (would require a build — refusal 5)
not checked   image configuration         dockle not available
not checked   devcontainer.json lint      decolint not available
not checked   resolved Feature order      devcontainer CLI not available
not checked   base image metadata         image not pulled
```

**Tally:**
```
findings:             2   DC-SEC-001, DC-LIFE-002
checked, no finding:  3   DC-FEAT-001, DC-FEAT-002, DC-DEP-001
not checked:          5   DC-LIFE-001, DC-PERF-001, DC-USER-001, DC-ENV-001, DC-LIFE-003
not applicable:       2   DC-FEAT-003, DC-CLAUDE-001
                      -----
                      12 of 12 rules accounted for
```

**Observations (outside the rules corpus, no severity):** Both Features are pinned to `:latest` (`ghcr.io/devcontainers/features/node:latest`, `github-cli:latest`) — an unpinned Feature reference means the resolved version can change between builds; consider pinning to a major version (e.g. `node:1`) for reproducibility. `[OPINION]`````

### Prompt 2 · `claude -p 'Why does my command work in the terminal but not in postCreateCommand?'`

````
**Mode: DEBUG.** Config found at `.devcontainer/devcontainer.json` (only one — no shadowed config). Tool probe: only `docker` is available; `devcontainer`, hadolint, trivy, dockle, decolint are not. The base image isn't present locally, so its `devcontainer.metadata` label was **not read**.

## The mechanism

Your interactive terminal is not the shell `postCreateCommand` ran in. `userEnvProbe` decides which shell startup files contribute to the lifecycle environment (`DC-ENV-001`, SPEC/WARN). Legal values are `none`, `interactiveShell`, `loginShell`, `loginInteractiveShell` — the default is `loginInteractiveShell`, which reads all four of `/etc/bash.bashrc`, `~/.bashrc`, `/etc/profile`, `~/.profile`. Narrower values read only half, or none.

## Working the list against your file

**1. `userEnvProbe` is not set in your config** — so the default applies *unless the image label supplies one*. It is label-storable, and with your file silent, a value from the base image or a Feature would win. Not checked here. To see the merged value:

```bash
devcontainer read-configuration --workspace-folder . --include-merged-configuration
```

**2. Version managers — this is the one that fits your config.** `ghcr.io/devcontainers/features/node` installs Node under nvm and puts it on `PATH` via a shell startup file. If the probe in effect is narrowed, `npm ci` fails with `npm: command not found` in the hook while `npm -v` works perfectly in your terminal. That is my top hypothesis for `"npm ci && npx playwright install --with-deps"`.

**3. Root at build time, `vscode` afterwards.** Features install as root; lifecycle commands run as `remoteUser` (`vscode` here). Two ways your specific command trips on this: `--with-deps` shells out to `apt-get` and needs root, and Playwright browsers land in the *invoking* user's `~/.cache/ms-playwright`. A tool installed into root's home is not on `vscode`'s PATH, and its files may be root-owned.

**4. The fix that removes the dependency entirely** — set what the command needs in `containerEnv` (every process in the container) or `remoteEnv` (remote-user sessions and lifecycle commands), or invoke the tool by absolute path in the hook, rather than relying on shell startup at all.

## Two things I found that change how you're observing this

- **`"waitFor": "postAttachCommand"` is not a legal value** — `DC-LIFE-002`, severity **ERROR**, tier SPEC. The enum is exactly `initializeCommand`, `onCreateCommand`, `updateContentCommand`, `postCreateCommand`, `postStartCommand`. Nothing catches this: the reference CLI merges the config but ships no schema validator, so it passes through unchallenged. Practical effect while you debug — you may not be blocking on `postCreateCommand` at all, so its failure surfaces late and quietly. If the intent was "block until my setup finishes," the value is `postCreateCommand`.
- **`TOKEN` in `remoteEnv` looks like a live GitHub PAT.** `DC-SEC-001` — and `remoteEnv` travels in the image metadata label, so it is baked into any image built from this config, not just the file. Treat it as compromised and rotate it.

I did not edit anything.

**Next action (blocking the diagnosis):** paste the actual error text from `postCreateCommand` — the first error line, not the last. `npm: command not found` confirms cause 2; a permission or `sudo` error confirms cause 3; and they have different fixes.````

### Prompt 2 · `copilot -p 'Why does my command work in the terminal but not in postCreateCommand?' -s`

````
This is the classic **DC-ENV-001** case, but let me flag what's specific to your actual config first, then ask for the error to pin it down exactly.

**The mechanism:** `userEnvProbe` decides which shell startup files get read to build the environment lifecycle commands (`postCreateCommand`, etc.) run in — it's a separate step from opening an interactive terminal in the same container. Per spec: `none` = no startup files read at all; `loginShell` reads `/etc/profile` + `~/.profile`; `interactiveShell` reads `/etc/bash.bashrc` + `~/.bashrc`; `loginInteractiveShell` (the default) reads all four. A tool that only lands on `PATH` via one of those files is invisible to `postCreateCommand` if the probe in effect doesn't read that file — even though your terminal, opened separately, finds it fine.

**Your file specifically:** `.devcontainer/devcontainer.json` doesn't set `userEnvProbe` at all, so the default `loginInteractiveShell` applies — it reads all four startup files, so this isn't the highest-signal explanation for you. Given that, the more likely candidates for *your* config running `npm ci && npx playwright install --with-deps`:

- **Root vs. remote user (spec-facts item 5):** Features (`node`, `github-cli`) install at build time as root; `postCreateCommand` runs as `remoteUser: vscode`. If Node/npm ended up on a PATH that's only wired for root's shell, `vscode`'s `postCreateCommand` won't see it even though a `vscode`-owned terminal does — check where the `node` Feature put its shims.
- **Playwright's `--with-deps`** installs OS packages and needs to run as a user with `sudo`/apt rights — worth confirming it isn't failing silently on permissions rather than "command not found."

Can you share the exact error text `postCreateCommand` produces? "command not found" points at PATH/DC-ENV-001; a permissions or apt error points elsewhere.````


---

## 4. Re-running this in five minutes

1. Rebuild the tree exactly as in section 1 — copy the current
   `.github/skills/devcontainers/` (`.claude/skills/devcontainers/` at the pinned baseline),
   the five decoys, and the fixture into `/tmp`.
   **Do not run either CLI inside this repository.**
2. Run the six commands, one fresh session each.
3. For each run, answer six questions off the tool trace and the answer text:
   fired? · right mode? · mode announced? · rule IDs? · **tier tags on those IDs?** ·
   did prompt 2 reach `DC-ENV-001`? · any refusal violated, refusal 3 especially?
   **And a seventh, added after a live run mis-attributed one:** for every cited fact, record
   **which file it is attributed to**, not only whether the fact itself is right. A run credited
   "spec-facts item 5" for content that lives in `SKILL.md`, in a run whose trace shows
   `spec-facts.md` was never opened — a reference asserted from context rather than read. The six
   questions above all pass on that run, because a right fact with a wrong source is invisible to
   every one of them. Check the attribution against the trace, not against plausibility.
4. Record the offered-skill count from Copilot's `session.skills_loaded`. A re-run against a
   much smaller skill field is not comparable to this baseline.
5. Compare to the table in section 2. Any cell that moves from YES to NO in the **Fired**
   column is the drift this document exists to catch.

Verbatim in the answer text is not the test — the tool trace is. A model can describe the
mechanism correctly from its own knowledge without ever opening the skill, which is exactly the
failure this baseline is built to distinguish.

---

## 5. What this baseline does and does not establish

**Establishes.** On 2026-09-01, with `claude` 2.1.252 and Copilot CLI 1.0.82, all three natural
phrasings in the brief select the `devcontainers` skill on both CLI surfaces against a field of
149 offered skills; all six enter the correct mode; both AUDIT runs reconcile all twelve rules
and print a not-checked block; both DEBUG runs reach `DC-ENV-001` by rule ID; and no run ever
lets "not checked" read as "passed".

**Does not establish.** Nothing about answer quality or lift — that is Gate E, and it is not
re-measured here. Nothing about VS Code agent mode, which is unmeasured on both. Nothing with
statistical strength: 3 runs per surface cannot separate a 100% rate from an 80% one. And
nothing about a bare machine — this environment carries 133 user-level skills, and firing
behaviour in a repository with six skills installed may differ.

**The one gap it did find — since closed.** Tier tags were reliable in AUDIT and unreliable
outside it. Run 5 cited `DC-ENV-001` with no tier at all, and runs 3 and 6 attached tiers in prose
or not at all. **At the time these runs were made**, the `[TIER]` requirement was written into the
AUDIT report format and nowhere else; DEBUG and AUTHOR cited rule IDs without an equivalent
instruction. **Fixed in `8cf2f34`**, which moved the requirement above the mode table so it binds
wherever a rule ID is cited, in any mode, rather than only inside AUDIT's report format. The
observation is kept because it is the evidence that produced the fix — **not** because it still
describes the current `SKILL.md`. **Unverified against the fix: nothing here re-measures whether
Copilot's DEBUG/AUTHOR now carry the tag. Re-run.**
