---
name: devcontainers
description: Use when creating, editing, reviewing, validating or debugging a devcontainer.json, .devcontainer/ directory or Dev Container Feature, or when a containerised dev environment behaves differently from the host, fails to build, or is slow to start. Covers the containers.dev specification, Features, lifecycle commands, Codespaces prebuilds, and the tools that support them. Does not cover Dev Container Template authoring.
license: MIT
metadata:
  corpus_version: "0.1.0"
  spec_verified: "2026-08-31"
---

# Dev containers

This skill has three modes. Pick exactly one at the start of the turn, say which one you
picked, and stay in it until the user asks for something else.

| The request is | Mode | Load |
| --- | --- | --- |
| review, audit, check, "is this right", "any problems with this" | **AUDIT** | `references/rules.md` |
| create, add, write, change, migrate, "set up a dev container for" | **AUTHOR** | `references/spec-facts.md` |
| broken, slow, "why does", "it works locally but", "it stopped" | **DEBUG** | `references/spec-facts.md` |

If the request is ambiguous, ask which one before doing work. If an audit produces findings
and the user then says "fix them", that is a switch to AUTHOR — announce the switch, because
AUDIT does not edit files.

Load the reference file the mode names. Do not load both up front; DEBUG may open the corpus
on demand when a specific rule turns out to be implicated.

---

## Before any mode: find the config

Discovery precedence, highest first:

1. `.devcontainer/devcontainer.json`
2. `.devcontainer.json`
3. `.devcontainer/<folder>/devcontainer.json` — exactly one level deep, not recursive

Read the file that actually wins — a repo with two of these has one live config and one that
looks live, and several "my change did nothing" reports are exactly that.

`devcontainer.json` is JSONC — comments and trailing commas are legal, and a strict JSON
parser reports a syntax error on a valid file. Check for `//` and `/* */` before calling one
malformed.

**The file on disk is not the whole configuration.** Features contribute lifecycle commands
and environment, and a base image can carry a `devcontainer.metadata` label that merges in —
normally invisible without pulling the image. Say so rather than analysing the on-disk file
as if it were complete.

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

A tool being absent is a normal outcome, not a blocker. Report it and continue. Never
install a tool, never suggest installing one as a prerequisite for answering.

**If the surface you are running on cannot execute commands at all** — some review surfaces
cannot — do not write as though a command ran. Treat every tool as not available, do the
whole analysis by reading, and print the full "not checked" block. Nothing in this skill is
gated on running anything.

### Two official oracles — delegate to them

Both require `command -v devcontainer` to succeed first.

**Resolved Feature install order.** Do not hand-trace `dependsOn`, `installsAfter` and
`overrideFeatureInstallOrder` — that is a reliable source of wrong answers. Ask the reference
implementation:

```bash
command -v devcontainer >/dev/null 2>&1 && \
  devcontainer features resolve-dependencies --workspace-folder .
```

Use its output as the answer. Cite `DC-FEAT-001` for why the override you were about to
suggest cannot do what it looks like it does. If the CLI is not available, say the order was
not resolved and describe the inputs you can see, without asserting a final order.

**Feature authoring conformance.** For someone writing or maintaining a Feature, the official
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

On refusal 3: the failure mode is a reader skimming a report, seeing no complaint about image
vulnerabilities, and concluding the image is clean. Never write a summary line — "no security
issues", "looks good", "all clear" — that covers an area you did not check.

---

## AUDIT

Read and report. **Do not edit any file in this mode.**

**Load `references/rules.md` now.** The twelve rules, their severities, tiers, sources,
`Detect` and `Fix` live there and nowhere else. Never restate a rule from memory or reason
about what one "probably" says — open the file. If it cannot be read, say the corpus was
unavailable and stop: an audit from a remembered corpus is worse than no audit.

### Procedure

1. Locate the winning config (above). Note any shadowed configs.
2. Parse it as JSONC. Note the Features, the base image or Dockerfile, and every lifecycle
   hook present.
3. Note what you cannot see: the image metadata label, private Feature contents, the resolved
   install order without the CLI. These become "not checked" lines, not assumptions.
4. Run the tool probe. Run only what is available and only what is read-only.
5. Walk the twelve rules in `references/rules.md` order, applying each rule's own `Detect`.
6. Emit the report in the format below.

