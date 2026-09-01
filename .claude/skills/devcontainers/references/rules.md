# Dev container rules

Twelve rules for auditing a `devcontainer.json`. This file is loaded on demand; read it when
you are reviewing, writing, or debugging a dev container configuration and you need the
specific, citable claim rather than general knowledge.

Every rule carries a source. `SPEC` means the behaviour is stated in the Dev Container
specification, the reference CLI, or official vendor documentation. `OPINION` means this
package recommends it; the spec does not require it. Never present an OPINION rule as spec.

IDs are a published interface. They are never reused. A retired rule keeps its ID and gains
`superseded_by`. A rule a project does not want is suppressed with `prompt_include: false`,
never deleted — a deleted ID would silently un-suppress if the ID were ever re-issued, which
is exactly why IDs are never re-issued.

Format:

```
  ### DC-XXX-NNN · <one-sentence assertion>
  - **Severity:** ERROR | WARN | INFO
  - **Tier:** SPEC | OPINION
  - **Source:** <url>
  - **Quote:** "<verbatim, under 300 characters>"
  - **Verified:** YYYY-MM-DD
  - **Detect:** <what to look for when reading devcontainer.json>
  - **Fix:** <the concrete change>
```

## Quoting conventions

- Every quote was opened at its `Source` URL and confirmed verbatim on 2026-09-01. Backticks
  inside a quote are the source's own inline-code markup; they render as `<code>` on the
  published page.
- A ` … ` inside a quote marks an elision between two passages **on the same source page** —
  usually a hyperlink target or an intervening clause. Each fragment either side of it is
  itself verbatim.
- Quotes taken from a JSON schema are whitespace-normalised (the source is tab-indented and
  line-broken); every token, including the escaped inner quotes, is otherwise unchanged.

## Severities are provisional

Gate D — the adjudicated false-positive measurement that was to confirm these severities —
has been **deferred**; it now runs only if Gate E shows lift. The severities of
`DC-LIFE-001`, `DC-SEC-001` and `DC-PERF-001` are therefore **unconfirmed**. No
false-positive rate has been measured for any rule; do not quote one.

`DC-LIFE-001` is the known candidate for demotion to `INFO`: it fires on configurations that
are correct precisely because those projects never use prebuilds. Its `Detect` section states
that scope explicitly. Treat its ERROR severity as a hypothesis, not a finding.

## A note on shelling out

None of `devcontainer`, `hadolint`, `trivy`, `dockle` or `docker scout` can be assumed
present. Every shell snippet below probes with `command -v` first and degrades to a message.
All twelve rules are detectable by reading `devcontainer.json`; the commands only corroborate.

---

### DC-LIFE-001 · Expensive work in `postCreateCommand` is never baked into a Codespaces prebuild — `onCreateCommand` and `updateContentCommand` are, and the reference CLI's `--prebuild` stops after `updateContentCommand` and re-runs it.
- **Severity:** ERROR
- **Tier:** SPEC
- **Source:** https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds
- **Quote:** "performing setup operations up to and including any `onCreateCommand` and `updateContentCommand` commands in the `devcontainer.json` file. No `postCreateCommand` commands are run during the creation of a prebuild."
- **Verified:** 2026-09-01
- **Detect:** Read `postCreateCommand`. Flag it when it carries cacheable, expensive setup — `npm ci`, `npm install`, `yarn install`, `pnpm install`, `pip install`, `poetry install`, `bundle install`, `go mod download`, `cargo fetch`, `apt-get install`, `make`, `gradle`, `mvn` — while `onCreateCommand` and `updateContentCommand` are absent or trivial. Check the object form entry by entry, not just the string form (see `DC-LIFE-003`). Corroborating, from the reference CLI's own flag definition in `src/spec-node/devContainersSpecCLI.ts`: "Stop after onCreateCommand and updateContentCommand, rerunning updateContentCommand if it has run before." — under `--prebuild`, `postCreateCommand` never fires at all. **Scope:** this only bites a project that actually uses prebuilds (Codespaces prebuild configurations, or a CI job invoking `--prebuild`). A project that never prebuilds is not wrong to put installs in `postCreateCommand`; say so rather than reporting a defect.
- **Fix:** Move the cacheable half into `onCreateCommand` — which the containers.dev reference describes as usable by "Cloud services … when caching or prebuilding a container. This means that it will not typically have access to user-scoped assets or secrets." — or into `updateContentCommand`, which the same reference says "cloud services will also periodically execute … to refresh cached or prebuilt containers". Leave in `postCreateCommand` only work that needs the assigned user's own credentials or permissions. To confirm what a prebuild would bake:
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
- **Source:** https://github.com/devcontainers/cli/blob/main/CHANGELOG.md
- **Quote:** "Add `--omit-config-remote-env-from-metadata` to omit remoteEnv from devcontainer config on container metadata label."
- **Verified:** 2026-09-01
- **Detect:** The existence of an opt-*out* flag is what establishes the default: without `--omit-config-remote-env-from-metadata`, `remoteEnv` is written to the image label, so anyone who can pull the image can read it. Flag any `remoteEnv` or `containerEnv` entry whose key matches `TOKEN`, `SECRET`, `KEY`, `PASSWORD`, `PASSWD`, `CREDENTIAL`, `_PAT`, or whose value is a literal rather than a `${localEnv:NAME}` reference. `containerEnv` is worse still — it becomes a Dockerfile `ENV` and is baked into a layer. Apply the same test to `build.args`, which are visible in image history.
- **Fix:** Declare the name under the top-level `secrets` property so the config documents what is needed — that property is declarative only, it does not inject anything — and pass the value at run time with `--secrets-file <json>` on `up` or `run-user-commands`. The same changelog records "Secret support for up and run-user-commands" and "Mask user secrets in logs". If a value must stay in `remoteEnv`, indirect it through `${localEnv:NAME}` so the literal is not committed, and remember the label still records the reference.
  ```bash
  if command -v devcontainer >/dev/null 2>&1; then
    devcontainer up --workspace-folder . --secrets-file ./.devcontainer/secrets.json
  else
    echo "devcontainer CLI not installed - move the value out of remoteEnv by editing the config"
  fi
  ```

