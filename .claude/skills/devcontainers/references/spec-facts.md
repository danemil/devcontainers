# Dev container spec facts

Mechanics, not rules. `references/rules.md` says what is **wrong** and what to **change**;
this file says how the machinery **works** — the orderings, the merge table, the resolution
algorithm, the substitution lists, the CLI surface. When a mechanic here has a normative
consequence, the rule ID is named and the claim is left there rather than repeated. Open the
rule before asserting anything about severity, tier or remedy.

Loaded in AUTHOR and DEBUG. Not loaded in AUDIT — so nothing here may be written as if the
reader has AUDIT's content in front of them, and nothing here is the authoritative copy of a
list another mode reads from `SKILL.md`.

**Citations.** Each block ends with a bracketed source key resolved in
[Sources](#sources). Cached primary sources were fetched and adversarially fact-checked
2026-08-31; two blocks were re-verified live 2026-09-01 and say so. Where a source is silent,
this file says "not stated by any source here" rather than filling the gap.

**Tags.** `[OPINION]` marks a claim no source states — a judgement this package is making.
Everything untagged is traceable to a cited source.

---

## 1. Lifecycle

### Order, and where each hook runs

| # | Hook | Runs on | When |
|---|------|---------|------|
| 1 | `initializeCommand` | **HOST** | "during initialization, including during container creation and on subsequent starts" |
| 2 | `onCreateCommand` | container | First of the three creation commands, immediately after first start |
| 3 | `updateContentCommand` | container | After `onCreate`, whenever new content is available in the source tree during creation |
| 4 | `postCreateCommand` | container | Last creation command, once the container is assigned to a user |
| 5 | `postStartCommand` | container | Each time the container is successfully started |
| 6 | `postAttachCommand` | container | Each time a tool successfully attaches |

`initializeCommand` is the only host hook. It runs where the source lives — for a cloud
service that is the cloud, not the user's laptop. The spec adds that it runs "including during
container creation and on subsequent starts. The command may run more than once during a given
session." Two things to DO with that: never make it non-idempotent, and when a build fails with
a missing tool that is plainly not in the image, check `initializeCommand` before reading the
Dockerfile — the failure is on the host.
[spec-reference], [json-ref]

**Features cannot contribute `initializeCommand`.** The feature-contributed-lifecycle proposal
states: "Note that `initializeCommand` is omitted, pending further discussions around a secure
design." A Feature that needs host-side work has no sanctioned hook; say so rather than
inventing one. [lifecycle-contrib]

`waitFor` gates how far the tool blocks before handing the environment over, and defaults to
`updateContentCommand`. Its legal values, what the default implies for a hook that sits after
it, and the value people reach for that is not among them, are all `DC-LIFE-002`.
[json-ref], [base-schema]

Failure propagates forward: "If one of the lifecycle scripts fails, any subsequent scripts will
not be executed." All lifecycle commands execute from the workspace folder. [json-ref]

### Feature-contributed commands run first

"When a dev container is brought up, for each lifecycle hook, each Feature that contributes a
command to a lifecycle hook shall have the command executed in sequence, following the same
execution order as outlined in Feature installation order, and always before any user-provided
lifecycle commands." Worked shape from the same document:

```
featureA.onCreateCommand → featureA.postCreateCommand → featureB.postCreateCommand
  → user.postCreateCommand → featureA.postAttachCommand → user.postAttachCommand
```

Each bullet blocks the next, and a non-zero exit anywhere aborts everything after it. What to
DO: when a user hook fails because something a Feature was supposed to install is missing,
that is *not* an ordering problem — the Feature's hook already ran and either failed or did
not do what was assumed. Read the Feature's contributed command before rewriting the user's.
[lifecycle-contrib]

The same document warns that a Feature's own files may be gone by the time its hook runs: "To
use any assets embedded within a Feature in a lifecycle hook, it is the Feature author's
responsibility to copy that asset somewhere on the container where it will persist (outside of
`/tmp`). Implementations are not required to persist Feature install scripts beyond the initial
build." [lifecycle-contrib]

### Re-run gating (why an edit appears to do nothing)

The reference CLI writes a marker file per hook under the container data folder,
`.<hookName>Marker`, and compares its contents against a timestamp:

| Hook | Keyed to | Effect |
|------|----------|--------|
| `onCreateCommand`, `updateContentCommand`, `postCreateCommand` | `createdAt` | Runs once per container **creation** |
| `postStartCommand` | `startedAt` | Runs once per container **start** |
| `postAttachCommand` | — | **Always** runs |

`updateContentCommand` is the one exception: `--prebuild` forces its re-run (§2). The resume
path — restart containers, then implementation-specific steps, then `postStartCommand` and
`postAttachCommand` — never re-runs the three creation hooks.

What to DO: before concluding a lifecycle command is broken, establish which of *reopen*,
*restart* and *recreate* the user actually performed. A restart re-runs only the last two rows.
An edit to `postCreateCommand` changes nothing until the container is recreated.
[cli-source: `src/spec-common/injectHeadless.ts`], [spec-reference]

### The three value forms

Identical for all six hooks.

| Form | Executed as | Consequence to watch |
|------|-------------|----------------------|
| string | through a shell (`/bin/sh`) | `&&` chains; shell quoting applies — `"echo foo='bar'"` prints `foo=bar` |
| array | exec'd directly, **no shell** | `["echo","foo='bar'"]` prints `foo='bar'` — quotes are preserved because nothing parses them |
| object | every entry **in parallel** | key is a unique command name, value is a string or array; "Each command must exit successfully for the stage to be considered successful" |

Spec example: `{ "postCreateCommand": { "server": "npm start", "db": ["mysql","-u","root","-p","my database"] } }`

A Feature-contributed object-form hook runs its own entries in parallel but still blocks the
next Feature and the user's hook. What each form means for analysing a configuration, and what
to do about it, is `DC-LIFE-003`. [parallel-lifecycle], [spec-reference]

The environment a lifecycle command sees is assembled by the reference CLI as
`userEnvProbe` results, then `--remote-env` values, then the config's `remoteEnv`, then
`--secrets-file` entries — later sources overwrite earlier ones. Which startup files the probe
reads is `DC-ENV-001`. [cli-source]

---

## 2. Prebuilds

Two different machines are meant by "prebuild", and they bake different things.

**The reference CLI's `--prebuild`** (available on `up` and `run-user-commands`) is documented
in the CLI's own flag definition as: "Stop after onCreateCommand and updateContentCommand,
rerunning updateContentCommand if it has run before." In the code path that means
`onCreateCommand` runs with `rerun=false`, `updateContentCommand` runs with `rerun` forced
true, and the run returns before `postCreateCommand`, `postStartCommand` or
`postAttachCommand` are reached at all. [cli-source: `src/spec-node/devContainersSpecCLI.ts`]

**A Codespaces prebuild** produces a snapshot by "performing setup operations up to and
including any `onCreateCommand` and `updateContentCommand` commands in the `devcontainer.json`
file. No `postCreateCommand` commands are run during the creation of a prebuild."
[gh-prebuilds]

Three mechanics follow, and they are the reason `DC-LIFE-001` exists — open it for the
normative claim and the fix:

- `onCreateCommand` is keyed to `createdAt` (§1), so a prebuilt image that is *rebuilt from*
  rather than *recreated* does not re-run it.
- `updateContentCommand` is the only hook deliberately re-run to refresh a prebuild.
- Feature dependency resolution is likewise frozen at first creation (§3), so the prebuilt
  image carries a *resolved* Feature set, not the `features` property.

What to DO when a prebuild "did not pick up my change": identify which of those three froze,
rather than rebuilding repeatedly. `DC-LIFE-001` carries the scope this applies in, and the
remedy; take both from there rather than from this page.

---

## 3. Features

### Resolution order

The install order is a **round-based topological sort**, not declaration order. The spec says
default order is "determined as optimal by the implementing tool" — never assume the order of
keys in the `features` object.

1. Build a graph from the user-defined Features. Traverse `dependsOn` **recursively**,
   refetching metadata for each dependency; traverse `installsAfter` **non-recursively**.
2. `roundPriority` defaults to 0. `overrideFeatureInstallOrder` assigns `roundPriority = n - idx`
   — for `[foo, bar, baz]` that is `foo:3, bar:2, baz:1`.
3. Drop every `installsAfter` edge pointing at a Feature not in the worklist.
4. Repeatedly collect the nodes whose dependencies are all already ordered into a *round*,
   commit only those with the maximum `roundPriority`, and return the rest to the worklist. A
   round that commits nothing is a cycle and is an error.

Ties inside a round break by a fixed chain: fully-qualified resource name (lexicographic) →
oldest-to-newest tag (`latest` counts as newest) → greatest count of user-supplied options →
option keys lexicographic → option values lexicographic → canonical name (digest).
[feature-deps]

What `overrideFeatureInstallOrder` can and cannot do is `DC-FEAT-001`.

### `dependsOn` versus `installsAfter`

| | `dependsOn` | `installsAfter` |
|---|---|---|
| Strength | hard — pulls the Feature in | soft — only reorders Features already being installed |
| Recursive | yes | no |
| Can carry options | yes | no |
| Can pin a version tag or digest | yes | no |
| If the named Feature is not otherwise installed | it is installed | the edge is dropped |

Verbatim: `installsAfter` "(1) is **not** recursive, (2) indicates a soft dependency to
influence installation order **if and only if a given Feature is already set to be installed
via a user-defined Feature or transitively through a user-defined Feature**, and (3) Features
indicated by `installsAfter` can not provide options, nor are they able to be pinned to a
specific version tag or digest."

What to DO: when an authored Feature genuinely needs another Feature present, use `dependsOn`.
`installsAfter` is the property people reach for and it will silently do nothing if the other
Feature is not independently in the graph. [feature-deps]

### Feature equality, and why a Feature can install twice

Two Features are equal — and therefore deduplicated — only when both the artifact and the
options match: OCI, same manifest digest **and** same options; HTTPS tarball, identical tarball
hash **and** same options; local, never equal (every local Feature is unique). So the same
Feature referenced twice with different options installs twice. Resolution runs only on initial
creation from `devcontainer.json`; a rebuild from an image or a resume does not recompute it.
Both halves are `DC-FEAT-002`. [feature-deps]

### Options become environment variables (and the mangling is lossy)

Option values are written to `devcontainer-features.env` as `<OPTION_NAME>=<value>` and sourced
before `install.sh`. The name transformation is verbatim:

```javascript
(str) => str
  .replace(/[^\w_]/g, '_')
  .replace(/^[\d_]+/g, '_')
  .toUpperCase();
```

Any option the user omits is still exported, at its declared default. Option types are only
`boolean` and `string`; a string option carries either `enum` (a strict list) or `proposals`
(suggestions, free-form still allowed), never both.

What to DO: the mangling is many-to-one — `my-opt`, `my.opt` and `my opt` all become `MY_OPT`.
When authoring, choose option IDs that are already valid identifiers so the emitted name is
predictable, and never read an option from a name you guessed; derive it with the rule above.
[features]

### The `_REMOTE_USER` family

`install.sh` runs as **root** at image-build time. Four variables are passed in:
`_CONTAINER_USER` (the container's user), `_REMOTE_USER` (the configured `remoteUser`, falling
back to `_CONTAINER_USER` when none is configured), and their home directories
`_CONTAINER_USER_HOME` and `_REMOTE_USER_HOME`.

The container user itself can arrive from any of: `containerUser` in `devcontainer.json`, image
metadata, `user:` in a compose file, `USER` in the Dockerfile, or the base image — which is why
hardcoding a username is wrong even when it happens to be right today. The normative rule is
`DC-FEAT-003`. [features], [features-user-env]

### Version pinning and lockfiles

Publishers push several tags for one release — the distribution document's own example loops
over `1`, `1.2`, `1.2.3` and `latest`. Consumers may reference any tag, or an immutable
`@sha256:` digest. **Omitting the tag means `:latest`**, and Feature IDs are case-insensitive
and normalised to lowercase. [features-dist], [features]

Lockfiles graduated from experimental to stable in CLI **0.87.0** (May 2026) and are "now
generated by default on `build` and `up`", with `--no-lockfile` to opt out and
`--frozen-lockfile` to require the file exists and is unchanged.
`--experimental-lockfile` / `--experimental-frozen-lockfile` are deprecated but still accepted
with a warning. Each entry records `version`, `resolved` (a digest-qualified ID for OCI, the
URL for a tarball), `integrity` (`sha256:` plus hex), and optionally `dependsOn`. Local
Features and the deprecated GitHub-Release Features are **not** recorded.
[cli-changelog], [lockfile]

> **Cache disagreement, unresolved.** The lockfile proposal names the file
> `devcontainer-lock.json`, beside `devcontainer.json`; the CLI README writes it
> `.devcontainer-lock.json`. The reconciliation in the project's research notes is that the
> leading dot is used when the configuration file itself starts with a dot — but no source in
> the cache states that rule outright. What to DO: check for both names rather than asserting
> one. [lockfile], [cli-readme]

---

## 4. Image metadata and the merge

At runtime the effective configuration is `devcontainer.json` merged with the
`devcontainer.metadata` image label — a JSON string holding an array of entries, one per
Feature and one for the devcontainer.json config (a single top-level object is also accepted).
Since CLI 0.86.0 the label is always written as an array. [image-metadata], [cli-changelog]

### The merge is property-specific

This is where a model guesses. It is a table, not a rule of thumb.

| Property | Merge logic |
|---|---|
| `id` | not merged |
| `init`, `privileged` | `true` if at least one is `true`, else `false` |
| `capAdd`, `securityOpt` | union of all arrays, without duplicates |
| `entrypoint` | collected list of all entrypoints |
| `mounts` | collected list; on conflict, **last source wins** |
| `onCreateCommand`, `updateContentCommand`, `postCreateCommand`, `postStartCommand`, `postAttachCommand` | **collected list** — every contributor's command runs |
| `waitFor`, `containerUser`, `remoteUser`, `userEnvProbe`, `overrideCommand`, `shutdownAction`, `updateRemoteUserUID` | last value wins |
| `remoteEnv`, `containerEnv` | **per variable**, last value wins |
| `portsAttributes` | per **port**, last value wins — not per attribute; a later source replaces the whole attribute object for that port |
| `otherPortsAttributes` | last value wins, not per attribute |
| `forwardPorts` | union without duplicates; last wins when a mapping changes |
| `hostRequirements` | **max value wins** |
| `customizations` | "Merging is left to the tools." |

And the tiebreak that decides everything above: "Variables in string values will be substituted
at the time the value is applied. **When the order matters, the devcontainer.json is considered
last.**" [image-metadata]

Three things to DO with this table:

- A lifecycle command in the file does not *replace* one from a Feature or base image — both
  run. Do not diagnose "my command didn't run" as an override.
- A `mounts` entry that looks ignored is more likely being overridden by a later source than
  dropped.
- `hostRequirements` merging by max means a Feature or base image can silently raise the
  machine-size floor a project needs. Check the label before blaming the file.

`remoteEnv` and `containerEnv` are both on the label-storable list, which is the mechanical
reason `DC-SEC-001` exists; the consequence and the remedy live there.

**Gap.** The merge document's `hostRequirements` row names `cpus`, `memory` and `storage`. The
`gpu` requirement was added to the schema later and the merge document was not updated, so the
merge behaviour of `gpu` is **not stated by any source here**. Say so rather than assuming it
follows the max rule. [image-metadata], [base-schema], [gpu-proposal]

### What the label can carry

**The basis for both lists in this section is the per-property marker in the
devcontainer.json reference**, whose legend reads: "Metadata properties marked with a 🏷️ can
be stored in the `devcontainer.metadata` **container image label** in addition to
`devcontainer.json`." That is a *positive* marker attached to each property in turn, which
makes it a stronger basis than the merge table: the merge table describes how values **combine**
once they are on the label, not what the label **records**. Where this section cites
[image-metadata] it is for merge logic; where it states what is or is not carried, the
authority is [json-ref]. Extracted 2026-09-01, the reference carries 50 property rows — 31
marked, 19 unmarked across 18 distinct properties.

Do **not** take the can-carry list from the image-metadata document's opening prose sentence
("Current dev container config that can be recorded in the image: …"). That sentence is a
stale snapshot, and the document supersedes it two sections later: "We are adding support for
`mounts`, `containerEnv`, `containerUser`, `init`, `privileged`, `capAdd`, and `securityOpt` to
the devcontainer.json." A reader who takes the prose sentence under-counts by six.
[json-ref], [image-metadata]

Carried **from `devcontainer.json`** (marked in the reference; corroborated by the merge
table's devcontainer.json column):
`init`, `privileged`, `capAdd`, `securityOpt`, `mounts`, `onCreateCommand`,
`updateContentCommand`, `postCreateCommand`, `postStartCommand`, `postAttachCommand`,
**`waitFor`**, `customizations`, **`containerUser`**, `remoteUser`, `userEnvProbe`, `remoteEnv`,
`containerEnv`, `overrideCommand`, `portsAttributes`, `otherPortsAttributes`, `forwardPorts`,
`shutdownAction`, `updateRemoteUserUID`, `hostRequirements`.

Carried **from Feature metadata**: `mounts`, `init`, `privileged`, `capAdd`, `securityOpt`,
`entrypoint`, `customizations`, and `id` (recorded, never merged). [image-metadata]

`waitFor` and `containerUser` are bolded because they are the two the stale prose sentence
omits. Both carry the 🏷️ marker in the reference, both are marked in the merge table, and
`containerUser` is named a third time in the "Additional devcontainer.json Properties" section.
Both **are** label-storable. Do not conclude otherwise from the prose sentence.

### What the label never carries

**This list is not a complement, and must never be derived as one.** Because the marker is
positive and per-property, the reference supports **three** states, not two:

| What the reference shows | What it means |
|---|---|
| A row carrying 🏷️ | **storable** — attested |
| A row with **no** marker | **not storable** — attested, and this is the list below |
| **No row at all** | the source is **silent** — and silence is not immunity |

The third state is the one that gets misread. `secrets`, `extensions`, `settings` and `devPort`
have **zero occurrences anywhere in the reference** — `secrets` postdates the page, the other
three are deprecated in favour of `customizations.vscode.*` (`DC-DEP-001`). Nothing on that
page supports a claim either way about them. Do not place them on either list, and do not treat
their absence as immunity. [json-ref]

The never-storable list is enumerated from unmarked rows, not derived, and its **canonical copy
lives in `SKILL.md`**, under "My changes aren't taking effect"; the **thirteen** items below are
that same list reproduced for AUTHOR and DEBUG readers, and it is not a second authority — if
the two ever disagree, or if this copy is not thirteen items long, `SKILL.md` is the one other
modes read and the divergence is a defect to fix there.

`name`, `initializeCommand`, `image`, `build.*`, `dockerComposeFile`, `service`, `runServices`,
`appPort`, `runArgs`, `workspaceMount`, `workspaceFolder`, `features`,
`overrideFeatureInstallOrder`.

Thirteen, not twelve: the 19 unmarked rows cover 18 distinct properties (`workspaceFolder`
appears in two tables), and collapsing the six `build.*` entries to `build.*` leaves exactly
thirteen. **`name` is attested, not silent** — it has an unmarked row of its own. [json-ref]

What to DO, in three cases rather than two:

- **On the never-carries list** — changing it and rebuilding *from a prebuilt image* does
  nothing; the change only takes effect on a recreate from `devcontainer.json`.
- **On the can-carry list** — absence from the file is not absence at runtime; the label may
  still supply it.
- **On neither list** — say that the source is silent and check the merged configuration.
  Never report label-immunity you inferred rather than read.

To see the merged result rather than guessing:

```bash
if command -v devcontainer >/dev/null 2>&1; then
  devcontainer read-configuration --workspace-folder . --include-merged-configuration
else
  echo "devcontainer CLI not installed - read the config and the base image's label separately"
fi
```

To read the label straight off an image already present locally (read-only; it does not pull):

```bash
if command -v docker >/dev/null 2>&1; then
  docker inspect --format '{{ index .Config.Labels "devcontainer.metadata" }}' <image>
else
  echo "docker not installed - the label cannot be read here"
fi
```

---

## 5. Codespaces divergences

Codespaces implements the specification with documented exceptions. Check these before calling
a Codespaces-only difference a bug. The list is complete as of the cited page.

| Property | Divergence |
|---|---|
| `customizations.codespaces` | read from `devcontainer.json`, **not** from image metadata |
| `hostRequirements` | read from `devcontainer.json`, **not** from image metadata |
| `mounts` | bind mounts are **ignored**, with the exception of the Docker socket; volume mounts are still allowed |
| `forwardPorts` | the `"host:port"` variation is not supported |
| `portsAttributes` | the `"host:port"` variation is not supported |
| `shutdownAction` | does not apply |
| `${localEnv:VARIABLE_NAME}` | the host is in the cloud, not the user's machine |

[supporting-tools]

Two consequences worth stating outright:

- A value that reached a local container through a base image's label — `hostRequirements`, or
  anything under `customizations.codespaces` — simply is not there in Codespaces. Move it into
  `devcontainer.json` if it must apply in both places.
- A `mounts`-based local performance fix (§6) silently vanishes in Codespaces. That same
  exception is why docker-outside-of-docker works there and a bind-mount-based approach does
  not (§7).

Codespaces also runs a default setup when `devcontainer.json` specifies no `postCreateCommand`;
`customizations.codespaces.disableAutomaticConfiguration` turns that off (that key is in the
specification document but not on the rendered containers.dev page — see the note under
[Sources](#sources)). Its other keys are
`repositories` (per-repository permission grants) and `openFiles` (paths relative to the repo
root, opened in order, the first one activated). Prebuild behaviour is §2.
[supporting-tools]

---

## 6. Performance

### Where the time goes

The default workspace mount is a bind mount. "While this is the simplest option, on macOS and
Windows, you may encounter slower disk performance when running commands like `yarn install`
from inside the container." The cause is structural: "Since macOS and Windows run containers in
a VM, 'bind' mounts are not as fast as using the container's filesystem directly." Linux hosts
do not pay this. [vscode-perf]

What to DO first: establish **which phase** is slow — image pull, image build, or lifecycle
commands. They have different fixes and only the third is affected by anything in this section.

### The two sanctioned fixes

**Targeted named volume** for hot directories — package folders, data folders, build output:

```jsonc
"mounts": [
  "source=${localWorkspaceFolderBasename}-node_modules,target=${containerWorkspaceFolder}/node_modules,type=volume"
]
```

The page notes the `source` may use `${localWorkspaceFolderBasename}`, `${devcontainerId}`, or
a hardcoded name.

**Whole tree on a volume** — `workspaceMount` plus `workspaceFolder`. Each property's own
schema entry requires the other ("Requires `workspaceFolder` be set as well" / "Requires
`workspaceMount` be set"), so setting one alone is a misconfiguration.

Both fixes have the same consequence: a named volume comes up **root-owned**, so a non-root
`remoteUser` cannot write into it. That consequence and its remedy are `DC-PERF-001`.
[vscode-perf], [json-ref]

Two knobs that look like fixes and are not: `consistency=cached` / `delegated` (and
`--workspace-mount-consistency`, default `cached`) are legacy osxfs tuning parameters and are
effectively inert on modern Docker Desktop file sharing. Do not recommend them as a
performance fix. [OPINION — the mechanism is documented, the "inert today" judgement is not
stated by any source here]

### WSL2 on Windows

"if you store your source code in the WSL 2 filesystem, you will see improved performance along
with better compatibility for things like setting permissions." The practical form: a repository
living under `/mnt/c/...` is being reached across the Windows/Linux filesystem boundary on every
read; the same repository inside the WSL2 filesystem is not.

What to DO on a Windows host that reports slowness: ask where the repository lives **before**
proposing any `mounts` change. Moving it into the WSL2 filesystem is the larger win and costs
nothing in the configuration file. `[OPINION]` — the page documents the improvement; ranking
it as the biggest Windows penalty is this package's judgement, and no prior devcontainer
corpus covers it. [vscode-perf]

### Architecture mismatch (arm64 versus amd64)

An arm64 host pulling an image or Feature published only for amd64 either fails outright or
runs under emulation and is dramatically slower. Nothing in the specification declares an
architecture; the spec's own Feature guidance is that an `install.sh` "must handle x86_64 and
arm64", detected with `uname -m` or `dpkg --print-architecture` — which is an author-side
obligation, not a guarantee to a consumer.

The two levers, both real properties: `devcontainer build --platform <p>`, and `build.options`,
"An array of Docker image build options that should be passed to the build command when
building a Dockerfile".

What to DO: on a "won't build" or "unbearably slow" report from an Apple Silicon or arm64
Linux host, check the architecture of the base image and of every Feature before reading the
build log further. `[OPINION]` — a host-side observation, not stated by the specification, and
not covered by any prior devcontainer corpus. [features], [json-ref], [cli-source]

---

## 7. docker-in-docker versus docker-outside-of-docker

Two Features, two different topologies. Both `installsAfter` `common-utils`. Metadata below
re-verified live 2026-09-01 against the Features repository — versions were
`docker-in-docker` 4.1.0 and `docker-outside-of-docker` 1.10.0.

| | docker-in-docker | docker-outside-of-docker |
|---|---|---|
| Shape | a real nested daemon inside the dev container | the host daemon, reached through its socket |
| Requires | `"privileged": true` | `"securityOpt": ["label=disable"]` |
| Storage | two named volumes keyed by `${devcontainerId}`: `dind-var-lib-docker-…` → `/var/lib/docker`, `dind-var-lib-containerd-…` → `/var/lib/containerd` | bind mount `/var/run/docker.sock` → `/var/run/docker-host.sock` |
| Also sets | `containerEnv.DOCKER_BUILDKIT=1` | `legacyIds: ["docker-from-docker"]` |
| Containers it starts are | children of the nested daemon | **siblings** on the host daemon |

The consequences that decide which one to use:

- **docker-in-docker needs `--privileged`.** That is a real security posture change and it is
  unavailable in many hosted and rootless environments. Do not propose it without saying so.
- **docker-outside-of-docker's containers are siblings**, so a path bind-mounted into a sibling
  container is resolved **on the host**, not inside the dev container. This is the classic
  "my volume mount points at the wrong filesystem" bug, and it is a topology fact, not a
  misconfiguration to fix in the file.
- The socket grants effective root on the host to anything inside the dev container.
- Codespaces ignores bind mounts *except* the Docker socket (§5) — which is exactly why
  docker-outside-of-docker works there while the dind volumes are what survives.

[features-repo: live 2026-09-01], [supporting-tools]

---

## 8. Substitutions

`${localEnv:VARIABLE_NAME}` — value of a host environment variable. Usable in **any** property.
"Unset variables are left blank." A default is written `${localEnv:VARIABLE_NAME:default_value}`.
For a cloud service the host is in the cloud. Clients may need restarting to pick up a newly
set variable.

`${containerEnv:VARIABLE_NAME}` — value of an environment variable **inside** the container once
it is running. Usable in `remoteEnv` **only**. A default is written
`${containerEnv:VARIABLE_NAME:default_value}`. The canonical use is extending an existing value:
`"remoteEnv": { "PATH": "${containerEnv:PATH}:/some/other/path" }`.

`${localWorkspaceFolder}`, `${containerWorkspaceFolder}`,
`${localWorkspaceFolderBasename}`, `${containerWorkspaceFolderBasename}` — usable in any
property.

`${devcontainerId}` — an identifier unique to the dev container and **stable across rebuilds**.
[json-ref]

### `${devcontainerId}` is restricted, and the restriction has a reason

"It should only be used in parts of the configuration and metadata that is not used for
building the image because that would otherwise prevent pre-building the image at a time when
the dev container's id is not known yet."

Excluding boolean, number and enum properties, the properties that support it in
`devcontainer.json` are exactly: `name`, `runArgs`, `initializeCommand`, `onCreateCommand`,
`updateContentCommand`, `postCreateCommand`, `postStartCommand`, `postAttachCommand`,
`workspaceFolder`, `workspaceMount`, `mounts`, `containerEnv`, `remoteEnv`, `containerUser`,
`remoteUser`, `customizations`.

In **Feature metadata** the list is only: `entrypoint`, `mounts`, `customizations`.

What to DO: `build.args` and everything else that feeds the image build are **not** on either
list. A `${devcontainerId}` written there will not resolve to what the author expects — do not
put it in an image-build input, and when a mount name must be per-project *and* build-time
stable, use `${localWorkspaceFolderBasename}` instead.
[devcontainer-id], [json-ref]

---

## 9. `customizations` is an open namespace

The schema entry is the whole constraint: `"type": "object"`, described as "Tool-specific
configuration. Each tool should use a JSON object subproperty with a unique name to group its
customizations." There is no `properties` list, no `additionalProperties: false`, no registry
and no reservation process. Any tool may claim any name. [base-schema], [json-ref]

Two consequences, and the second is the operational one:

1. **It is the spec-sanctioned home for per-repo tool configuration.** A tool that wants
   per-repository settings inside a dev container belongs under its own key here rather than
   under a top-level property it invents. `customizations.vscode` carries `extensions`,
   `settings`, `mcp` and `devPort`; `customizations.codespaces` carries `repositories`,
   `openFiles` and `disableAutomaticConfiguration`; `customizations.jetbrains` and several
   cloud vendors' namespaces exist in vendor documentation and are registered nowhere central.
   The migration of the deprecated top-level twins is `DC-DEP-001`.
2. **Nothing under `customizations.*` can be checked against a property list.** There is no
   list to check against. A key you do not recognise there is not evidence of a typo, a
   mistake, or an unknown property — it is the namespace working as designed. When **writing**
   a configuration, this is why a tool's settings belong under its own key here and why you
   need not justify a name you have not seen before; when **debugging** one, it is why an
   unfamiliar key under `customizations` is not a lead and a missing behaviour there is a
   question for that tool's own documentation, not for the dev container schema. Stop at the
   `customizations` boundary and reason only above it.

For Feature metadata specifically, merging inside a namespace is defined: "each namespace under
`customizations` is treated as a separate set of properties. For each of these sets the object
is parsed, values are replaced while arrays are set as a union." For `devcontainer.json`
customizations the merge document says only "Merging is left to the tools" — so **no source
here states a general merge rule** for a namespace a tool has not documented.
[features], [image-metadata]

---

## 10. The CLI surface

The reference implementation is `@devcontainers/cli`. It parses JSONC and merges configuration;
it does **not** validate against the JSON Schema.

| Command | Purpose |
|---|---|
| `devcontainer up` | create and run the dev container |
| `devcontainer set-up` | set up an existing container as a dev container (requires `--container-id`) |
| `devcontainer build [path]` | build or pre-build the image |
| `devcontainer run-user-commands` | run the lifecycle commands |
| `devcontainer read-configuration` | output the configuration for a workspace |
| `devcontainer outdated` | show outdated lockfile Features |
| `devcontainer upgrade` | upgrade lockfile Features |
| `devcontainer exec <cmd> [args..]` | run a command in the container with `userEnvProbe`, `remoteUser` and `remoteEnv` applied |
| `devcontainer features test \| package \| publish \| info \| resolve-dependencies \| generate-docs` | Feature authoring and testing |
| `devcontainer templates apply \| publish \| metadata \| generate-docs` | Template authoring (out of scope for this skill) |

`stop` and `down` are listed in the README's status checklist as **not implemented**.
[cli-readme], [cli-source]

Flags worth knowing because they change what runs, not just how it is logged:

- `--prebuild` (on `up` and `run-user-commands`) — §2.
- `--skip-post-create` — "Do not run onCreateCommand, updateContentCommand, postCreateCommand,
  postStartCommand or postAttachCommand and do not install dotfiles."
- `--skip-non-blocking-commands` — stop at `waitFor`.
- `--secrets-file <path>` — the sanctioned channel for real secret values; see `DC-SEC-001`.
- `--no-lockfile` / `--frozen-lockfile` — §3.
- `--update-remote-user-uid-default [never|on|off]` — see `DC-USER-001`.
- `--default-user-env-probe [none|loginInteractiveShell|interactiveShell|loginShell]` — see
  `DC-ENV-001`.
- `--include-merged-configuration` on `read-configuration` — §4.
- `--platform` on `build` — §6.

Two cautions before invoking any of this. **The CLI is not assumed to be installed** — probe
first, as every snippet in this file does. And `up` and `build` create containers and consume
time and disk: never run either without the user's explicit confirmation.
`read-configuration`, `outdated` and `features resolve-dependencies` are read-only queries.

> **Cache disagreement, noted not resolved.** The README's inline `devcontainer <command>` help
> block lists only `up`, `build`, `run-user-commands`, `read-configuration`, `features`,
> `templates` and `exec` — it omits `set-up`, `outdated` and `upgrade`, which the same README's
> status checklist and the CLI source both carry. Treat the help block as a stale excerpt and
> the source as authoritative. [cli-readme], [cli-source]

---

## Sources

Most keys resolve to a document cached under `docs/sources/` in this repository, fetched and
fact-checked 2026-08-31. Four do not, and are marked in the table:

- `[vscode-perf]` and `[features-repo]` — **live-fetched 2026-09-01**, not cached.
- `[gh-prebuilds]` — **not cached**; §2's Codespaces prebuild quote is taken from the URL
  below, which is also `DC-LIFE-001`'s cited source in `references/rules.md`. It cannot be
  checked offline from this repository.
- `[cli-source]` — **not cached as source code.** The claims attributed to it are readings of
  the reference CLI's own files, recorded in `docs/RESEARCH-BRIEF.md`'s working notes rather
  than taken from the artefacts. The filenames are given so a reader can check them upstream;
  treat these as verified-by-inspection, not as quoted from a cached document.

All twenty source URLs in the table were resolved live on 2026-09-01 and returned 200.

| Key | Document |
|---|---|
| `[base-schema]` | `devContainer.base.schema.json` — <https://github.com/devcontainers/spec/blob/main/schemas/devContainer.base.schema.json> |
| `[json-ref]` | devcontainer.json reference — <https://containers.dev/implementors/json_reference/> |
| `[spec-reference]` | Dev Container specification, environment creation and lifecycle — <https://containers.dev/implementors/spec/> |
| `[image-metadata]` | Image metadata and merge logic — <https://github.com/devcontainers/spec/blob/main/docs/specs/image-metadata.md> |
| `[features]` | Dev Container Features — <https://containers.dev/implementors/features/> |
| `[feature-deps]` | Feature dependencies — <https://github.com/devcontainers/spec/blob/main/docs/specs/feature-dependencies.md> |
| `[features-dist]` | Features distribution — <https://containers.dev/implementors/features-distribution/> |
| `[features-user-env]` | User env variables for Features — <https://github.com/devcontainers/spec/blob/main/docs/specs/features-user-env-variables.md> |
| `[lifecycle-contrib]` | Features contribute lifecycle scripts — <https://github.com/devcontainers/spec/blob/main/docs/specs/features-contribute-lifecycle-scripts.md> |
| `[parallel-lifecycle]` | Parallel lifecycle script execution — <https://github.com/devcontainers/spec/blob/main/docs/specs/parallel-lifecycle-script-execution.md> |
| `[devcontainer-id]` | `${devcontainerId}` — <https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-id-variable.md> |
| `[lockfile]` | Lockfiles — <https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-lockfile.md> |
| `[gpu-proposal]` | GPU host requirement — <https://github.com/devcontainers/spec/blob/main/docs/specs/gpu-host-requirement.md> |
| `[supporting-tools]` | Supporting tools, incl. the Codespaces divergence table — <https://github.com/devcontainers/spec/blob/main/docs/specs/supporting-tools.md>. Rendered, incomplete mirror: <https://containers.dev/supporting> (see the note below the table) |
| `[cli-readme]` | Dev Container CLI README — <https://github.com/devcontainers/cli> |
| `[cli-changelog]` | Dev Container CLI changelog — <https://github.com/devcontainers/cli/blob/main/CHANGELOG.md> |
| `[cli-source]` | Reference CLI source — `src/spec-node/devContainersSpecCLI.ts`, `src/spec-common/injectHeadless.ts` — <https://github.com/devcontainers/cli> |
| `[features-repo]` | Feature metadata, live-verified 2026-09-01 — <https://github.com/devcontainers/features/tree/main/src> |
| `[vscode-perf]` | Improve disk performance, live-verified 2026-09-01 — <https://code.visualstudio.com/remote/advancedcontainers/improve-performance> |
| `[gh-prebuilds]` | About Codespaces prebuilds — <https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds> |

> **`[supporting-tools]` — where to look, and one live divergence.** The URL previously cited
> here, `containers.dev/supporting-tools`, is dead: it 404s, as do its trailing-slash and
> `.html` variants. The rendered page moved to <https://containers.dev/supporting>. Verified
> 2026-09-01, the specification document in the spec repository is the better citation on two
> counts: it is byte-identical to this repository's cached copy, and it is **more complete than
> the rendered page** — `customizations.codespaces.disableAutomaticConfiguration`, cited in §5,
> appears in the document and **not** on `containers.dev/supporting` today. All seven rows of
> §5's divergence table were re-checked against both and appear verbatim in both. What to DO:
> cite the spec-repo document; use the rendered page only as a reading convenience, and do not
> treat its silence as the specification's.
