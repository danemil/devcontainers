# Dev container rules

author: Emil Dan

email: emil.dan@publicissapient.com

corpus_version: 0.3.0

This line is the authoritative corpus version. An audit report that stamps a version reads it
from here, not from the skill file; if the two disagree, this file wins.

Bump it by what a **consumer experiences**, not by how large the edit was. Three cases:

- **Patch** — a citation, source URL, or wording correction that leaves the finding set alone.
- **Minor** — a rule added, retired, or re-tiered.
- **Minor** — a `Detect` change that alters what the corpus emits for an unchanged
  configuration, even though no rule's identity changed.

The third case is decided by one question, not by taste: **would the same configuration now
produce a different finding set?** If yes, it is a minor bump, however small the edit looked.
`0.1.0` → `0.2.0` was exactly that: two `Detect` fields were narrowed, and findings that used
to be emitted are no longer emitted. Rule IDs are a published interface, and so is the version
they ship under.

Twelve rules for auditing a `devcontainer.json`. This file is loaded on demand; read it when
you are reviewing, writing, or debugging a dev container configuration and you need the
specific, citable claim rather than general knowledge.

Every rule carries a source. The tier encodes **two** axes, and a rule is `SPEC` only when it
satisfies both:

1. *Provenance* — the behaviour is stated in the Dev Container specification, the reference
   CLI, or official vendor documentation, not inferred by this package.
2. *Applicability* — the rule applies to any dev container, rather than being conditional on a
   tool the Dev Container specification does not mention.

`OPINION` means at least one of those fails: either this package is recommending something no
source states, **or** the mechanism is vendor-documented but only bites projects that use a
particular tool. `DC-CLAUDE-001` is the second kind — every mechanical claim in it is stated in
Anthropic's own documentation, yet nothing in the Dev Container specification requires any of
it, so it is `OPINION` and its `Detect` says which configurations it applies to at all. Never
present an `OPINION` rule as spec; equally, do not read `OPINION` as "unsourced" without
checking which axis failed.

IDs are a published interface. They are never reused. A retired rule keeps its ID and gains
`superseded_by`. A rule a project does not want is suppressed with `prompt_include: false`,
never deleted — a deleted ID would silently un-suppress if the ID were ever re-issued, which
is exactly why IDs are never re-issued.

Format:

```
  (The lines below are indented two spaces ON PURPOSE. The corpus verification counts
  `^- \*\*Severity:\*\*` and friends; un-indenting this template silently turns every
  field count from 12 into 13 and the check still prints a plausible number.)

  ### DC-XXX-NNN · <one-sentence assertion>
  - **Severity:** ERROR | WARN | INFO
  - **Tier:** SPEC | OPINION
  - **Source:** <url>
  - **Quote:** "<verbatim, under 300 characters>"
  - **Verified:** YYYY-MM-DD
  - **Inputs:** <what the Detect reads — config properties in backticks; files outside the config; the image metadata label when a property read is not on SKILL.md's not-label-storable list>
  - **Detect:** <what to look for when reading devcontainer.json>
  - **Fix:** <the concrete change>
```

## Quoting conventions

- Every quote was opened at its `Source` URL and confirmed verbatim on 2026-09-01, and every
  `Source` URL was resolved and returns 200 on that date. Backticks inside a quote are the
  source's own inline-code markup; they render as `<code>` on the published page.
- A `Quote` field's value is delimited by the **first and last double-quote characters on the
  line**; everything between them is source text. Two quotes are drawn from JSON and so contain
  their own inner double quotes — this rule disambiguates them without altering the source.
- Quotes are reproduced from the **markdown or JSON source** of the cited page. A published
  page may render straight apostrophes and quotation marks typographically (`'` as `'`, `"` as
  `"`); that is a rendering difference, not a quoting error.
- A ` … ` inside a quote marks an elision between two passages **on the same source page** —
  usually a hyperlink target or an intervening clause. Each fragment either side of it is
  itself verbatim.
- Quotes taken from a source file rather than from prose — a JSON schema, a TypeScript option
  table, a YAML action definition — are whitespace-normalised: leading indentation is dropped
  and line breaks are collapsed to single spaces. Every token, including escaped inner quotes,
  is otherwise unchanged, and a trailing separator such as a `,` closing the source line falls
  outside the quote.

## Severities are provisional

