---
name: devcontainers
description: Use when creating, editing, reviewing, validating or debugging a devcontainer.json, .devcontainer/ directory or Dev Container Feature, or when a containerised dev environment behaves differently from the host, fails to build, or is slow to start. Covers the containers.dev specification, Features, lifecycle commands, Codespaces prebuilds, and the tools that support them. Does not cover Dev Container Template authoring.
license: MIT
metadata:
  version: "0.1.0"  # the package; corpus_version below tracks the twelve-rule corpus, which bumps independently
  corpus_version: "0.3.0"
  spec_verified: "2026-08-31"
  author: Emil Dan
  email: emil.dan@publicissapient.com
---

# Dev containers

This skill has three modes. Pick exactly one at the start of the turn, say which one you
picked, and stay in it until the user asks for something else.

| The request is | Mode | Load |
| --- | --- | --- |
| review, audit, check, "is this right", "any problems with this" | **AUDIT** | `references/rules.md` |
| create, add, write, change, migrate, "set up a dev container for" | **AUTHOR** | `references/spec-facts.md` |
| broken, slow, "why does", "it works locally but", "it stopped" | **DEBUG** | `references/spec-facts.md` |

If the request is ambiguous, ask which before doing work. If an audit produces findings and the
user says "fix them", announce the switch to AUTHOR — AUDIT does not edit files.

Load the reference file the mode names. Do not load both up front; DEBUG may open the corpus
on demand when a specific rule turns out to be implicated.

**Whenever you cite a rule ID — in any mode, in prose or in a table — print its tier with it**
in the shape `DC-XXX-NNN [TIER]`, read from that rule's `Tier` field and never from here. The
tag is the only thing stopping an `OPINION` being read as specification, and a bare ID quoted
out of a DEBUG or AUTHOR answer carries no such warning. If you could not open the corpus, say
the tier is unknown rather than dropping it.

**Never descend into `customizations.*` when checking for unknown properties, in any mode.**
That namespace is deliberately open — no registry, no schema constraint, any tool may claim a
key — so a check that walks into it reports every legitimate third-party key as unknown.

---

## Before any mode: find the config

Discovery precedence: `.devcontainer/devcontainer.json`, then `.devcontainer.json`, then
`.devcontainer/<folder>/devcontainer.json` — the third one level deep, not recursive.

Read the file that actually wins: a repo with two has one live config and one that looks live.

`devcontainer.json` is JSONC: comments and trailing commas are legal, and a strict JSON parser
errors on a valid file. Check for `//` and `/* */` before calling one malformed.

**The file on disk is not the whole configuration.** Features contribute lifecycle commands and
environment, and a base image can carry a `devcontainer.metadata` label that merges in — normally
invisible without pulling the image. Say so rather than treating the file as complete.

---

## Tooling: probe, never install

None of the supporting tools can be assumed present. Probe before use:

```bash
for t in devcontainer hadolint trivy dockle decolint; do
  if command -v "$t" >/dev/null 2>&1; then echo "available: $t"; else echo "not available: $t"; fi
done
command -v docker >/dev/null 2>&1 && docker scout version >/dev/null 2>&1 \
  && echo "available: docker scout" || echo "not available: docker scout"
```

A tool being absent is normal, not a blocker: report it and continue. Never install one, nor
suggest it as a prerequisite. **Report the result in every mode** — AUDIT prints the formal
block below, but DEBUG and AUTHOR still owe the reader a list of what was not checked.

**If the surface you are running on cannot execute commands at all** — some review surfaces
cannot — do not write as though a command ran. Treat every tool as not available, analyse by
reading, and print the full "not checked" block. Nothing here is gated on running anything.

### Two official oracles — delegate to them

Both require `command -v devcontainer` to succeed first.

**Resolved Feature install order.** Do not hand-trace `dependsOn`, `installsAfter` and
`overrideFeatureInstallOrder` — that is a reliable source of wrong answers. Ask the reference
implementation:

```bash
command -v devcontainer >/dev/null 2>&1 && \
  devcontainer features resolve-dependencies --workspace-folder .
```

Use its output as the answer, citing `DC-FEAT-001`. Without the CLI, say the order was not
resolved and describe the inputs you can see, never asserting a final order.

**Feature authoring conformance.** For someone writing or maintaining a Feature the official
harness is the answer, not a hand-written checklist:

```bash
command -v devcontainer >/dev/null 2>&1 && \
  devcontainer features test --project-folder .
```

It generates a container per Feature, runs `scenarios.json`, and has a duplicate-install mode.
Point Feature authors at it rather than writing bespoke tests.

---

## Refusals

These hold in every mode.

1. **Will not assert unofficial advice as specification.** Anything not in the spec or
   official docs is tagged `OPINION` or omitted.
2. **Will not claim JSON Schema conformance it did not run.** `devcontainer.json` validation
   today is editor-only via SchemaStore; the devcontainer CLI ships no validator.
3. **Will not shell out to `devcontainer`, `hadolint`, `trivy`, `dockle`, `docker scout` or
   `decolint` without a `command -v` probe first, and will never install them.** Every tool
   that was not run is printed as an explicit "not checked" line — "not checked" must never
   read as "passed".
4. **Will not put real secrets in `remoteEnv` or `containerEnv`** (see `DC-SEC-001`).
5. **Will not run `devcontainer up` or `docker build` without explicit confirmation.**
6. **Will not rewrite a working config to match a style preference.**

On refusal 3: a reader sees no complaint about image vulnerabilities and concludes it is clean.
Never write a summary line — "no security issues", "looks good", "all clear" — over an area you
did not check.

---

## AUDIT

Read and report. **Do not edit any file in this mode.**

**Load `references/rules.md` now.** The twelve rules, their severities, tiers, sources,
`Detect` and `Fix` live there and nowhere else. Never restate one from memory — open the file.
If it cannot be read, say so and stop: an audit from memory is worse than no audit.

### Procedure

1. Locate the winning config (above). Note any shadowed configs.
2. Parse it as JSONC; note the Features, the image or Dockerfile, and every lifecycle hook.
3. Note what you cannot see: the image metadata label, private Feature contents, the resolved
   install order without the CLI. These become "not checked", not assumptions.
4. Run the tool probe; run only what is available and read-only.
5. Walk the twelve rules in `references/rules.md` order. For each, copy its `Inputs` line —
   that line is the list — and mark every input on it read, naming where you read it, or not
   read, **then** pick the bucket. A rule whose inputs you never read cannot be "checked, no
   finding", however clean the config looks.
6. Emit the report below.

### Report format

One header line, then findings, then the not-checked block, then the tally.

```
devcontainers · AUDIT · .devcontainer/devcontainer.json · rules corpus <version>
```

Take the corpus version from `references/rules.md` if it carries one, else omit it. Never print
this file's `corpus_version` as the corpus's — nothing keeps them in step.

Every finding line carries the rule ID and the tier tag. No exceptions. The shape:

```
DC-XXX-NNN  [TIER]  SEVERITY  <file>:<line>  <what was found>
```

Severity and tier are corpus-owned and they change. Read both from the rule you just opened —
never from memory, never from an example.

Give each finding the fix from the rule's own `Fix` field, kept to the change rather than a
rewrite. `Fix` snippets are illustrative: AUDIT neither edits nor runs, and anything in one that
builds or starts a container needs explicit confirmation (refusal 5).

**A finding with no rule ID is not a finding.** Put anything real that no rule covers under a
separate `Observations` heading, labelled as outside the corpus, with no severity.

### Every rule lands in exactly one bucket

Each of the twelve rules ends up in exactly one of four places — reconcile before you emit. A
rule silently missing is the same failure as "not checked" reading as "passed".

| Bucket | Use it only when |
| --- | --- |
| **finding** | the firing input is present in the file and wins the merge — what you found, you found |
| **checked, no finding** | you actually read every input on the rule's `Inputs` line, **and** every property it reads is label-immune or present in the file and winning |
| **not checked** | anything else — an input was unavailable, or the label could still supply what fires the rule |
| **not applicable** | the rule's own `Detect` scopes it out of this config |

Evaluate the rows in order **4, 1, 2, 3** — scope out, what fired, what you were entitled to
call clean, then the rest. Row 2 needs both conjuncts: a rule whose inputs you never read is
not clean, however label-immune its properties.