### DC-LIFE-002 · `postAttachCommand` is not a legal `waitFor` value; the enum is exactly the five creation-through-start hooks, defaulting to `updateContentCommand`.
- **Severity:** ERROR
- **Tier:** SPEC
- **Source:** https://github.com/devcontainers/spec/blob/main/schemas/devContainer.base.schema.json
- **Quote:** "enum": [ "initializeCommand", "onCreateCommand", "updateContentCommand", "postCreateCommand", "postStartCommand" ] … "The user command to wait for before continuing execution in the background while the UI is starting up. The default is \"updateContentCommand\"."
- **Verified:** 2026-09-01
- **Detect:** Read `waitFor`. Anything outside those five strings is invalid — `postAttachCommand` is the one people reach for, because it is a real lifecycle hook and the only one missing from the enum. Nothing in a normal workflow catches this: the reference CLI parses and merges the config but does not validate it against the JSON Schema, so an invalid `waitFor` reaches the tool unchallenged, and schema registration only gives editor-time squiggles.
- **Fix:** Choose from the five. If the intent was "block until my setup finishes", the value is `postCreateCommand`, not `postAttachCommand`. If the intent was the default, delete the property. Note the consequence of the default: `postCreateCommand` runs in the background after the tool reports success, so a slow `postCreateCommand` is not a hang.

### DC-FEAT-001 · `overrideFeatureInstallOrder` cannot reorder a `dependsOn` edge — it only assigns `roundPriority` inside a round-based sort and can never violate the dependency graph.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://containers.dev/implementors/features/
- **Quote:** "This property must not influence the dependency relationship as defined by the dependency graph … and shall only be evaulated at the round-based sorting step … this property cannot "pull forward" a Feature until all of its dependencies (both soft and hard) have been installed."
- **Verified:** 2026-09-01
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
- **Source:** https://github.com/devcontainers/spec/blob/main/proposals/feature-dependencies.md
- **Quote:** "For subsequent creations from an image (or resumes of a dev container), the dependency tree is **not** re-calculated. … Since two Features with different options are considered different, a single Feature may be installed more than once.  Features should be idempotent."
- **Verified:** 2026-09-01
- **Detect:** Two symptoms. (1) A config that starts `FROM` a previously built dev container image and expects a Feature version bump or a changed `dependsOn` to take effect: it will not, because the resolved set is frozen into the `devcontainer.metadata` label at first creation. (2) The same Feature referenced twice with different options — directly in `features`, or once directly and once pulled in by another Feature's `dependsOn` — which installs it twice. If you author Features, read `install.sh` for non-idempotent steps: appending to `PATH`, `~/.bashrc` or `/etc/profile.d` without a guard, `useradd` without checking, unconditional `git clone`.
- **Fix:** To pick up changed dependencies, recreate from `devcontainer.json` rather than rebuilding from the image — the source states the user must delete the image or dev container and recreate it. In an authored Feature, make every step re-runnable: guard appends with a marker grep, use `install -D`, prefer `useradd ... || true` style checks over bare creation, and make downloads overwrite rather than append.