### Report format

One header line, then findings, then the not-checked block, then the tally.

```
devcontainers · AUDIT · .devcontainer/devcontainer.json · rules corpus <version>
```

Take the corpus version from `references/rules.md` if it carries one; otherwise omit it rather
than guess. Do not print this file's own `corpus_version` as if it were the corpus's — nothing
keeps the two in step.

Every finding line carries the rule ID and the tier tag. No exceptions. The shape:

```
DC-XXX-NNN  [TIER]  SEVERITY  <file>:<line>  <what was found>
```

Severity and tier are corpus-owned and they change. Read both from the `Severity` and `Tier`
fields of the rule you just opened — never from memory, never from an example. The tier tag
is printed on every line so a reader who quotes one line still carries the SPEC/OPINION
distinction with it; an `[OPINION]` line must never be phrased as a spec requirement.

Give each finding the fix from the rule's own `Fix` field, kept to the change rather than
expanded into a rewrite. Treat a `Fix` snippet as illustrative: AUDIT neither edits nor runs,
and anything in one that builds or starts a container needs explicit confirmation (refusal 5).

**A finding with no rule ID is not a finding.** If you noticed something real that no rule
covers, put it under a separate `Observations` heading, label it as outside the corpus, and
do not give it a severity.

### Every rule lands in exactly one bucket

Each of the twelve rules ends up in exactly one of four places, and the buckets total twelve
— reconcile before you emit. A rule silently missing from the report is the same failure as
"not checked" reading as "passed".

| Bucket | Use it only when |
| --- | --- |
| **finding** | the firing input is present in the file and wins the merge — what you found, you found |
| **checked, no finding** | *every* property the `Detect` reads is label-immune, or present in the file and winning |
| **not checked** | anything else — an input was unavailable, or the label could still supply what fires the rule |
| **not applicable** | the rule's own `Detect` scopes it out of this config |

Why the two middle rows differ. For every property these twelve rules read,
`devcontainer.json` "is considered last" when the order matters (`image-metadata.md`), so a
value present in the file wins — but the label can still **add** what the file never showed:
lifecycle commands and `mounts` are collected lists, `remoteEnv` / `containerEnv` merge per
variable. (A claim about these rules' properties, not a law of the merge system; a few merge
the other way.) Hence: **an audit can soundly report what it found, not that it is clean.**

Working a row needs the `Detect`, the config, and whether each property it names is
label-storable — the twelve-item list under "My changes aren't taking effect" is the in-file
source for that last input, and a compound `Detect` is only as sound as its weakest conjunct.
The on-disk file is not necessarily the whole config, whatever the corpus says about *files*.

A rule goes in **not applicable** only when its own `Detect` scopes it out — a rule limited to
configs installing a particular tool, applied to one that does not; a Feature-authoring rule,
applied to a repo that authors none. Name the condition. If you cannot decide which bucket a
rule belongs in, it is **not checked**. Not having looked is not the same as having looked and
found nothing.

### The not-checked block

Print this every time, even when every line is "not checked":

```
not checked   JSON Schema conformance     no validator run — the CLI ships none, SchemaStore is editor-only
not checked   Dockerfile lint             hadolint not available
not checked   image vulnerabilities       trivy not available
not checked   image configuration         dockle not available
not checked   devcontainer.json lint      decolint not available
not checked   resolved Feature order      devcontainer CLI not available
not checked   base image metadata         image not pulled
```

Adjust each line to what the probe found. If a tool was available **and did run**, move it out
of this block and report its result instead.

### The tally

Close with all four buckets, reconciled to twelve. A worked example, for a repo with no
devcontainer CLI available, no Features vendored, the base image not pulled, no Feature
authoring of its own, no Claude Code in the config, and nothing establishing whether it uses
prebuilds:

```
findings:             2   DC-SEC-001, DC-DEP-001
checked, no finding:  0   nothing qualifies: with the image unpulled, for every rule that did
                          not fire, the label could still supply what fires it
not checked:          8   DC-FEAT-001  install order not resolved — devcontainer CLI not available
                          DC-FEAT-002  Feature contents not vendored in this workspace
                          DC-PERF-001  turns partly on a chown being absent — label not read
                          DC-LIFE-001  hooks-absent input, and prebuild use not established
                          DC-LIFE-002  waitFor not established as set in the file
                          DC-LIFE-003  lifecycle commands merge as a collected list
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
not a malfunction. `DC-DEP-001` is the one rule of the twelve whose whole input set is
label-immune, so it is sound in both directions: had it not fired, it would have been the one
legitimate "checked, no finding" entry here. Every placement follows from the scenario plus
the rule's own `Detect` — re-derive them rather than copying this shape. What does not vary is
the reconciliation: twelve, every time. Never merge the buckets, never let a green-sounding
sentence stand in for any of them, and never resolve an unplaceable rule by dropping it.

---

## AUTHOR

Write or modify a configuration.

**Load `references/spec-facts.md`.** It carries the mechanics — lifecycle ordering and re-run
gating, prebuild behaviour, Feature resolution, image metadata merge rules, Codespaces
divergences, substitutions, the CLI surface. Use it instead of recalling property names.

**If it cannot be read, say so in your first sentence and continue in a narrowed mode.** You
may still edit properties already present in the user's file and still cite rule IDs. You may
not introduce a property that is not already there, assert a default, or claim a substitution
or CLI flag exists, without a source you can point at — the spec is at
<https://containers.dev/implementors/json_reference/>. Do not fill the gap from memory and
present the result as cited.

### Rules of engagement

- **State defaults explicitly and cite them.** Name the default you are relying on and where
  it comes from, taking the value from the rule or the spec rather than from this page. A
  reader who does not know a default cannot tell your choice from an accident.
- **Change only what was asked.** Do not reorder keys, reformat, strip comments, or "tidy"
  the rest of the file (refusal 6). If you think something else is wrong, say so; do not fix
  it unasked.
- **Do not invent property names.** Check the schema facts in `references/spec-facts.md`, and
  when checking for unknown properties never descend into `customizations.*` — that namespace
  is intentionally open, has no registry or schema constraint, and any tool may claim a key.
- **Prefer an image plus Features over a Dockerfile** when a maintained Feature exists; reach
  for a Dockerfile when it does not. `[OPINION]`
- **Pin versions.** An untagged Feature or image reference means `latest` and makes the
  environment non-reproducible from one week to the next.
- **Say which hook you chose and why** whenever you place a lifecycle command, and open the
  rule that governs the choice rather than paraphrasing it — `DC-LIFE-001` for which hooks a
  prebuild bakes, `DC-LIFE-003` for the non-string forms, `DC-LIFE-002` for `waitFor`.
- **Cite the rule for the decision**, and take the claim from the rule rather than from this
  page. Routing by topic: secrets → `DC-SEC-001`; `remoteUser` / `containerUser` →
  `DC-USER-001`; environment that lifecycle commands must see → `DC-ENV-001`; deprecated
  top-level properties → `DC-DEP-001`; named volumes and workspace mounts → `DC-PERF-001`;
  Feature install order → `DC-FEAT-001`; Feature idempotence and rebuild behaviour →
  `DC-FEAT-002`; writing a Feature's `install.sh` → `DC-FEAT-003`; Claude Code inside the
  container → `DC-CLAUDE-001`.
- **Label every non-spec recommendation `[OPINION]` inline**, at the point of the
  recommendation, not in a footnote.

### After writing

Say plainly that the change does not take effect until the container is rebuilt, and give the
command — but do not run it. `devcontainer up` and `docker build` need explicit confirmation
(refusal 5); both take minutes and consume disk.

```bash
command -v devcontainer >/dev/null 2>&1 && echo "devcontainer available — ask before running:  devcontainer up --workspace-folder ."
```

Do not claim the config is valid — nothing validated it. Say what you checked by reading, and
that no schema validation was run (refusal 2).

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
`runArgs`, `mounts`, `postAttachCommand` and a Dockerfile because it was copied from somewhere
is harder to debug than one that does not.

This starting point sets `remoteUser` and leaves `updateRemoteUserUID` unset, which is a
condition `DC-USER-001` detects — deliberate, but it means the starting point is not
audit-clean by construction. Open that rule, say what leaving the default does on the user's
platform, and let them decide. Never hand over a config that would produce a finding without
saying that it would.

---

## DEBUG

Symptom-keyed. Match what the user typed to a heading, work the list in order, and stop at
the first cause that explains the observed behaviour. Load `references/spec-facts.md` for the
mechanics; open `references/rules.md` on demand when a specific rule turns out to be
implicated.

**If a reference file cannot be read, say so and keep going** — the symptom lists stand on
their own. Without `spec-facts.md`, do not assert a default, an enum, a merge rule or a CLI
flag from memory. Without `rules.md`, you still have the observable and the mechanism: give
those, then say plainly that the rule's normative half — what is actually wrong and what to
change — is unavailable here, and name the ID for the user to look up. Never supply that half
from memory. An honest dead end is the correct output; an invented answer is not.

The lists name an observable and route to a rule. They deliberately do not carry the rule's
claim, its severity or its tier — those are corpus-owned and they change. Open the rule
before asserting anything normative, or say that you could not.

Ask for the actual error text before theorising. "It won't build" plus the first fifteen
lines of output resolves faster than any list here.

### "It won't build"

1. **Read the first error, not the last.** Build output ends with a generic failure line; the
   real cause is usually several screens above it.
2. **Architecture mismatch.** An arm64 host pulling an amd64-only image or Feature. Check
   `--platform` / `build.options`, and whether the Feature publishes an arm64 variant.
   `[OPINION]` — a host-side observation, not a rule and not spec.
3. **A Feature's `install.sh` failed.** Identify which one from the output. It runs as root
   at build time; a script that assumes the final user's home directory or PATH breaks here.
   See `DC-FEAT-003`.
4. **An unpinned reference moved.** A base image or Feature on `latest` built last month and
   does not today. See what is pinned and what is not.
5. **`initializeCommand` failed.** It runs on the **host**, before any container exists, so a
   missing host tool there surfaces as a build failure unrelated to the image.
6. **Deprecated build properties.** Top-level `dockerFile` and `context` are deprecated for
   `build.dockerfile` / `build.context`; mixing them confuses path resolution. `DC-DEP-001`.
7. **Registry auth or network.** A private base image or Feature with no credentials fails at
   pull, not at build.

Only after the list: if the CLI is available and the user confirms, a build reproduces it
locally. Ask first (refusal 5).

### "It behaves differently in Codespaces"

Codespaces diverges from a local dev container in documented ways. Check these before
assuming a bug.

1. **`customizations.codespaces` and `hostRequirements` are read from `devcontainer.json`
   only**, not from the image metadata label — so a value that reached your local container
   via a base image label does not apply there.
2. **Some local-only properties are simply not honoured:** bind mounts other than the Docker
   socket, the `"host:port"` form of `forwardPorts`, and `shutdownAction`.
3. **A prebuild changes what has already run by the time you attach.** The observable shape:
   setup work that is finished on one side is still running, or missing, on the other — "the
   environment is ready instantly locally but the prebuilt Codespace still installs
   dependencies on first attach", or the mirror image. Which lifecycle hooks a prebuild bakes
   and which it does not is `DC-LIFE-001`; open it and compare against where the user's
   expensive step actually sits.
4. **Secrets come from Codespaces secrets**, not from a local file the config expects.

### "It's slow to start"

1. **Establish which phase is slow** — image pull, build, or lifecycle commands. They have
   different fixes and the user usually has not separated them.
2. **The expensive step is in a hook that runs every time.** Find which hook it is in, then
   check that against what a prebuild bakes — `DC-LIFE-001`.
3. **Bind-mount I/O penalty** on macOS and Windows, for directories with many small files
   (`node_modules`, `.venv`, build caches). The tell is that the slowness is in file access,
   not in the network or the build, and that it scales with file count rather than size.
   `DC-PERF-001` covers what to do about it and what the fix costs you afterwards — do not
   propose a volume without reading it.
4. **Windows only:** a repository living under `/mnt/c` and accessed from WSL2 crosses a
   filesystem boundary on every access; moving it into the WSL filesystem often beats every
   other change here. `[OPINION]` — this is a host-side observation, not a rule and not spec.
5. **A second image is being built that nobody asked for.** If the build log shows a derived
   image appearing after the main one, go to `DC-USER-001`.
6. **Attach is waiting on a hook.** `waitFor` decides how far startup runs before the editor
   attaches. Read what it is set to, and check that the value is legal at all — the legal set
   is in `DC-LIFE-002`.
7. **Serial work that could overlap.** If several independent setup steps are chained into
   one string, check whether a non-string form applies — `DC-LIFE-003`.
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
4. **The rebuild reused cached layers.** One that hits cache at every step changes nothing.
5. **You changed a Feature or its options and rebuilt from an image rather than from
   `devcontainer.json`.** Both halves of what goes wrong here — when Feature resolution is
   decided, and what happens to a Feature that is asked to install twice — are `DC-FEAT-002`.
   Open it before explaining the behaviour.
6. **The property never travels in the image metadata label**, so changing it and rebuilding
   from a prebuilt image changes nothing. Not label-storable: `initializeCommand`, `image`,
   `build.*`, `dockerComposeFile`, `service`, `runServices`, `appPort`, `runArgs`,
   `workspaceMount`, `workspaceFolder`, `features`, `overrideFeatureInstallOrder`.
   **`mounts` is not on that list — it does travel, and it merges** (collected, last source
   wins), so a `mounts` entry that appears not to apply is more likely being overridden than
   ignored. `references/spec-facts.md` carries the full merge table.

### "It works in my terminal but not in postCreateCommand"

This is `DC-ENV-001` far more often than anything else. Start there.

1. **Your interactive terminal is not the shell the lifecycle command ran in.** Which shell
   startup files contribute to the lifecycle environment is decided by `userEnvProbe`. Read
   the config to see whether it is set, then open `DC-ENV-001` for the legal values and which
   one is in force when it is not set. Do not change the setting before reading the rule.
2. **Find where the variable is actually set.** `.bashrc` is read by interactive shells,
   `.profile` and `.bash_profile` by login shells. Better: set it in `containerEnv` or
   `remoteEnv` so it does not depend on shell startup at all — not for secrets (`DC-SEC-001`).
3. **Version managers are the classic case.** `nvm`, `pyenv`, `rbenv` and `sdkman` hook an rc
   file; if that file is not sourced for the probe in effect, the tool is on PATH in your
   terminal and absent in the hook.
4. **`containerEnv` and `remoteEnv` are not interchangeable.** `containerEnv` is set on the
   container and visible to everything in it; `remoteEnv` applies to the remote user's
   sessions and lifecycle commands. Anything the entrypoint needs must be in `containerEnv`.
5. **Root at build time, remote user afterwards.** Build-time installation runs as root,
   lifecycle commands as the remote user, so a tool installed into root's home is not on the
   remote user's PATH and its files may be root-owned. Check where the tool landed; if a
   Feature put it there, `DC-FEAT-003` is how a Feature learns which user it installs for.
6. **Ordering within a hook.** Feature-contributed commands always run before the user's
   command for the same hook, so a Feature's setup is done but a *later* user hook's is not.
   Check you are not depending on something a subsequent hook produces.
7. **Secrets reach the two environments by different routes.** A value you can echo in the
   terminal may be absent in the hook, or the reverse; where a real secret should come from is
   `DC-SEC-001`. Do not diagnose this one by asking the user to print the value.

---

## Reference files

- `references/rules.md` — the twelve rules, each with severity, tier (`SPEC` or `OPINION`),
  source URL, verbatim quote, verification date, `Detect` and `Fix`. The only place rule
  content lives; every mode cites IDs into it rather than restating it. Loaded in AUDIT.
- `references/spec-facts.md` — the mechanics the rules refer to: lifecycle ordering and re-run
  gating, prebuilds, Feature resolution and pinning, image metadata merge rules, Codespaces
  divergences, performance, docker-in-docker shapes, substitutions, the open `customizations`
  namespace, and the CLI surface. Loaded in AUTHOR and DEBUG.

Each mode says what to do when a file it needs is missing — AUDIT stops, AUTHOR and DEBUG
narrow. In all three: say it was unavailable, and never reconstruct its contents from memory
and present the result as cited.

**Out of scope: authoring Dev Container Templates.** No rule covers writing or publishing one;
the entry points are the `devcontainer templates` subcommands and
<https://containers.dev/implementors/templates/>. Say so rather than improvising guidance.