Why the two middle rows differ. For every property these twelve rules read, `devcontainer.json`
"is considered last" when the order matters (`image-metadata.md`), so a value present in the file
wins — but the label can still **add** what the file never showed: lifecycle commands and
`mounts` are collected lists, `remoteEnv` / `containerEnv` merge per variable. (A claim about
these rules' properties, not a law of the merge system; a few merge the other way.) Hence: **an
audit can soundly report what it found, not that it is clean.**

Working a row needs the rule's `Inputs` line — that is the list of what to read — the config,
and whether each property it names is label-storable; the not-label-storable list under "My
changes aren't taking effect" is the in-file source for that. A compound `Detect` is only as
sound as its weakest conjunct.

**Not applicable** needs the `Detect`'s own scope clause — a rule limited to configs installing a
particular tool, applied to one that does not; a Feature-authoring rule, applied to a repo that
authors none. Name the condition. If you cannot decide, it is **not checked**: not having looked
is not the same as having looked and found nothing.

Every "checked, no finding" entry in the tally is written as `DC-XXX-NNN  read: <input>
(<where>), <input> (<where>) …`, naming **every** input on that rule's `Inputs` line; an entry
that cannot name every one is **not checked**, and a clean bucket with a bare count is not a
tally. A `<where>` is a file and line, or `image pulled, label read` — never a bare "config".
Where an `Inputs` line names the image metadata label conditionally and the condition holds,
"read" means the image was pulled and the label read; where it does not hold, the label is not
an input for this config and is left out of the entry.

### The not-checked block

Print this every time, even when every line is "not checked":

```
not checked   JSON Schema conformance     no validator run — the CLI ships none, SchemaStore is editor-only
not checked   Dockerfile lint             hadolint not available
not checked   image vulnerabilities       trivy not available
not checked   image supply chain          docker scout available but NOT RUN — image not pulled
not checked   image configuration         dockle not available
not checked   devcontainer.json lint      decolint not available
not checked   resolved Feature order      devcontainer CLI not available
not checked   base image metadata         image not pulled
```

Adjust each line to what the probe found. Every probed tool is in exactly one of three states
and each has a required outcome: **not installed** — keep the line, give that as the reason;
**installed but not run** — keep the line and say so in those words, the state most easily
misread as a pass; **run** — move it out of this block and report its result. Never drop a row
because a tool turned out to be present.

### The tally

Close with all four buckets, reconciled to twelve. A worked example, for a repo with no
devcontainer CLI available, no Features vendored, the base image not pulled, no Feature
authoring of its own, no Claude Code in the config, and nothing establishing prebuild use:

```
findings:             2   DC-SEC-001, DC-DEP-001
checked, no finding:  0   nothing qualifies: with the image unpulled, for every rule that did
                          not fire, the label could still supply what fires it
not checked:          8   conjunct 1 failed — an input was never read:
                          DC-FEAT-001  install order not resolved — devcontainer CLI not available
                          DC-FEAT-002  Feature contents not vendored in this workspace
                          conjunct 2 failed — the label could still supply what fires it:
                          DC-LIFE-001  hooks-absent input, and prebuild use not established
                          DC-LIFE-002  waitFor not established as set in the file
                          DC-LIFE-003  lifecycle commands merge as a collected list
                          DC-PERF-001  turns partly on a chown being absent — label not read
                          DC-USER-001  turns on a property being absent — label not read
                          DC-ENV-001   the probe setting may arrive via the label
not applicable:       2   DC-FEAT-003  this repo authors no Features
                          DC-CLAUDE-001  config does not install or run Claude Code
                          -----
                          12 of 12 rules accounted for

plus the non-rule areas in the not-checked block above.
```

That is a thin audit and it is the honest one for those inputs — pulling the image or running
the CLI is what moves rules out of "not checked", and an empty no-finding bucket is a result,
not a malfunction. Two of the eight failed on the *first* conjunct, not the label: `DC-FEAT-001`
and `DC-FEAT-002` read only attested-immune properties and are still not checked, because their
inputs were never read. `DC-DEP-001` is a finding for a different reason, and it is the one that
generalises — it reports only keys it can *see* in the file, and a value present in the file wins
the merge, so what it cannot see can cost it a missed finding and can never produce a false one.
That direction argument holds for every rule that fires on presence, and it does not make the
rule label-immune: all but one of the properties it reads have no row in the source at all.
Every placement follows from the scenario plus the rule's own `Inputs` line — the list for rows
1–3 — and, for row 4, the `Detect`'s scope clause; re-derive rather than copy. What does not
vary is the reconciliation: twelve, every time. Never merge the buckets, never let a
green-sounding sentence stand in for any, and never drop an unplaceable rule from the report.

---

## AUTHOR

Write or modify a configuration.

**Load `references/spec-facts.md`.** It carries the mechanics — lifecycle ordering and re-run
gating, prebuilds, Feature resolution, image metadata merge rules, Codespaces divergences,
substitutions, the CLI surface. Use it instead of recalling property names.

**If it cannot be read, say so in your first sentence and continue in a narrowed mode.** You may
still edit properties already present in the user's file and still cite rule IDs. You may not
introduce a property that is not already there, assert a default, or claim a substitution or CLI
flag exists, without a source you can point at — the spec is at
<https://containers.dev/implementors/json_reference/>. Never fill the gap from memory.

### Rules of engagement

- **State defaults explicitly and cite them**, taking the value from the rule or the spec
  rather than from this page. A reader who does not know a default cannot tell your choice
  from an accident.
- **Change only what was asked.** Do not reorder keys, reformat, strip comments or "tidy" the
  rest of the file (refusal 6). If something else is wrong, say so; do not fix it unasked.
- **Do not invent property names.** Check the schema facts in `references/spec-facts.md`.
- **Prefer an image plus Features over a Dockerfile** when a maintained Feature exists, a
  Dockerfile when none does. `[OPINION]`
- **Pin versions you add.** An untagged Feature or image means `latest`, and a non-reproducible
  environment week to week. An *existing* unpinned reference you were not asked about is not
  yours to change: say it, tag it `[OPINION]`, offer it — that is refusal 6, not a nicety.
- **Say which hook you chose and why** whenever you place a lifecycle command, opening the rule
  that governs the choice rather than paraphrasing it — `DC-LIFE-001` for what a prebuild bakes,
  `DC-LIFE-003` for the non-string forms, `DC-LIFE-002` for `waitFor`.
- **Cite the rule for the decision**, taking the claim from the rule rather than from this page.
  Routing by topic: secrets → `DC-SEC-001`; `remoteUser` / `containerUser` → `DC-USER-001`;
  environment lifecycle commands must see → `DC-ENV-001`; deprecated top-level properties →
  `DC-DEP-001`; named volumes and workspace mounts → `DC-PERF-001`; Feature install order →
  `DC-FEAT-001`; Feature idempotence and rebuilds → `DC-FEAT-002`; writing a Feature's
  `install.sh` → `DC-FEAT-003`; Claude Code in the container → `DC-CLAUDE-001`.
- **Label every non-spec recommendation `[OPINION]` inline**, not in a footnote.

### After writing

Say plainly the change needs a rebuild to take effect, and give the command — but do not run it:
`devcontainer up` and `docker build` need explicit confirmation (refusal 5).

```bash
command -v devcontainer >/dev/null 2>&1 && echo "devcontainer available — ask before running:  devcontainer up --workspace-folder ."
```

Do not claim the config is valid — nothing validated it. Say what you checked by reading, and
that no schema validation ran (refusal 2).

### Minimum viable config

Start here and add only what the user needs:

```jsonc
{
  "name": "project",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "22" }
  },
  "remoteUser": "vscode"
}
```

Every further property should answer a question the user actually asked; a config carrying
`runArgs`, `mounts` and a Dockerfile because it was copied from somewhere is harder to debug.

This starting point sets `remoteUser` and leaves `updateRemoteUserUID` unset, a condition
`DC-USER-001` detects — deliberate, but it means the starting point is not audit-clean by
construction. Open that rule, say what leaving the default does, and let them decide. Never
hand over a config that would produce a finding without saying so.

---

## DEBUG

Symptom-keyed. Match what the user typed to a heading, work the list in order, and stop at the
first cause that explains the behaviour.

**If a reference file cannot be read, say so and keep going** — the symptom lists stand on
their own, except the Codespaces divergences, which live in `spec-facts.md`: without it, say
you cannot enumerate them. Without `spec-facts.md`, do not assert a default, an enum, a merge
rule or a CLI flag from memory. Without `rules.md`, you still have the observable and the
mechanism: give those, then say plainly that the rule's normative half is unavailable, and name
the ID to look up. An honest dead end is the correct output; an invented answer is not.

The lists name an observable and route to a rule; they deliberately carry none of the rule's
claim. Open the rule before asserting anything normative, or say that you could not.

Ask for the actual error text before theorising. "It won't build" plus the first fifteen
lines of output resolves faster than any list here.

### "It won't build"

1. **Read the first error, not the last.** Build output ends with a generic failure line; the
   real cause is usually several screens above it.
2. **Architecture mismatch.** An arm64 host pulling an amd64-only image or Feature. Check
   `--platform` / `build.options`, and whether the Feature publishes an arm64 variant.
   `[OPINION]` — a host-side observation, not a rule and not spec.
3. **A Feature's `install.sh` failed.** Identify which from the output. It runs as root at
   build time; a script assuming the final user's home or PATH breaks here. `DC-FEAT-003`.
4. **An unpinned reference moved.** A base image or Feature on `latest` built last month and
   does not today; see what is pinned.
5. **`initializeCommand` failed.** It runs on the **host**, before any container exists, so a
   missing host tool there surfaces as a build failure unrelated to the image.
6. **Deprecated build properties.** Top-level `dockerFile` / `context` are deprecated for
   `build.dockerfile` / `build.context`; mixing them confuses paths. `DC-DEP-001`.
7. **Registry auth or network.** A private base image or Feature with no credentials fails at
   pull, not at build.

Only after the list: a local build reproduces it, if the CLI is available and the user confirms
(refusal 5).

### "It behaves differently in Codespaces"

Codespaces diverges from a local dev container in documented ways. **The list of divergences
is `references/spec-facts.md`'s Codespaces section**, which carries more of them than this file
ever did — read it before assuming a bug. Two items stay here because they route to rules:

1. **A prebuild changes what has already run by the time you attach.** The observable shape:
   setup work finished on one side is still running, or missing, on the other. Which lifecycle
   hooks a prebuild bakes and which it does not is `DC-LIFE-001`; open it and compare against
   where the user's expensive step actually sits.
2. **Secrets come from Codespaces secrets**, not from a local file the config expects; where a
   real secret should live on either host is `DC-SEC-001`.

### "It's slow to start"

1. **Establish which phase is slow** — image pull, build, or lifecycle commands; they have
   different fixes and the user usually has not separated them.
2. **The expensive step is in a hook that runs every time.** Find which hook it is in, then
   check that against what a prebuild bakes — `DC-LIFE-001`.
3. **Bind-mount I/O penalty** on macOS and Windows, for directories with many small files
   (`node_modules`, `.venv`, build caches). The tell: slowness is in file access rather than
   the network or the build, and scales with file count rather than size. `DC-PERF-001` covers
   the fix and what it costs afterwards — do not propose a volume without reading it.
4. **Windows only:** a repository under `/mnt/c` accessed from WSL2 crosses a filesystem
   boundary on every access; moving it into the WSL filesystem often beats every other change
   here. `[OPINION]` — a host-side observation, not a rule and not spec.
5. **A second image is being built that nobody asked for** — if the build log shows a derived
   image appearing after the main one, go to `DC-USER-001`.
6. **Attach is waiting on a hook.** `waitFor` decides how far startup runs before the editor
   attaches. Read what it is set to, and check that the value is legal at all — the legal set
   is in `DC-LIFE-002`.
7. **Serial work that could overlap** — if several independent setup steps are chained into one
   string, check whether a non-string form applies (`DC-LIFE-003`).
8. **Feature count.** Each Feature is an install step; ask whether all are still used.

### "My changes aren't taking effect"

1. **Editing `devcontainer.json` does nothing until the container is rebuilt.** Establish what
   the user actually did — reopening, restarting and rebuilding are three different
   operations with three different outcomes.
2. **Lifecycle re-run is gated by marker files.** `onCreateCommand`, `updateContentCommand`
   and `postCreateCommand` are keyed to creation, `postStartCommand` to start, and
   `postAttachCommand` runs every attach — so a restart re-runs only the last two, and an edit
   to `postCreateCommand` does nothing until the container is **recreated**.
3. **You edited a shadowed file.** Re-check discovery precedence.
4. **The rebuild reused cached layers** — one that hits cache at every step changes nothing.
5. **You changed a Feature or its options and rebuilt from an image rather than from
   `devcontainer.json`.** Both halves of what goes wrong here — when Feature resolution is
   decided, and what happens to a Feature that is asked to install twice — are `DC-FEAT-002`.
   Open it before explaining the behaviour.
6. **The property never travels in the image metadata label**, so changing it and rebuilding
   from a prebuilt image does nothing. AUDIT's bucket table reads the list below and does not
   load `spec-facts.md`, so do not move it. Not label-storable: `initializeCommand`, `image`,
   `build.*`, `dockerComposeFile`, `service`, `runServices`, `appPort`, `runArgs`,
   `workspaceMount`, `workspaceFolder`, `features`, `overrideFeatureInstallOrder`, `name`.
   Each has an untagged row in the spec's JSON reference, whose legend marks per property
   whether it is recorded in the image label — positive attestation, not inference from
   absence. **A property with no row at all is one the source is silent about, and silence is
   not immunity**: for anything not listed here, read the merged configuration rather than
   infer. Top-level `extensions`, `settings` and `devPort` are exactly that case.
   **`mounts` is not on that list — it does travel, and it merges** (collected, last source
   wins), so a `mounts` entry that appears not to apply is more likely being overridden than
   ignored. `references/spec-facts.md` carries the full merge table.

### "It works in my terminal but not in postCreateCommand"

This is `DC-ENV-001` far more often than anything else. Start there.

1. **Your interactive terminal is not the shell the lifecycle command ran in.** `userEnvProbe`
   decides which shell startup files contribute. Read the config to see whether it is set, then
   open `DC-ENV-001` for the legal values and which is in force when it is not. Do not change
   the setting before reading the rule.
2. **Find where the variable is actually set.** `.bashrc` is read by interactive shells,
   `.profile` and `.bash_profile` by login shells. Better: set it in `containerEnv` or
   `remoteEnv` so it does not depend on shell startup at all — not for secrets (`DC-SEC-001`).
3. **Version managers are the classic case.** `nvm`, `pyenv`, `rbenv` and `sdkman` hook an rc
   file; if it is not sourced for the probe in effect, the tool is on PATH in your terminal
   and absent in the hook.
4. **`containerEnv` and `remoteEnv` are not interchangeable.** `containerEnv` is set on the
   container and visible to everything in it; `remoteEnv` applies to the remote user's sessions
   and lifecycle commands. Anything the entrypoint needs must be in `containerEnv`.
5. **Root at build time, remote user afterwards.** Build-time installation runs as root,
   lifecycle commands as the remote user, so a tool installed into root's home is not on the
   remote user's PATH and its files may be root-owned. Check where the tool landed; if a
   Feature put it there, `DC-FEAT-003` is how a Feature learns which user it installs for.
6. **Ordering within a hook.** Feature-contributed commands always run before the user's for
   the same hook, so a Feature's setup is done but a *later* user hook's is not. Check you are
   not depending on what a subsequent hook produces.
7. **Secrets reach the two environments by different routes.** A value you can echo in the
   terminal may be absent in the hook, or the reverse; where a real secret should come from is
   `DC-SEC-001`. Do not diagnose this one by asking the user to print the value.

---

## Reference files

- `references/rules.md` — the twelve rules, each with severity, tier (`SPEC` or `OPINION`),
  source URL, verbatim quote, verification date, `Detect` and `Fix`. The only place rule content
  lives; every mode cites IDs into it rather than restating it. Loaded in AUDIT.
- `references/spec-facts.md` — the mechanics the rules refer to: lifecycle ordering and re-run
  gating, prebuilds, Feature resolution and pinning, image metadata merge, Codespaces
  divergences, performance, docker-in-docker, substitutions, the CLI surface. Loaded in AUTHOR
  and DEBUG.

Each mode says what to do when a file it needs is missing — AUDIT stops, AUTHOR and DEBUG
narrow. In all three: say it was unavailable, never reconstruct it from memory as cited.

**Editing note.** Moving content into a reference file the mode *already loads* is free only if
the mode's degradation note stays true afterwards — DEBUG promises "the symptom lists stand on
their own", which is false once a symptom list lives in `spec-facts.md`; amend the promise in the
same edit. Moving content into a file the mode *does not load* is a correctness change wearing a
budget change's clothes: the not-label-storable list under "My changes aren't taking effect" is
**not movable** — AUDIT's bucket table depends on it and AUDIT does not load it.

**Out of scope: authoring Dev Container Templates.** No rule covers writing or publishing one;
the entry points are the `devcontainer templates` subcommands and
<https://containers.dev/implementors/templates/>. Say so rather than improvising guidance.