### DC-FEAT-003 · A Feature's `install.sh` runs as root at image-build time; `_REMOTE_USER`, `_CONTAINER_USER`, `_REMOTE_USER_HOME` and `_CONTAINER_USER_HOME` are the sanctioned way to learn the eventual user, and ignoring them is a common cause of root-owned files.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://containers.dev/implementors/features/
- **Quote:** "The `install.sh` script for each Feature should be executed as `root` during a container image build. … `_REMOTE_USER` and `_CONTAINER_USER` environment variables are passed to the Features scripts with `_CONTAINER_USER` being the container's user"
- **Verified:** 2026-09-01
- **Detect:** In an authored Feature's `install.sh`, flag a hardcoded `vscode`, `node`, `codespace` or `root` username, and flag any write into a home directory computed as `/home/$USER` or `~`. The home directories have their own variables — from the same page: "Additionally, the home folders of the two users are passed to the Feature scripts as `_REMOTE_USER_HOME` and `_CONTAINER_USER_HOME` environment variables." When consuming Features, the visible symptom is files under the workspace or home directory owned by `root` that the `remoteUser` cannot write.
- **Fix:** Read the user from `_REMOTE_USER` (falling back to `_CONTAINER_USER`, which the spec says it equals when no `remoteUser` is configured) and the home directory from `_REMOTE_USER_HOME`. Drop privileges for user-scoped work with `su "$_REMOTE_USER" -c '...'`, or `chown -R "$_REMOTE_USER" "$_REMOTE_USER_HOME/<path>"` after writing as root. Never assume `sudo` exists in the base image.

### DC-PERF-001 · A named volume used to dodge the macOS/Windows bind-mount penalty comes up root-owned and needs an explicit `chown` in `postCreateCommand`.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://code.visualstudio.com/remote/advancedcontainers/improve-performance
- **Quote:** "add a `postCreateCommand` to update the owner of the folder you mount since it may have been mounted as root"
- **Verified:** 2026-09-01
- **Detect:** Look for a `mounts` entry with `type=volume` — typically `source=${localWorkspaceFolderBasename}-node_modules,target=${containerWorkspaceFolder}/node_modules,type=volume` — or a `workspaceMount` with `type=volume`, in a config that also sets a non-root `remoteUser` or `containerUser`. Flag it when no `postCreateCommand` chowns that target. The failure is a permission error on first write into the mounted directory, not a build failure, so it surfaces late. The same page notes the step "is not required if you will be running in the container as `root`" — a root container is not a finding here.
- **Fix:** Add the ownership fix to `postCreateCommand`, naming the same user as `remoteUser`, for example `"postCreateCommand": "sudo chown node node_modules"`. If the whole tree is on a volume, `workspaceMount` and `workspaceFolder` must both be set — each requires the other. Note that a `mounts`-based optimisation is local-only: Codespaces ignores bind mounts except the Docker socket, so verify the config still works there.

### DC-USER-001 · `updateRemoteUserUID` defaults to true on Linux whenever `containerUser` or `remoteUser` is set, and the reference CLI then builds a second, derived `…-uid` image.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://containers.dev/implementors/json_reference/
- **Quote:** "On Linux, if `containerUser` or `remoteUser` is specified, the user's UID/GID will be updated to match the local user's UID/GID to avoid permission problems with bind mounts. Defaults to `true`."
- **Verified:** 2026-09-01
- **Detect:** Any config that sets `remoteUser` or `containerUser` and does not set `updateRemoteUserUID` is opted in on Linux. Two consequences to look for. (1) An extra image build appears in the output that the config never asked for: the reference CLI derives it in `src/spec-node/containerFeatures.ts` as ``const fixedImageName = `${imageName.startsWith(folderImageName) ? imageName : folderImageName}-uid`;`` — so a pipeline that pins or publishes `--image-name` is not running the image it thinks it is. (2) On macOS and Windows hosts the step does not apply, so a "works on my machine" ownership fix may be masking a Linux-only problem rather than solving it.
- **Fix:** In CI, where the host UID is irrelevant and the extra build is pure cost, turn it off: the `devcontainers/ci` action exposes `skipContainerUserIdUpdate`, documented as "For non-root Dev Containers (i.e. where `remoteUser` is specified), the action attempts to make the container user UID and GID match those of the host user. Set this to true to skip this step". The CLI equivalent is `--update-remote-user-uid-default never`. Locally on Linux, leave it on — it is what keeps bind-mounted files writable. Set `"updateRemoteUserUID": false` in the config only when you intend the container UID to stay fixed everywhere.