Gate D — the adjudicated false-positive measurement that was to confirm these severities —
has been **deferred**; it now runs only if Gate E shows lift. The severities of
`DC-LIFE-001`, `DC-SEC-001` and `DC-PERF-001` are therefore **unconfirmed**. No
false-positive rate has been measured for any rule; do not quote one.

`DC-LIFE-001` is the known candidate for demotion to `INFO`: it fires on configurations that
are correct precisely because those projects never use prebuilds. Its `Detect` section states
that scope explicitly. Treat its ERROR severity as a hypothesis, not a finding.

## A note on shelling out

None of `devcontainer`, `hadolint`, `trivy`, `dockle`, `docker scout` or `decolint` can be
assumed present. Every shell snippet below probes with `command -v` first and degrades to a message.

**No rule requires running a tool.** Nine of the twelve read `devcontainer.json` and nothing
else. Three read one file more: `DC-FEAT-001` needs each referenced Feature's
`devcontainer-feature.json`, for the `dependsOn` and `installsAfter` edges; `DC-FEAT-003` reads
the Feature's own `install.sh`; `DC-FEAT-002` reads both — the configuration for a
rebuild-from-image or a Feature listed twice with different options, and `install.sh` for the
idempotency check. Nothing here depends on an installed binary.

**Reading the file is not the same as knowing the configuration.** At runtime
`devcontainer.json` is merged with the image's `devcontainer.metadata` label, and per the
spec's merge logic, "When the order matters, the devcontainer.json is considered last." So a
value **present** in the file wins that merge and can be relied on; a value **absent** from the
file may still be supplied by the label, and the file alone cannot tell you that it was. Say
what the file states, and say where the label could still change it.

**Label-immunity is read off a positive marker, never inferred from absence.** The
containers.dev property reference tags every storable property: "Metadata properties marked
with a 🏷️ can be stored in the `devcontainer.metadata` **container image label** in addition to
`devcontainer.json`." A property row *without* the tag is attested as not storable. A property
with **no row at all** is a property the source is silent about — and silence is not immunity.
Do not derive immunity by subtracting one list from another; both enumerations in the spec's
image-metadata document declare themselves open ("We can add to these lists as we add more
properties"), and a complement of an open list is not a fact.

Read that way, two rules are fully attested and one is not:

- `DC-FEAT-001` reads `features` and `overrideFeatureInstallOrder`; both have untagged rows in
  the reference, so both are attested not storable.
- `DC-FEAT-002` reads the image reference and `features`; both have untagged rows, likewise
  attested.
- `DC-DEP-001` reads top-level `extensions`, `settings`, `devPort` and `appPort`. Only
  **`appPort`** has a row, untagged, and is attested. The other three are VS Code schema
  properties with **no row in the property reference at all** — the source attests nothing
  about them in either direction, so do not call them label-immune.

`DC-DEP-001` has been the tidy example for this bucket and that was overstated: it is attested
for one input of four. What saves it in practice is not immunity but direction — it reports
only keys it can *see* in the configuration, and a value present in the file wins the merge, so
the unattested three can cost it a missed finding and can never produce a false one. State it
that way rather than as immunity.

For the two `DC-FEAT` rules the attestation stops at the inputs: what they reason about is
dependency resolution, whose *outcome* is frozen onto the label at first creation — which is
`DC-FEAT-002`'s own subject.

The other nine each read at least one property the label can contribute: the lifecycle
commands, `waitFor`, `remoteEnv`, `containerEnv`, `mounts`, `remoteUser`, `containerUser`,
`updateRemoteUserUID` and `userEnvProbe` are all on that list. For those nine an absence in the
file is not evidence of an absence at runtime.

**The snippets are illustrative, not runnable on sight.** Two of them invoke `devcontainer up`,
which creates a container and consumes time and disk. Never run either without the user's
explicit confirmation — reproduce the snippet in a finding, do not execute it. An audit is
read-only. `devcontainer features resolve-dependencies` is a read-only query and is exempt.

---

### DC-LIFE-001 · Expensive work in `postCreateCommand` is never baked into a Codespaces prebuild — `onCreateCommand` and `updateContentCommand` are, and the reference CLI's `--prebuild` stops after `updateContentCommand` and re-runs it.
- **Severity:** ERROR
- **Tier:** SPEC
- **Source:** https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds
- **Quote:** "performing setup operations up to and including any `onCreateCommand` and `updateContentCommand` commands in the `devcontainer.json` file. No `postCreateCommand` commands are run during the creation of a prebuild."
- **Verified:** 2026-09-01
- **Inputs:** `postCreateCommand`, `onCreateCommand` and `updateContentCommand`; evidence that this project prebuilds — a Codespaces prebuild configuration, or a CI job invoking `--prebuild`; the image metadata label when any of those three hooks is absent from the file.
- **Detect:** Read `postCreateCommand`. Flag it when it carries cacheable, expensive setup — `npm ci`, `npm install`, `yarn install`, `pnpm install`, `pip install`, `poetry install`, `bundle install`, `go mod download`, `cargo fetch`, `apt-get install`, `make`, `gradle`, `mvn` — while `onCreateCommand` and `updateContentCommand` are absent or trivial. Check the object form entry by entry, not just the string form (see `DC-LIFE-003`). Corroborating, from the reference CLI's own flag definition in `src/spec-node/devContainersSpecCLI.ts`: "Stop after onCreateCommand and updateContentCommand, rerunning updateContentCommand if it has run before." — under `--prebuild`, `postCreateCommand` never fires at all. **Scope:** this only bites a project that actually uses prebuilds (Codespaces prebuild configurations, or a CI job invoking `--prebuild`). A project that never prebuilds is not wrong to put installs in `postCreateCommand`; say so rather than reporting a defect.
- **Fix:** Move the cacheable half into `onCreateCommand` — which the containers.dev reference describes as usable by "Cloud services … when caching or prebuilding a container. This means that it will not typically have access to user-scoped assets or secrets." — or into `updateContentCommand`, which the same reference says "cloud services will also periodically execute … to refresh cached or prebuilt containers". Leave in `postCreateCommand` only work that needs the assigned user's own credentials or permissions. To confirm what a prebuild would bake — **ask before running: this creates a container**:
  ```bash
  if command -v devcontainer >/dev/null 2>&1; then
    devcontainer up --workspace-folder . --prebuild
  else
    echo "devcontainer CLI not installed - reason about the config by reading it"
  fi
  ```

### DC-SEC-001 · The reference CLI writes `remoteEnv` from devcontainer.json into the `devcontainer.metadata` image label by default; real secrets belong in `--secrets-file`.
- **Severity:** ERROR
- **Tier:** SPEC
- **Source:** https://github.com/devcontainers/cli/blob/main/src/spec-node/devContainersSpecCLI.ts
- **Quote:** "'omit-config-remote-env-from-metadata': { type: 'boolean', default: false, hidden: true, description: 'Omit remoteEnv from devcontainer.json for container metadata label' }"
- **Verified:** 2026-09-01
- **Inputs:** `remoteEnv`, `containerEnv` and `build.args`, and the literal value of every entry in them; the image metadata label when `remoteEnv` or `containerEnv` is absent from the file.
- **Detect:** `default: false` on the *omit* flag is the reference CLI stating outright that the omission is off — so `remoteEnv` **is** written to the metadata label unless you ask otherwise, and anyone who can pull the image can read it. `hidden: true` sharpens the rule: the flag does not appear in `--help`, so an operator will not discover the behaviour by asking the tool. Two independent corroborations: the CLI changelog entry "Add `--omit-config-remote-env-from-metadata` to omit remoteEnv from devcontainer config on container metadata label.", and the spec's image-metadata document, which lists what may be recorded in the label — "Current dev container config that can be recorded in the image: `mounts`, `onCreateCommand`" … "`remoteUser`, `userEnvProbe`, `remoteEnv`, `containerEnv`". **The value decides, not the key.** An entry is a finding only when its value is a literal credential written into the file. An entry whose value is a substitution reference — `${localEnv:NAME}` or `${containerEnv:NAME}`, with or without a `:default` — is **not a finding at any severity, whatever its key is called**: the literal never enters the file and never reaches the image label, which is this rule's entire subject. The entry `"GITHUB_TOKEN"` set to `${localEnv:GITHUB_TOKEN}` is the form the `Fix` below prescribes, so reporting it contradicts this rule's own remedy and is wrong. A secret-shaped key name — `TOKEN`, `SECRET`, `KEY`, `PASSWORD`, `PASSWD`, `CREDENTIAL`, `_PAT` — is a reason to read the value and is never by itself a reason to report. Report a literal that looks like a credential: a long opaque string, a recognisable prefix such as `sk_`, `ghp_`, `github_pat_`, `AKIA`, `xoxb-`, `glpat-`, a PEM header, or a connection string with an embedded password. Do not report a literal that is plainly not a credential — an environment name, a port, a path, a host, a URL carrying no credential. Where the value is a literal you cannot classify confidently, let the key name decide the direction — that is what it is for. Under a secret-shaped key, report it: a literal under `PASSWORD`, `API_KEY` or `TOKEN` is a credential unless it is obviously a placeholder such as `changeme` or `<your-key-here>`, so a short low-entropy value like `hunter2` is still a finding. Under any other key, describe what you see rather than raising an ERROR on a guess. The asymmetry is deliberate: the substitution exclusion above is absolute and is applied first, so resolving the remaining ambiguity toward reporting cannot resurrect the false positive it exists to prevent. `containerEnv` is worse than `remoteEnv` for a literal, because it becomes a Dockerfile `ENV` and is baked into a layer. Apply the same value test — never a key-name test — to `build.args`, which are visible in image history.
- **Fix:** Declare the name under the top-level `secrets` property so the config documents what is needed — that property is declarative only, it does not inject anything — and pass the value at run time with `--secrets-file <json>` on `up` or `run-user-commands`. The CLI changelog records "Secret support for up and run-user-commands" and "Mask user secrets in logs". If a value must stay in `remoteEnv`, indirect it through `${localEnv:NAME}` so the literal is not committed, and remember the label still records the reference. **Keep the secrets file out of the repository.** A path inside the workspace is one `git add .` away from committing the secret this rule exists to protect — put it under the user's home directory, or if it must live in the tree, add it to `.gitignore` in the same change and verify with `git check-ignore`. **Ask before running: this creates a container.**
  ```bash
  if command -v devcontainer >/dev/null 2>&1; then
    devcontainer up --workspace-folder . --secrets-file ~/.devcontainer-secrets/<project>.json
  else
    echo "devcontainer CLI not installed - move the value out of remoteEnv by editing the config"
  fi
  ```

### DC-LIFE-002 · `postAttachCommand` is not a legal `waitFor` value; the enum is exactly the five creation-through-start hooks, defaulting to `updateContentCommand`.
- **Severity:** ERROR
- **Tier:** SPEC
- **Source:** https://github.com/devcontainers/spec/blob/main/schemas/devContainer.base.schema.json
- **Quote:** ""enum": [ "initializeCommand", "onCreateCommand", "updateContentCommand", "postCreateCommand", "postStartCommand" ] … "The user command to wait for before continuing execution in the background while the UI is starting up. The default is \"updateContentCommand\".""
- **Verified:** 2026-09-01
- **Inputs:** `waitFor`; the image metadata label when `waitFor` is absent from the file.
- **Detect:** Read `waitFor`. Anything outside those five strings is invalid — `postAttachCommand` is the one people reach for, because it is a real lifecycle hook and the only one missing from the enum. Nothing in a normal workflow catches this: the reference CLI parses and merges the config but does not validate it against the JSON Schema, so an invalid `waitFor` reaches the tool unchallenged, and schema registration only gives editor-time squiggles. (That last mechanism is stated by no document; it is checkable — the CLI's `package.json` carries a JSONC parser and no JSON-schema validator. Treat it as verified-by-inspection, not as cited.)
- **Fix:** Choose from the five. If the intent was "block until my setup finishes", the value is `postCreateCommand`, not `postAttachCommand`. If the intent was the default, delete the property. Note the consequence of the default: `postCreateCommand` runs in the background after the tool reports success, so a slow `postCreateCommand` is not a hang.

### DC-FEAT-001 · `overrideFeatureInstallOrder` cannot reorder a `dependsOn` edge — it only assigns `roundPriority` inside a round-based sort and can never violate the dependency graph.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://containers.dev/implementors/features/
- **Quote:** "This property must not influence the dependency relationship as defined by the dependency graph … and shall only be evaulated at the round-based sorting step … this property cannot "pull forward" a Feature until all of its dependencies (both soft and hard) have been installed."
- **Verified:** 2026-09-01
- **Inputs:** `overrideFeatureInstallOrder` and `features`; each referenced Feature's `devcontainer-feature.json`, for its dependsOn and installsAfter edges; the resolved install order, from the devcontainer CLI when it is available.
- **Detect:** Read `overrideFeatureInstallOrder` against the `dependsOn` and `installsAfter` edges of the Features listed in `features`. Flag an entry that tries to place a Feature before something it depends on: the order will silently not happen. The mechanism, from the same page: the property assigns a `roundPriority` "to all nodes that match the Feature identifier (version omitted) present in the property". Priority only reorders *within* a round; it never moves a node into an earlier round. Also flag an ID listed there that is not among the Features being installed — the same page says the tool "may fail the dependency resolution step" for that.
- **Fix:** If the ordering is a real requirement, it belongs in the Feature's own `dependsOn` (hard, recursive, can carry options and a pinned version) or `installsAfter` (soft, non-recursive, dropped if the named Feature is not otherwise installed), not in `overrideFeatureInstallOrder`. Use `overrideFeatureInstallOrder` only to break ties the graph leaves open.
  ```bash
  if command -v devcontainer >/dev/null 2>&1; then
    devcontainer features resolve-dependencies --workspace-folder .
  else
    echo "devcontainer CLI not installed - read each Feature's devcontainer-feature.json for dependsOn/installsAfter"
  fi
  ```

### DC-FEAT-002 · Feature dependency resolution happens only at initial creation from devcontainer.json, and two Features with different options are different Features that both install — so Features must be idempotent.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://github.com/devcontainers/spec/blob/main/docs/specs/feature-dependencies.md
- **Quote:** "For subsequent creations from an image (or resumes of a dev container), the dependency tree is **not** re-calculated. … Since two Features with different options are considered different, a single Feature may be installed more than once.  Features should be idempotent."
- **Verified:** 2026-09-01
- **Inputs:** `image` — or the base named by `build.dockerfile` — and `features` with each entry's options; each referenced Feature's `devcontainer-feature.json`, for a dependsOn edge that pulls the same Feature in a second time; the authored Feature's `install.sh`, for the idempotency check.
- **Detect:** Two symptoms. (1) A config that starts `FROM` a previously built dev container image and expects a Feature version bump or a changed `dependsOn` to take effect: it will not, because the resolved Feature set — the *outcome* of dependency resolution, not the `features` property itself, which is never stored on the label — is frozen onto the `devcontainer.metadata` label at first creation. (2) The same Feature referenced twice with different options — directly in `features`, or once directly and once pulled in by another Feature's `dependsOn` — which installs it twice. If you author Features, read `install.sh` for non-idempotent steps: appending to `PATH`, `~/.bashrc` or `/etc/profile.d` without a guard, `useradd` without checking, unconditional `git clone`.
- **Fix:** To pick up changed dependencies, recreate from `devcontainer.json` rather than rebuilding from the image — the source states the user must delete the image or dev container and recreate it. In an authored Feature, make every step re-runnable: guard appends with a marker grep, use `install -D`, prefer `useradd ... || true` style checks over bare creation, and make downloads overwrite rather than append.

### DC-FEAT-003 · A Feature's `install.sh` runs as root at image-build time; `_REMOTE_USER`, `_CONTAINER_USER`, `_REMOTE_USER_HOME` and `_CONTAINER_USER_HOME` are the sanctioned way to learn the eventual user, and ignoring them is a common cause of root-owned files.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://containers.dev/implementors/features/
- **Quote:** "The `install.sh` script for each Feature should be executed as `root` during a container image build. … `_REMOTE_USER` and `_CONTAINER_USER` environment variables are passed to the Features scripts with `_CONTAINER_USER` being the container's user"
- **Verified:** 2026-09-01
- **Inputs:** the authored Feature's `install.sh`: its hardcoded usernames, and its writes into a home directory.
- **Detect:** In an authored Feature's `install.sh`, flag a hardcoded `vscode`, `node`, `codespace` or `root` username, and flag any write into a home directory computed as `/home/$USER` or `~`. The home directories have their own variables — from the same page: "Additionally, the home folders of the two users are passed to the Feature scripts as `_REMOTE_USER_HOME` and `_CONTAINER_USER_HOME` environment variables." When consuming Features, the visible symptom is files under the workspace or home directory owned by `root` that the `remoteUser` cannot write.
- **Fix:** Read the user from `_REMOTE_USER` (falling back to `_CONTAINER_USER`, which the spec says it equals when no `remoteUser` is configured) and the home directory from `_REMOTE_USER_HOME`. Drop privileges for user-scoped work with `su "$_REMOTE_USER" -c '...'`, or `chown -R "$_REMOTE_USER" "$_REMOTE_USER_HOME/<path>"` after writing as root. Never assume `sudo` exists in the base image.

### DC-PERF-001 · A named volume used to dodge the macOS/Windows bind-mount penalty comes up root-owned and needs an explicit `chown` in `postCreateCommand`.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://code.visualstudio.com/remote/advancedcontainers/improve-performance
- **Quote:** "add a `postCreateCommand` to update the owner of the folder you mount since it may have been mounted as root"
- **Verified:** 2026-09-01
- **Inputs:** `mounts` and `workspaceMount`, for a volume-typed entry; `remoteUser` and `containerUser`; `postCreateCommand`; the image metadata label when `mounts`, `remoteUser`, `containerUser` or `postCreateCommand` is absent from the file.
- **Detect:** Look for a `mounts` entry with `type=volume` — typically `source=${localWorkspaceFolderBasename}-node_modules,target=${containerWorkspaceFolder}/node_modules,type=volume` — or a `workspaceMount` with `type=volume`, in a config that also sets a non-root `remoteUser` or `containerUser`. Flag it when no `postCreateCommand` chowns that target. The failure is a permission error on first write into the mounted directory, not a build failure, so it surfaces late. The same page notes the step "is not required if you will be running in the container as `root`" — a root container is not a finding here.
- **Fix:** Add the ownership fix to `postCreateCommand`, naming the same user as `remoteUser`, for example `"postCreateCommand": "sudo chown node node_modules"`. If the whole tree is on a volume, `workspaceMount` and `workspaceFolder` must both be set — the containers.dev reference says of each that it "Requires `workspaceFolder` be set as well" and "Requires `workspaceMount` be set". Note that a `mounts`-based optimisation is local-only: Codespaces ignores bind mounts except the Docker socket, so verify the config still works there. (That Codespaces limitation is stated by no document cited here; treat it as checkable background, not as cited.)

### DC-USER-001 · `updateRemoteUserUID` defaults to true on Linux whenever `containerUser` or `remoteUser` is set, and the reference CLI then builds a second, derived `…-uid` image.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://containers.dev/implementors/json_reference/
- **Quote:** "On Linux, if `containerUser` or `remoteUser` is specified, the user's UID/GID will be updated to match the local user's UID/GID to avoid permission problems with bind mounts. Defaults to `true`."
- **Verified:** 2026-09-01
- **Inputs:** `updateRemoteUserUID`, `remoteUser` and `containerUser`; CI workflow evidence of a pinned image — an invocation passing `--image-name`, or a `devcontainers/ci` step setting imageName or push; any ownership-correcting step in the repository's lifecycle commands or scripts; the image metadata label when `updateRemoteUserUID`, `remoteUser` or `containerUser` is absent from the file.
- **Detect:** **An absent `updateRemoteUserUID` is not a defect and must not be reported as one.** It defaults to true, and on a Linux workstation that default is exactly what keeps bind-mounted files writable — the behaviour the `Fix` below tells you to keep. A config that sets `remoteUser` or `containerUser` and leaves `updateRemoteUserUID` unset is the ordinary, correct case: emit nothing for it. The default costs something in only two situations, and one of them must be visible in the repository before this rule has anything to report. (1) **The pipeline names an image the build does not produce.** With the default in effect on Linux the reference CLI derives a second image, in `src/spec-node/containerFeatures.ts`, as ``const fixedImageName = `${imageName.startsWith(folderImageName) ? imageName : folderImageName}-uid`;`` — so a workflow that pins, tags, publishes or scans a specific `--image-name` is not operating on the image that actually runs. Report only on evidence of such a workflow: a CI invocation passing `--image-name`, a `devcontainers/ci` step setting `imageName` or `push`, or a documented prebuilt image tag. (2) **A Linux-only ownership problem is being masked.** The step does not apply on macOS or Windows hosts, so an ownership workaround that makes permissions look right on a Mac may be hiding behaviour that differs on Linux. Report only when such a workaround is actually present. The forms below are examples, not an exhaustive list — read for the intent, which is a step that exists to correct file ownership or permissions: a `chown` or `chmod`, a `sudo` ownership step, an `install -o`, a `setfacl`, or a script whose name says as much. Steps that merely work *around* an ownership mismatch without changing ownership — `git config --global --add safe.directory`, for instance — are not this symptom and are not a finding. If neither symptom is present this rule is informational: it explains a default, and a default being in effect is not a finding.
- **Fix:** In CI, where the host UID is irrelevant and the extra build is pure cost, turn it off: the `devcontainers/ci` action exposes `skipContainerUserIdUpdate`, documented as "For non-root Dev Containers (i.e. where `remoteUser` is specified), the action attempts to make the container user UID and GID match those of the host user. Set this to true to skip this step". The CLI equivalent is `--update-remote-user-uid-default never`. Locally on Linux, leave it on — it is what keeps bind-mounted files writable. Set `"updateRemoteUserUID": false` in the config only when you intend the container UID to stay fixed everywhere.

### DC-ENV-001 · `userEnvProbe` decides which shell startup files contribute to the lifecycle environment, which is why a command that works in the container terminal can fail in `postCreateCommand`.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://containers.dev/implementors/json_reference/
- **Quote:** "Indicates the type of shell to use to "probe" for user environment variables to include in `devcontainer.json` supporting services' / tools' processes: `none`, `interactiveShell`, `loginShell`, or `loginInteractiveShell` (default)."
- **Verified:** 2026-09-01
- **Inputs:** `userEnvProbe`; the image metadata label when `userEnvProbe` is absent from the file.
- **Detect:** Read `userEnvProbe`. `"none"` is the high-signal value: it means no startup file is read at all, so anything a Feature or Dockerfile put on `PATH` via `~/.bashrc` or `/etc/profile.d` is invisible to lifecycle commands even though an interactive terminal in the same container finds it. `"loginShell"` and `"interactiveShell"` each read only half the files. From the same page: "bash interactive shells will typically include variables set in `/etc/bash.bashrc` and `~/.bashrc` while login shells usually include variables from `/etc/profile` and `~/.profile`. Setting this property to `loginInteractiveShell` will get variables from all four files." Suspect this rule whenever a lifecycle command fails with "command not found" for a tool that is demonstrably installed.
- **Fix:** Prefer the default `loginInteractiveShell` — delete an explicit `userEnvProbe` unless something depends on narrowing it. Where the environment must not depend on shell startup files at all, set the variables in `containerEnv` (visible to every process in the container) or `remoteEnv` (tool processes only, and see `DC-SEC-001` before putting anything sensitive there), or invoke the tool by absolute path in the lifecycle command.

### DC-LIFE-003 · Lifecycle commands accept an object form whose entries run in parallel, so `postCreateCommand` is `string | array | object` and single-string analysis misses cases.
- **Severity:** INFO
- **Tier:** SPEC
- **Source:** https://github.com/devcontainers/spec/blob/main/docs/specs/parallel-lifecycle-script-execution.md
- **Quote:** "All lifecycle scripts will be extended to support `object` types. The key of the `object` will be a unique name for the command and the value will be the `string` or `array` command. … Each entry in the `object` will be run in parallel during that lifecycle step."
- **Verified:** 2026-09-01
- **Inputs:** every lifecycle hook — `initializeCommand`, `onCreateCommand`, `updateContentCommand`, `postCreateCommand`, `postStartCommand` and `postAttachCommand` — and which of the three forms each one uses; the image metadata label when any of those hooks other than `initializeCommand` is absent from the file.
- **Detect:** Before applying any other lifecycle rule, determine which of the three forms each hook uses. A string runs through `/bin/sh`, so `&&` chains. An array is exec'd directly with no shell, so `["npm start && npm test"]` is one argv, not two commands, and `&&` is a literal argument. An object runs every entry concurrently — flag object entries that assume ordering between each other, such as one entry creating a directory or a database another entry writes to. The source adds that "Each command must exit successfully for the stage to be considered successful", so a parallel entry failing fails the whole stage.
- **Fix:** Use the object form only for genuinely independent work. Where entries must be sequenced, put them in one string joined with `&&`, or in one script invoked from the hook. Where an argument must survive verbatim without shell parsing, use the array form deliberately rather than by accident.

### DC-DEP-001 · Top-level `extensions`, `settings` and `devPort` are deprecated in favour of `customizations.vscode.*` — which now also carries `mcp` — and `appPort` is superseded by `forwardPorts`.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://github.com/microsoft/vscode/blob/main/extensions/configuration-editing/schemas/devContainer.vscode.schema.json
- **Quote:** ""deprecated": true, "deprecationMessage": "Use 'customizations/vscode/extensions' instead""
- **Verified:** 2026-09-01
- **Inputs:** the top-level `extensions`, `settings`, `devPort` and `appPort` properties; the image metadata label when `extensions`, `settings` or `devPort` is absent from the file.
- **Detect:** That pair sits on the **top-level** `extensions` property. The schema also defines `customizations.vscode.extensions`, which opens identically but carries no deprecation — searching the schema for `"extensions"` finds the wrong one first, so match on the `deprecated` pair, not on the property name. Flag `extensions`, `settings` or `devPort` at the top level of devcontainer.json. The schema carries the identical shape for all three — `"Use 'customizations/vscode/settings' instead"` and `"Use 'customizations/vscode/devPort' instead"`. Separately, flag `appPort`; the containers.dev reference says of it: "In most cases, we recommend using the new [forwardPorts property](#general-devcontainerjson-properties). This property accepts a port or array of ports that should be published locally when the container is running." These are deprecations, not errors — the old keys still work — so report them as modernisation, not breakage.
- **Fix:** Move `extensions` and `settings` under `customizations.vscode` verbatim; move `devPort` to `customizations.vscode.devPort`. The same namespace now also holds `mcp`, described in that schema as "Model Context Protocol server configurations" — put Model Context Protocol server configuration there rather than inventing a top-level key. Replace `appPort` with `forwardPorts` unless you specifically need the port *published* on all interfaces rather than forwarded, in which case keep `appPort` and say why. Remember `customizations` is an open namespace: the schema only says each tool "should use a JSON object subproperty with a unique name", so an unknown key under it is not necessarily wrong.

### DC-CLAUDE-001 · Claude Code in a dev container needs a non-root `remoteUser`, and persistent auth needs both a volume at `~/.claude` and `CLAUDE_CONFIG_DIR` pointed at it, because the account file lives outside that directory.
- **Severity:** WARN
- **Tier:** OPINION
- **Source:** https://code.claude.com/docs/en/devcontainer
- **Quote:** "Because the container runs Claude Code as a non-root user and confines command execution to the container, you can pass `--dangerously-skip-permissions` for unattended operation. The CLI rejects this flag when launched as root, so confirm `remoteUser` is set to a non-root account."
- **Verified:** 2026-09-01
- **Inputs:** evidence that the config installs or runs Claude Code — a Feature, a Dockerfile step or a lifecycle command that does; `remoteUser`; `mounts`; `containerEnv`; `runArgs`, when a reference egress firewall script is present; the image metadata label when `remoteUser`, `mounts` or `containerEnv` is absent from the file.
- **Detect:** Tier is OPINION deliberately: the mechanism below is documented by the vendor, but nothing in the Dev Container specification requires any of it, and a dev container that never runs Claude Code is not defective for lacking it. Apply this rule only to a config that installs or runs Claude Code. Then check three things. (1) `remoteUser` is set and is not `root` — otherwise `--dangerously-skip-permissions` is refused. (2) There is a `mounts` entry for `~/.claude` **and** a `containerEnv` entry for `CLAUDE_CONFIG_DIR` pointing at the same path; the vendor page states that "mounting a volume at `~/.claude` alone doesn't keep you signed in", because the OAuth account file sits outside that directory. A volume with no matching environment variable is the common half-configuration. (3) If the config runs the reference egress firewall, the same page states it "adds the `NET_ADMIN` and `NET_RAW` capabilities through `runArgs`" — a firewall script without those capabilities fails at start.
- **Fix:** Set a non-root `remoteUser`. Add both halves of the auth mount, substituting the real home directory of that user:
  ```json
  {
    "remoteUser": "node",
    "mounts": ["source=claude-code-config-${devcontainerId},target=/home/node/.claude,type=volume"],
    "containerEnv": { "CLAUDE_CONFIG_DIR": "/home/node/.claude" }
  }
  ```
  The `${devcontainerId}` in the volume name isolates state per project; drop it to share one login across repositories. If `containerEnv` already exists, add the key to it rather than adding a second object. For the firewall, add `"runArgs": ["--cap-add=NET_ADMIN", "--cap-add=NET_RAW"]`. Treat the `anthropics/claude-code` reference configuration as a worked example rather than a maintained base image, and do not mount host secrets such as `~/.ssh` into the container.