### DC-ENV-001 · `userEnvProbe` decides which shell startup files contribute to the lifecycle environment, which is why a command that works in the container terminal can fail in `postCreateCommand`.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://containers.dev/implementors/json_reference/
- **Quote:** "Indicates the type of shell to use to "probe" for user environment variables to include in `devcontainer.json` supporting services' / tools' processes: `none`, `interactiveShell`, `loginShell`, or `loginInteractiveShell` (default)."
- **Verified:** 2026-09-01
- **Detect:** Read `userEnvProbe`. `"none"` is the high-signal value: it means no startup file is read at all, so anything a Feature or Dockerfile put on `PATH` via `~/.bashrc` or `/etc/profile.d` is invisible to lifecycle commands even though an interactive terminal in the same container finds it. `"loginShell"` and `"interactiveShell"` each read only half the files. From the same page: "bash interactive shells will typically include variables set in `/etc/bash.bashrc` and `~/.bashrc` while login shells usually include variables from `/etc/profile` and `~/.profile`. Setting this property to `loginInteractiveShell` will get variables from all four files." Suspect this rule whenever a lifecycle command fails with "command not found" for a tool that is demonstrably installed.
- **Fix:** Prefer the default `loginInteractiveShell` — delete an explicit `userEnvProbe` unless something depends on narrowing it. Where the environment must not depend on shell startup files at all, set the variables in `containerEnv` (visible to every process in the container) or `remoteEnv` (tool processes only, and see `DC-SEC-001` before putting anything sensitive there), or invoke the tool by absolute path in the lifecycle command.

### DC-LIFE-003 · Lifecycle commands accept an object form whose entries run in parallel, so `postCreateCommand` is `string | array | object` and single-string analysis misses cases.
- **Severity:** INFO
- **Tier:** SPEC
- **Source:** https://github.com/devcontainers/spec/blob/main/proposals/parallel-lifecycle-script-execution.md
- **Quote:** "All lifecycle scripts will be extended to support `object` types. The key of the `object` will be a unique name for the command and the value will be the `string` or `array` command. … Each entry in the `object` will be run in parallel during that lifecycle step."
- **Verified:** 2026-09-01
- **Detect:** Before applying any other lifecycle rule, determine which of the three forms each hook uses. A string runs through `/bin/sh`, so `&&` chains. An array is exec'd directly with no shell, so `["npm start && npm test"]` is one argv, not two commands, and `&&` is a literal argument. An object runs every entry concurrently — flag object entries that assume ordering between each other, such as one entry creating a directory or a database another entry writes to. The source adds that "Each command must exit successfully for the stage to be considered successful", so a parallel entry failing fails the whole stage.
- **Fix:** Use the object form only for genuinely independent work. Where entries must be sequenced, put them in one string joined with `&&`, or in one script invoked from the hook. Where an argument must survive verbatim without shell parsing, use the array form deliberately rather than by accident.

### DC-DEP-001 · Top-level `extensions`, `settings` and `devPort` are deprecated in favour of `customizations.vscode.*` — which now also carries `mcp` — and `appPort` is superseded by `forwardPorts`.
- **Severity:** WARN
- **Tier:** SPEC
- **Source:** https://github.com/microsoft/vscode/blob/main/extensions/configuration-editing/schemas/devContainer.vscode.schema.json
- **Quote:** "extensions": { … "deprecated": true, "deprecationMessage": "Use 'customizations/vscode/extensions' instead" }
- **Verified:** 2026-09-01
- **Detect:** Flag `extensions`, `settings` or `devPort` at the top level of devcontainer.json. The schema carries the identical shape for all three — `"Use 'customizations/vscode/settings' instead"` and `"Use 'customizations/vscode/devPort' instead"`. Separately, flag `appPort`; the containers.dev reference says of it: "In most cases, we recommend using the new [forwardPorts property](#general-devcontainerjson-properties). This property accepts a port or array of ports that should be published locally when the container is running." These are deprecations, not errors — the old keys still work — so report them as modernisation, not breakage.
- **Fix:** Move `extensions` and `settings` under `customizations.vscode` verbatim; move `devPort` to `customizations.vscode.devPort`. The same namespace now also holds `mcp`, described in that schema as "Model Context Protocol server configurations" — put Model Context Protocol server configuration there rather than inventing a top-level key. Replace `appPort` with `forwardPorts` unless you specifically need the port *published* on all interfaces rather than forwarded, in which case keep `appPort` and say why. Remember `customizations` is an open namespace: the schema only says each tool "should use a JSON object subproperty with a unique name", so an unknown key under it is not necessarily wrong.

### DC-CLAUDE-001 · Claude Code in a dev container needs a non-root `remoteUser`, and persistent auth needs both a volume at `~/.claude` and `CLAUDE_CONFIG_DIR` pointed at it, because the account file lives outside that directory.
- **Severity:** WARN
- **Tier:** OPINION
- **Source:** https://code.claude.com/docs/en/devcontainer
- **Quote:** "Because the container runs Claude Code as a non-root user and confines command execution to the container, you can pass `--dangerously-skip-permissions` for unattended operation. The CLI rejects this flag when launched as root, so confirm `remoteUser` is set to a non-root account."
- **Verified:** 2026-09-01
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
