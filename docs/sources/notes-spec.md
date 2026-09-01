========================================================================
1. devcontainer.json SCHEMA — EXACT PROPERTY NAMES
========================================================================
Source of truth: https://github.com/devcontainers/spec/blob/main/schemas/devContainer.base.schema.json
Human doc: https://containers.dev/implementors/json_reference/ (= docs/specs/devcontainerjson-reference.md)
Schema allows comments + trailing commas (allowComments:true, allowTrailingCommas:true).
Top-level shape: oneOf[ allOf[ oneOf[ oneOf[dockerfileContainer, imageContainer] + nonComposeBase , composeContainer ] , devContainerCommon ] , devContainerCommon(additionalProperties:false) ]
🏷️ = storable in the `devcontainer.metadata` image label.

--- devContainerCommon (applies to ALL orchestration modes) ---
  $schema                       string
  name                          string
  features                      object   (additionalProperties:true; deprecated legacy keys: fish, maven, gradle, homebrew, jupyterlab)
  overrideFeatureInstallOrder   array<string>  "Array consisting of the Feature id (without the semantic version)..."
  secrets                       object   patternProperties ^[a-zA-Z_][a-zA-Z0-9_]*$ -> { description?: string, documentationUrl?: string(uri) }   [NOT in the containers.dev table]
  forwardPorts              🏷️ array<integer 0..65535 | string ^([a-z0-9-]+):(\d{1,5})$>
  portsAttributes           🏷️ object patternProperties "(^\d+(-\d+)?$)|(.+)" -> PortAttributes
  otherPortsAttributes      🏷️ PortAttributes
  containerEnv              🏷️ object<string,string>
  remoteEnv                 🏷️ object<string, string|null>
  containerUser             🏷️ string
  remoteUser                🏷️ string
  updateRemoteUserUID       🏷️ boolean   (default true on Linux when containerUser/remoteUser set)
  userEnvProbe              🏷️ enum [none, loginShell, loginInteractiveShell, interactiveShell]  default loginInteractiveShell
  mounts                    🏷️ array< Mount | string >
  init                      🏷️ boolean   (--init / tini)
  privileged                🏷️ boolean   (--privileged)
  capAdd                    🏷️ array<string>   example "SYS_PTRACE"
  securityOpt               🏷️ array<string>   example "seccomp=unconfined"
  initializeCommand            string|array|object      [NO 🏷️ — host-side, cannot be in image label]
  onCreateCommand           🏷️ string|array|object
  updateContentCommand      🏷️ string|array|object
  postCreateCommand         🏷️ string|array|object
  postStartCommand          🏷️ string|array|object
  postAttachCommand         🏷️ string|array|object
  waitFor                   🏷️ enum [initializeCommand, onCreateCommand, updateContentCommand, postCreateCommand, postStartCommand]  default updateContentCommand
  hostRequirements          🏷️ object { cpus:int>=1, memory:string ^\d+([tgmk]b)?$, storage:string ^\d+([tgmk]b)?$, gpu: (boolean|"optional") | {cores:int>=1, memory:string} }   unevaluatedProperties:false
  customizations            🏷️ object   "Tool-specific configuration. Each tool should use a JSON object subproperty with a unique name to group its customizations."
  additionalProperties         object   (escape hatch, additionalProperties:true)

--- nonComposeBase (image + Dockerfile modes only) ---
  appPort                      integer|string|array      (deprecated in practice; prefer forwardPorts)
  runArgs                      array<string>
  shutdownAction            🏷️ enum [none, stopContainer]   default stopContainer
  overrideCommand           🏷️ boolean   default true for image/Dockerfile, false for compose
  workspaceFolder              string
  workspaceMount               string

--- imageContainer ---   required: ["image"]
  image                        string

--- dockerfileContainer ---  oneOf of two forms:
  FORM A (current):  required ["build"], build = allOf[ {dockerfile REQUIRED, context}, buildOptions ], unevaluatedProperties:false
      build.dockerfile         string  (REQUIRED)  path relative to devcontainer.json
      build.context            string  default "."
  FORM B (legacy, still valid):
      dockerFile               string  (REQUIRED)   <- note capital F
      context                  string
      build                    buildOptions

--- buildOptions ---
  target                       string        -> build.target
  args                         object<string,string|null>  -> build.args
  cacheFrom                    string|array  -> build.cacheFrom
  options                      array<string> -> build.options   (added Jan 2024, spec PR #324)

--- composeContainer ---  required: ["dockerComposeFile","service","workspaceFolder"]
  dockerComposeFile            string|array   (ordered; later files override earlier)
  service                      string
  runServices                  array<string>  default = all services
  workspaceFolder              string         default "/"
  shutdownAction            🏷️ enum [none, stopCompose]   default stopCompose
  overrideCommand           🏷️ boolean       default false in compose mode

--- Mount object ---  required ["type","target"]
  type   enum [bind, volume]
  source string
  target string
(merge-logic table also references a { type, src, dst } string form; the Docker --mount string syntax is accepted verbatim)

--- PortAttributes sub-properties (portsAttributes.<port> and otherPortsAttributes) ---
  onAutoForward    🏷️ enum [notify, openBrowser, openBrowserOnce, openPreview, silent, ignore]  default "notify"
        NOTE: otherPortsAttributes in the schema omits "openBrowserOnce" from its enum (schema asymmetry).
  elevateIfNeeded  🏷️ boolean  default false
  label            🏷️ string   default "Application"
  requireLocalPort 🏷️ boolean  default false
  protocol         🏷️ enum [http, https]
Key pattern allows a bare port ("3000"), a range ("40000-55000"), or a regex matched against the process command line (".+\\/server.js").

--- Variables ---
  ${localEnv:VARIABLE_NAME}                 any property; host env; unset -> blank; default form ${localEnv:VAR:default_value}
  ${containerEnv:VARIABLE_NAME}             remoteEnv only; default form ${containerEnv:VAR:default_value}
  ${localWorkspaceFolder}                   any
  ${containerWorkspaceFolder}               any
  ${localWorkspaceFolderBasename}           any
  ${containerWorkspaceFolderBasename}       any
  ${devcontainerId}                         restricted list (see §3)
  ${templateOption:optionId}                templates only

--- Image metadata label ---
label name: devcontainer.metadata ; value = JSON string of an ARRAY of snippets (or a single object, supported for convenience).
CLI >=0.86.0 always writes it as a JSON array.
Constraints noted in spec: Dockerfile ~1.3MB total / 65k chars per line; daemon rejects request headers >500kb for CLI-passed labels.

--- Merge logic (verbatim table, devcontainer-reference.md) ---
 id                    -> not merged                                    (feature only)
 init                  -> true if at least one true                     (json + feature)
 privileged            -> true if at least one true                     (json + feature)
 capAdd                -> union w/o duplicates                          (json + feature)
 securityOpt           -> union w/o duplicates                          (json + feature)
 entrypoint            -> collected list of all entrypoints             (feature only)
 mounts                -> collected list; conflicts: last source wins   (json + feature)
 onCreateCommand       -> collected list                                (json + feature)
 updateContentCommand  -> collected list                                (json + feature)
 postCreateCommand     -> collected list                                (json + feature)
 postStartCommand      -> collected list                                (json + feature)
 postAttachCommand     -> collected list                                (json + feature)
 waitFor               -> last value wins                               (json only)
 customizations        -> "Merging is left to the tools."               (json + feature)
 containerUser         -> last wins                                     (json only)
 remoteUser            -> last wins                                     (json only)
 userEnvProbe          -> last wins                                     (json only)
 remoteEnv             -> per variable, last wins                       (json only)
 containerEnv          -> per variable, last wins                       (json only)
 overrideCommand       -> last wins                                     (json only)
 portsAttributes       -> per PORT (not per attribute), last wins       (json only)
 otherPortsAttributes  -> last wins (not per attribute)                 (json only)
 forwardPorts          -> union w/o duplicates; last wins on mapping    (json only)
 shutdownAction        -> last wins                                     (json only)
 updateRemoteUserUID   -> last wins                                     (json only)
 hostRequirements      -> MAX value wins (cpus/memory/storage/gpu)      (json only)
"Variables in string values will be substituted at the time the value is applied. When the order matters, the devcontainer.json is considered last."

========================================================================
2. LIFECYCLE — ORDER, HOST vs CONTAINER, RE-RUN, FORMS
========================================================================
Order (devcontainer-reference.md §Lifecycle + CLI injectHeadless.ts runLifecycleHooks):
  1. initializeCommand   — HOST. Runs during initialization: on creation AND on subsequent starts. "The command may run more than once during a given session." Runs where the source lives (for cloud services, in the cloud).
  2. onCreateCommand     — CONTAINER. First of three creation commands; runs immediately after container first start. Prebuild-safe: cloud services run it during caching/prebuilding, so it must NOT assume user-scoped assets or secrets.
  3. updateContentCommand— CONTAINER. Runs after onCreate whenever new content is available in the source tree during creation. Runs at least once; cloud services periodically re-run it to refresh prebuilds. Repo/org-scoped secrets only.
  4. postCreateCommand   — CONTAINER. Last of three; runs once the container is assigned to a user. Can use user-specific secrets/permissions. By default runs in the BACKGROUND after success is reported (waitFor default is updateContentCommand).
  5. postStartCommand    — CONTAINER. Each time the container is successfully started.
  6. postAttachCommand   — CONTAINER. Each time a tool successfully attaches.
  (waitFor gates how far the tool blocks before connecting; default updateContentCommand.)

Environment Resume path: restart containers -> implementation-specific steps -> postStartCommand + postAttachCommand. (onCreate/updateContent/postCreate are not re-run.)

CWD: all lifecycle commands execute from the workspaceFolder / project workspace folder.
Failure: "If one of the lifecycle scripts fails, any subsequent scripts will not be executed."

Reference-CLI re-run mechanism (src/spec-common/injectHeadless.ts):
  markerFile = <containerProperties.userDataFolder>/.<hookName>Marker
  onCreateCommand / updateContentCommand / postCreateCommand:
      doRun = !!createdAt && updateMarkerFile(marker, createdAt) || rerun
      -> runs once per container-creation timestamp
  postStartCommand:
      doRun = !!startedAt && updateMarkerFile('.postStartCommandMarker', startedAt)
      -> runs once per container-start timestamp
  postAttachCommand:
      runLifecycleCommands(..., doRun = true)   -> ALWAYS runs
  updateMarkerFile shell: mkdir -p dir && CONTENT="$(cat marker 2>/dev/null || echo ENOENT)" && [ "${CONTENT:-$ts}" != "$ts" ] && echo "$ts" > marker

Prebuild flow (CLI): `--prebuild` (on `up` and `run-user-commands`)
  "Stop after onCreateCommand and updateContentCommand, rerunning updateContentCommand if it has run before."
  code: runPostCreateCommand('onCreateCommand', ..., rerun=false)
        runPostCreateCommand('updateContentCommand', ..., rerun = !!params.prebuild)   <-- forced re-run
        if (params.prebuild) return 'prebuild';   <-- postCreate/postStart/postAttach never fire

Three value forms (identical for all six hooks):
  STRING  -> run through a shell (/bin/sh). Use && to chain. Shell parsing applies: "echo foo='bar'" prints foo=bar
  ARRAY   -> exec'd directly, NO shell. ["echo","foo='bar'"] prints foo='bar' (quotes preserved)
  OBJECT  -> parallel execution; key = unique command name, value = string|array. Every entry must exit 0 for the stage to succeed.
Example (spec verbatim):
  { "postCreateCommand": { "server": "npm start", "db": ["mysql","-u","root","-p","my database"] } }
Feature-contributed object-form hooks run their entries in parallel but still block the next Feature / the user's hook.

Feature-contributed lifecycle ordering (features-contribute-lifecycle-scripts.md worked example):
  featureA.onCreateCommand -> featureA.postCreateCommand -> featureB.postCreateCommand -> user.postCreateCommand
  -> featureA.postAttachCommand (parallel) -> user.postAttachCommand (parallel)
  Each bullet blocks; a non-zero exit anywhere aborts everything after it.
  Features cannot contribute initializeCommand.
  "To use any assets embedded within a Feature in a lifecycle hook, it is the Feature author's responsibility to copy that asset somewhere on the container where it will persist (outside of /tmp). Implementations are not required to persist Feature install scripts beyond the initial build."

Environment applied to lifecycle commands (CLI):
  env = { ...userEnvProbe results, ...params.remoteEnv (--remote-env), ...config.remoteEnv, ...secrets (--secrets-file) }

========================================================================
3. FEATURES
========================================================================
Folder layout:
  feature/
    devcontainer-feature.json   (required)
    install.sh                  (required)
    (other files)

devcontainer-feature.json properties (required: id, version, name):
  id                   string   REQUIRED. Unique in repo; MUST match the directory name; should be lowercase.
  version              string   REQUIRED. semver.
  name                 string   REQUIRED. display name.
  description          string
  documentationURL     string
  licenseURL           string
  keywords             array<string>
  options              object<optionId, FeatureOption>
  containerEnv         object<string,string>   -> emitted as Dockerfile ENV before the feature runs
  privileged           boolean
  init                 boolean
  capAdd               array<string>
  securityOpt          array<string>
  entrypoint           string   fires at container start-up
  customizations       object   "each namespace under customizations is treated as a separate set of properties. For each of these sets the object is parsed, values are replaced while arrays are set as a union."
  dependsOn            object   hard deps; mirrors the `features` object semantics (options + version/digest pinning allowed)
  installsAfter        array<string>   soft deps; IDs WITHOUT version tag
  legacyIds            array<string>   old IDs for renames
  deprecated           boolean
  mounts               array<Mount>
  onCreateCommand      string|array|object
  updateContentCommand string|array|object
  postCreateCommand    string|array|object
  postStartCommand     string|array|object
  postAttachCommand    string|array|object
(schema: devcontainers/spec/schemas/devContainerFeature.schema.json, definitions Feature / FeatureOption / Mount)

FeatureOption — three mutually exclusive anyOf shapes (additionalProperties:false each):
  A) { "type": "boolean", "default": <bool>, "description"? }         required: type, default
  B) { "type": "string", "enum": [..], "default": "..", "description"? } required: type, enum, default   (strict list, no free-form)
  C) { "type": "string", "proposals": [..], "default": "..", "description"? } required: type, default    (suggestions, free-form allowed)
Only `boolean` and `string` types exist. enum and proposals are mutually exclusive.

Option -> env var transformation (verbatim):
  (str) => str.replace(/[^\w_]/g,'_').replace(/^[\d_]+/g,'_').toUpperCase()
Written to `devcontainer-features.env` as OPTION_NAME=value and sourced before install.sh.
Omitted options are exported at their declared default.
Shorthand: "ghcr.io/owner/repo/go": "1.18"  ==  { "version": "1.18" }

install.sh contract:
  - executed as ROOT during image build
  - chmod +x install.sh && ./install.sh (execute bit + direct invocation so the shebang picks the shell)
  - may `su ${USERNAME} -c "..."` to do non-root work without sudo present
  - default assumed shell /bin/sh; bash on Debian/Ubuntu/Fedora, sh on Alpine
  - each Feature is its own image layer
  - must handle x86_64 and arm64 (uname -m / dpkg --print-architecture)
Env vars injected: _REMOTE_USER, _CONTAINER_USER, _REMOTE_USER_HOME, _CONTAINER_USER_HOME
  _REMOTE_USER = configured remoteUser; falls back to _CONTAINER_USER if remoteUser unset.
  container user can come from containerUser / image metadata / compose `user:` / Dockerfile USER / base image.

Referencing (id formats):
  <oci-registry>/<namespace>/<feature>[:<semantic-version>]   e.g. ghcr.io/user/repo/go , :1 , :latest , @sha256:...
  https://<uri-to-feature-tgz>                                 tarball must be named devcontainer-feature-<id>.tgz
  ./<path-to-feature-dir>                                      relative to the folder containing devcontainer.json; unix-style path on all OSes
IDs are case-insensitive, normalized to lowercase. `:latest` implied when omitted.
Local-feature constraints: project must have .devcontainer/ at the workspace root; the feature folder must be a SUBFOLDER of .devcontainer/; folder name must equal the feature `id`; no absolute paths.

Install order algorithm (feature-dependencies.md):
  B1 build graph from user-defined features; traverse dependsOn (recursive, refetch metadata) and installsAfter (non-recursive). Accumulator dedupes by Feature Equality.
  B2 roundPriority default 0; overrideFeatureInstallOrder assigns roundPriority = n - idx (for [foo,bar,baz] -> foo:3, bar:2, baz:1).
  B3 round-based topological sort: repeatedly collect nodes whose deps are all already in installationOrder into `round`; commit ONLY those with max roundPriority; return the rest to the worklist. Ties broken by Round Stable Sort. A round that commits nothing => error (cycle).
  Before B3, drop installsAfter edges pointing at features NOT in the worklist.
  Round Stable Sort tiebreak chain: fully-qualified resource name (lex) -> oldest→newest tag (latest = newest) -> greatest count of user-supplied options -> option keys lex -> option values lex -> canonical name (digest).
  Feature Equality: OCI = same manifest digest AND same options; HTTPS tgz = identical tgz hash AND same options; LOCAL = every local feature is unique (never equal).
  overrideFeatureInstallOrder members may not carry options or version pins and cannot violate the dependency graph ("cannot pull forward a Feature until all of its dependencies have been installed"). Naming a feature not in the graph MAY be a fatal error.
  Dependency resolution happens ONLY on initial creation from devcontainer.json; rebuild-from-image / resume does not recompute — resolved deps are frozen into devcontainer.metadata.

Renaming a Feature: change folder + id, add old id to legacyIds, bump semver (continue, don't restart at 1.0.0), republish.
  Canonical example: id docker-from-docker@2.0.1 -> id docker-outside-of-docker@2.0.2, legacyIds ["docker-from-docker"].

Implementation notes (verbatim): order determined by the app based on installsAfter, overridable by overrideFeatureInstallOrder; privileged/init included if ≥1 feature requires them; capAdd/securityOpt concatenated; containerEnv added as ENV before the feature executes; each feature script is its own layer.

Distribution (features-distribution.md):
  Source layout: repo/src/<featureId>/{devcontainer-feature.json, install.sh, ...}
  Package: devcontainer-feature-<id>.tgz containing the whole feature subdir.
  OCI push naming <registry>/<namespace>/<id>[:version]; namespace lowercase, typically <owner>/<repo>.
  Media types: config application/vnd.devcontainers ; layer application/vnd.devcontainers.layer.v1+tar ; collection application/vnd.devcontainers.collection.layer.v1+json
  oras example: for VERSION in 1 1.2 1.2.3 latest; do oras push $REG/$NS/$FEAT:$VERSION --manifest-config /dev/null:application/vnd.devcontainers ./devcontainer-feature-go.tgz:application/vnd.devcontainers.layer.v1+tar; done
  Manifest annotation dev.containers.metadata = escaped JSON of the whole devcontainer-feature.json. If absent, tools MUST fall back to downloading+extracting.
  Layer annotation org.opencontainers.image.title = devcontainer-feature-<id>.tgz
  devcontainer-collection.json { sourceInformation, features:[...] } pushed to <registry>/<namespace>:latest
  Deprecated: GitHub Release distribution (unsupported inside dependsOn; not recorded in lockfiles).

Lockfile (devcontainer-lockfile.md + CLI):
  filename: devcontainer-lock.json (next to devcontainer.json) or .devcontainer-lock.json when the config file itself starts with a dot.
  { "features": { "<id-as-written>": { version, resolved, integrity, dependsOn?[] } } }
    resolved: OCI -> qualified id @sha256:...; tarball -> the https URL
    integrity: "sha256:<hex>"
    keys lowercased; local + GitHub-Release features excluded
  Example:
  {"features":{"ghcr.io/devcontainers/features/node:1":{"version":"1.0.4","resolved":"ghcr.io/devcontainers/features/node@sha256:567d70...","integrity":"sha256:567d70..."}}}

========================================================================
4. TEMPLATES
========================================================================
Folder layout:
  template/
    devcontainer-template.json
    .devcontainer/devcontainer.json     (or a top-level .devcontainer.json)
    (other files: Dockerfile, docker-compose.yml, boilerplate)

devcontainer-template.json — author-written properties:
  id                string  must match directory name
  version           string  semver
  name              string
  description       string
  documentationURL  string
  licenseURL        string
  options           object<optionId, {type: boolean|string, description, proposals[] | enum[], default}>
  platforms         array<string>
  publisher         string
  keywords          array<string>
  optionalPaths     array<string>   files/dirs tooling must prompt about; dir form = "path/*"
Programmatically added at packaging time (CLI containerTemplatesConfiguration.ts):
  type       string  one of "image" | "dockerfile" | "dockerCompose"  (derived from the template's devcontainer.json)
  fileCount  number
  files      string[]   (all relative paths in the template dir)
  featureIds string[]   (resource names derived from the template's `features` keys)

Option substitution: ${templateOption:optionId} replaced across ALL files in the template subdirectory before dropping them into the target workspace.
  Example: "image": "mcr.microsoft.com/devcontainers/java:0-${templateOption:imageVariant}"
optionalPaths examples: "GETTING-STARTED.md", "example-project-1/MyProject.csproj", ".github/*"
  If an omitted directory contains exactly one file, CLI 0.69.0 resolves the metadata entry to the full file path.

Distribution: identical machinery to Features.
  tarball devcontainer-template-<id>.tgz ; ref <oci-registry>/<namespace>/<template>[:<semver>]
  Templates and Features MUST live in different git repos and different namespaces.
  devcontainer-collection.json { sourceInformation, templates:[...] } pushed to <registry>/<namespace>:latest
  oras push uses --config /dev/null:application/vnd.devcontainers (note: templates doc uses --config, features doc uses --manifest-config)
  Starter repos: devcontainers/template-starter , devcontainers/feature-template ; publishing action: devcontainers/action

========================================================================
5. CUSTOMIZATIONS NAMESPACE
========================================================================
Schema text: "Tool-specific configuration. Each tool should use a JSON object subproperty with a unique name to group its customizations."
  -> type:object with NO `properties` and NO additionalProperties:false. ANY tool may claim ANY namespace. There is NO registry, NO reservation process, NO validation.
Merging: spec says "Merging is left to the tools." For FEATURE customizations specifically: "the object is parsed, values are replaced while arrays are set as a union."
Codespaces caveat: reads customizations.codespaces (and hostRequirements) from devcontainer.json only, NOT from image metadata.

customizations.vscode (schema: microsoft/vscode extensions/configuration-editing/schemas/devContainer.vscode.schema.json)
  extensions  array<string>  pattern ^-?publisher.name(@semver|@prerelease)?$ ; leading '-' REMOVES an extension from the list
  settings    $ref vscode://schemas/settings/machine — "only copied when connecting to the container for the first time, rebuilding the container then triggers it again"
  mcp         $ref vscode://schemas/mcp — "Model Context Protocol server configurations"   [recent addition]
  devPort     integer — port VS Code uses to reach its backend
  DEPRECATED top-level twins still in schema: extensions, settings, devPort ("Use 'customizations/vscode/...' instead")

customizations.codespaces (devContainer.codespaces.schema.json)
  repositories  object, keys ^[a-zA-Z0-9-_.]+[.]*/[a-zA-Z0-9-_*]+[.]*$ (owner/repo, wildcard repo allowed e.g. "microsoft/*")
      .<repo>.permissions : EITHER an object of
          actions|checks|contents|deployments|discussions|issues|pages|pull_requests|repository_projects|statuses -> "read"|"write"
          packages -> "read"        workflows -> "write"
        OR the string "read-all" | "write-all"
  openFiles     array<string>  paths relative to repo root, opened in order, first activated
  disableAutomaticConfiguration  boolean default false — "Disables the setup that is automatically run in a codespace if no postCreateCommand is specified."

Other de-facto namespaces (not in the spec repo):
  customizations.jetbrains — { "backend": "...", "plugins": ["org.intellij.plugins.hcl", ...] } (JetBrains IDE docs; plugins install on the IDE backend inside the container)
  Ona/Gitpod, DevPod, CodeSandbox each publish their own; none are registered anywhere central.

========================================================================
6. DEV CONTAINER CLI
========================================================================
Install:
  curl -fsSL https://raw.githubusercontent.com/devcontainers/cli/main/scripts/install.sh | sh   (bundles Node; linux/macOS x64+arm64)
  export PATH="$HOME/.devcontainers/bin:$PATH"
  install.sh --version 0.82.0 | --prefix ~/.local/devcontainers | --update | --uninstall
  npm install -g @devcontainers/cli      (needs Python + C/C++ toolchain for node-pty)

Commands (src/spec-node/devContainersSpecCLI.ts):
  devcontainer up
  devcontainer set-up                          "Set up an existing container as a dev container"  (requires --container-id)
  devcontainer build [path]
  devcontainer run-user-commands
  devcontainer read-configuration
  devcontainer outdated
  devcontainer upgrade
  devcontainer exec <cmd> [args..]
  devcontainer features test [target]
  devcontainer features package <target>
  devcontainer features publish <target>
  devcontainer features info <mode> <feature>
  devcontainer features resolve-dependencies
  devcontainer features generate-docs
  devcontainer templates apply
  devcontainer templates publish <target>
  devcontainer templates metadata <templateId>
  devcontainer templates generate-docs
  (README still lists `stop` and `down` as NOT implemented.)

`up` flags (complete):
  --docker-path --docker-compose-path --container-data-folder --container-system-data-folder
  --workspace-folder (defaults to cwd since 0.82.0 when no --id-label/--override-config)
  --workspace-mount-consistency [consistent|cached|delegated] default cached
  --gpu-availability [all|detect|none] default detect
  --mount-workspace-git-root (default true)
  --mount-git-worktree-common-dir (default false; needs `git worktree add --relative-paths`)
  --id-label name=value (repeatable)  --config  --override-config
  --log-level [info|debug|trace]  --log-format [text|json]  --terminal-columns --terminal-rows
  --default-user-env-probe [none|loginInteractiveShell|interactiveShell|loginShell]
  --update-remote-user-uid-default [never|on|off] default on
  --remove-existing-container  --build-no-cache  --expect-existing-container
  --skip-post-create   ("Do not run onCreateCommand, updateContentCommand, postCreateCommand, postStartCommand or postAttachCommand and do not install dotfiles.")
  --skip-non-blocking-commands   (stop after waitFor / updateContentCommand)
  --prebuild   ("Stop after onCreateCommand and updateContentCommand, rerunning updateContentCommand if it has run before.")
  --user-data-folder  --mount type=<bind|volume>,source=,target=[,external=]  --remote-env name=value
  --cache-from  --cache-to  --buildkit [auto|never]
  --additional-features '<json>'   --skip-post-attach
  --dotfiles-repository --dotfiles-install-command --dotfiles-target-path (default ~/dotfiles)
  --container-session-data-folder
  --secrets-file <path to json of key/value secrets>
  --no-lockfile  --frozen-lockfile   (mutually exclusive; deprecated: --experimental-lockfile, --experimental-frozen-lockfile)
  --include-configuration  --include-merged-configuration
  hidden: --skip-feature-auto-mapping, --omit-config-remote-env-from-metadata, --omit-syntax-directive
  global OCI auth: --allow-cross-origin-auth-host <host> (repeatable), --oci-auth-hardening

`build [path]` flags:
  --user-data-folder --docker-path --docker-compose-path --workspace-folder --config
  --log-level --log-format --no-cache --image-name --cache-from --cache-to --buildkit
  --platform --push --label key=value --output (buildx --output passthrough)
  --additional-features --no-lockfile --frozen-lockfile
  hidden: --skip-feature-auto-mapping, --skip-persisting-customizations-from-features, --omit-syntax-directive, --experimental-*lockfile

`exec` flags: --container-id | --id-label | --workspace-folder, --config, --override-config,
  --mount-workspace-git-root, --mount-git-worktree-common-dir, --default-user-env-probe, --remote-env,
  --log-level/--log-format/--terminal-columns/--terminal-rows, then <cmd> [args..]

`read-configuration` flags: --include-features-configuration, --include-merged-configuration, --additional-features, plus the common set.

`run-user-commands` flags: adds --prebuild, --stop-for-personalization, --skip-post-attach, --skip-non-blocking-commands, --dotfiles-*, --secrets-file.

`outdated` flags: --workspace-folder --config --output-format [text|json] --log-level --log-format

`features test [target]`:
  -p/--project-folder (default '.'; folder with src/ and test/)
  -f/--features <list>   --filter <string>
  --global-scenarios-only   --skip-scenarios   --skip-autogenerated   --skip-duplicated
  --permit-randomization   -i/--base-image (default ubuntu:focal)   -u/--remote-user
  --preserve-test-containers   -q/--quiet   --log-level

`features package <target>` / `templates package`: -o/--output-folder (default ./output), -f/--force-clean-output-folder, --log-level. Also emits devcontainer-collection.json.
`features publish <target>` / `templates publish <target>`: -r/--registry (default ghcr.io), -n/--namespace (required, e.g. <owner>/<repo>), --log-level, plus --allow-cross-origin-auth-host / --oci-auth-hardening.
`features info <mode> <feature>`: --output-format [text|json], --log-level.
`templates apply`:
  -w/--workspace-folder (default cwd)   -t/--template-id (REQUIRED, OCI ref)
  -a/--template-args '<json>'  (default {})   -f/--features '<json>' (default [])
  --omit-paths '["...","dir/*"]' (default [])   --tmp-dir   --log-level

`up` JSON result shape: {"outcome":"success","containerId":"...","remoteUser":"vscode","remoteWorkspaceFolder":"/workspaces/<repo>"}

CI — devcontainers/ci@v0.3 (action.yml, runs on node24):
  inputs: imageName, imageTag (comma-separated, default latest), platform (comma-separated),
          runCmd, subFolder, configFile, checkoutPath (default .),
          push [never|filter|always] default filter, refFilterForPush, eventFilterForPush (default push),
          env, inheritEnv (default false), skipContainerUserIdUpdate (default false),
          userDataFolder (cache this dir with actions/cache for docker-build cache reuse),
          cacheFrom, noCache (takes precedence over cacheFrom), cacheTo,
          useNativeRunner (native multi-platform; platform must be a single value; tag suffix auto-derived linux/amd64 -> linux-amd64)
  outputs: runCmdOutput
  Patterns:
    prebuild:  imageName + cacheFrom + push: always
    CI run:    cacheFrom + push: never + runCmd: make ci-build
  Azure DevOps Task equivalent exists (docs/azure-devops-task.md). The action wraps @devcontainers/cli.

========================================================================
7. FOOTGUNS / COMMONLY GOTTEN WRONG
========================================================================
(a) onCreateCommand vs postCreateCommand in prebuilds
  - Codespaces prebuild bakes onCreateCommand + updateContentCommand ONLY. "No postCreateCommand commands are run during the creation of a prebuild."
  - So expensive dependency installs belong in onCreateCommand/updateContentCommand; anything needing user-scoped secrets/permissions belongs in postCreateCommand.
  - onCreateCommand runs once per container creation (marker keyed to createdAt) — it will NOT re-run on a rebuild-from-prebuilt-image unless the container is recreated.
  - updateContentCommand is the ONLY hook that is deliberately re-run to refresh prebuilds (`--prebuild` forces rerun=true).
  - waitFor defaults to updateContentCommand, so postCreateCommand runs in the background after the tool reports success. People assume the editor waits for it. It doesn't.
  - Dependency resolution for Features is frozen at first creation and stored in the image label; a rebuild from image will not re-resolve dependsOn/installsAfter.

(b) Bind-mount performance on macOS/Windows
  - Default workspace mount is a bind mount; VS Code docs call this out as the slow path for yarn/npm installs.
  - Fixes, in escalating order: WSL2 filesystem (Windows); "Clone Repository in Container Volume"; targeted named volume for hot dirs:
      "mounts": ["source=${localWorkspaceFolderBasename}-node_modules,target=${containerWorkspaceFolder}/node_modules,type=volume"]
    compose form:  volumes: [".:/workspace:cached", "try-node-node_modules:/workspace/node_modules"]
  - Whole-tree volume: "workspaceMount":"source=your-volume-name-here,target=/workspace,type=volume" + "workspaceFolder":"/workspace"
  - GOTCHA: named volumes mount ROOT-OWNED. Non-root remoteUser then can't write. Fix in postCreateCommand: "sudo chown node node_modules".
  - GOTCHA: workspaceMount and workspaceFolder must BOTH be set; each doc entry says "Requires <the other> be set as well".
  - GOTCHA: consistency=cached/delegated (--workspace-mount-consistency, default cached) are legacy osxfs tuning knobs and are effectively inert on modern VirtioFS/gRPC-FUSE Docker Desktop.
  - GOTCHA: Codespaces ignores bind mounts entirely except the Docker socket, so a mounts-based local optimization silently vanishes in the cloud.

(c) Feature install order
  - Default order is "determined as optimal by the implementing tool" — never assume declaration order in the `features` object.
  - installsAfter is NOT recursive, cannot carry options, cannot be version/digest-pinned, and is dropped entirely if the named feature isn't otherwise being installed. Authors routinely mistake it for a real dependency.
  - dependsOn IS recursive and DOES pull the dependency in, with options and pinning.
  - overrideFeatureInstallOrder cannot reorder past the dependency graph; entries carry no options/version; naming a feature not in the graph may be a hard error. Note the widely-copied typo `overrideFeatureInstallOrder` vs `overrideFeatureInstallOrder` — the spec repo itself had to fix "overrideFeatureInstallorder" (PR #381) and the containers.dev table currently contains a Cyrillic-О typo in one example ("overrideFeatureInstallОrder").
  - The same feature CAN be installed twice if referenced with different options (Feature Equality includes options). Features must be idempotent and must handle re-running against shared state like $PATH.
  - `devcontainer features resolve-dependencies` exists precisely to debug this.

(d) Non-root UID/GID mapping
  - updateRemoteUserUID defaults true on Linux when containerUser or remoteUser is set; the tool then BUILDS AN EXTRA IMAGE (…-uid tag) before creating the container, which surprises people watching build output and breaks naive `--image-name` assumptions.
  - CLI knob: --update-remote-user-uid-default [never|on|off]. CI Action knob: skipContainerUserIdUpdate.
  - Only relevant on Linux hosts/bind mounts; macOS/Windows Docker Desktop already translates ownership, so the common "chown everything" workaround is a Linux-only need.
  - containerUser vs remoteUser confusion: containerUser changes who the container itself runs as (ENTRYPOINT included); remoteUser only changes who the tool's processes / lifecycle scripts run as, and defaults to the container user. remoteUser is inherited from the base image's metadata, which is why an image change can silently flip the user.
  - Features see _REMOTE_USER / _CONTAINER_USER; feature authors who hardcode `vscode` or `root` break.
  - CLI 0.77.0 had to fix --uidmap/--gidmap conflicting with --userns and omit --userns=keep-id for root (Podman).

(e) docker-in-docker vs docker-outside-of-docker
  - docker-in-docker (ghcr.io/devcontainers/features/docker-in-docker): privileged:true, entrypoint /usr/local/share/docker-init.sh, two named volumes keyed by ${devcontainerId} for /var/lib/docker and /var/lib/containerd, containerEnv DOCKER_BUILDKIT=1. Real nested daemon; needs --privileged (security implication, and unavailable in many hosted/rootless environments).
  - docker-outside-of-docker (formerly docker-from-docker; legacyIds carries the old name): bind-mounts /var/run/docker.sock -> /var/run/docker-host.sock, securityOpt ["label=disable"]. Containers it starts are SIBLINGS on the host daemon, so bind-mount paths inside your dev container do NOT resolve for sibling containers — the classic "volume mounts point at the wrong filesystem" bug. Also grants effective host root via the socket.
  - Both installsAfter common-utils.
  - Codespaces ignores bind mounts EXCEPT the Docker socket — which is exactly why docker-outside-of-docker works there and dind's volume mounts are the thing that survives.
  - CLI 0.80.0 switched Podman from the `z` flag to `label=disable`.

(f) Secrets
  - devcontainer.json `secrets` is DECLARATIVE ONLY — a recommendation with description/documentationUrl. It does not supply or inject anything by itself ("Implementations _may_ inject these secrets... as environment variables").
  - Do NOT put secrets in containerEnv: it becomes Dockerfile ENV, is baked into image layers, and is visible via docker inspect / image history.
  - Do NOT rely on remoteEnv for secrecy: the reference CLI writes devcontainer.json's remoteEnv into the devcontainer.metadata image LABEL by default. Suppressing it requires the hidden --omit-config-remote-env-from-metadata.
  - The supported channel is `--secrets-file <json>` on `up` / `run-user-commands`; secrets are merged into the lifecycle-command env after remoteEnv and are passed to createLog for redaction from output.
  - Feature install.sh runs at BUILD time; anything you hand it lands in a layer.
  - build.args are visible in image history — same trap.
  - initializeCommand runs on the HOST (in the cloud for cloud services) — treat anything it touches as host-trust, and note it may run more than once per session.

(g) Miscellaneous traps
  - waitFor cannot be set to postAttachCommand (not in the enum).
  - Array-form commands do NOT go through a shell: "npm start && npm test" as an array is a single argv, not two commands.
  - Object-form commands run in PARALLEL — people write them expecting sequence.
  - portsAttributes merging is per PORT, not per attribute: a later source's port entry replaces the whole attribute object.
  - hostRequirements merges by MAX, so a feature/base image can silently raise your machine-size floor.
  - overrideCommand defaults differ (true for image/Dockerfile, false for compose); leaving it true breaks images whose real CMD must run.
  - dockerComposeFile array order matters (later overrides earlier); the .env file is read from the project root unless env_file says otherwise.
  - forwardPorts "host:port" form is unsupported in Codespaces and CodeSandbox.
  - CodeSandbox (rootless Podman) does not support portsAttributes, otherPortsAttributes, hostRequirements, or capAdd.
  - Legacy built-in feature ids (fish, maven, gradle, homebrew, jupyterlab) are deprecated in the schema — replace with ghcr.io/devcontainers/features/*.
  - Feature ids are case-insensitive and normalized to lowercase; lockfile keys are lowercased for the same reason.

========================================================================
8. RECENT / 2024–2026 CHANGES OLDER GUIDANCE MISSES
========================================================================
SPEC-level (devcontainers/spec commit log):
  2024-01-17/2024-01-10  build options (#324 / #328) -> `build.options` array and additional docker build CLI options
  2024-01-22  keywords added to devContainerFeature.schema.json
  2024-03-05  initializeCommand definition updated (#441): explicitly "including during container creation and on subsequent starts. The command may run more than once during a given session."
  2024-04-01  localEnv doc updates (#455): documented ${localEnv:VAR:default_value} and ${containerEnv:VAR:default_value} default-value syntax
  2024-07-23  customizations.codespaces.disableAutomaticConfiguration documented (#480)
  2024-08-09  Template `optionalPaths` property (#484)
  2025-01-06  dockerComposeFile doc fix (#535)
  2025-07/08  large editorial pass (no semantic change)
  2026-03     supporting-tools additions (Emacs devcontainer.el via MELPA; Ona = renamed Gitpod)
  Already-implemented proposals now folded into the spec (older guidance may still call them "proposals"): feature dependsOn/dependency graph, feature-contributed lifecycle hooks, ${devcontainerId}, GPU hostRequirements, declarative `secrets`, first-class secrets support, lockfiles, parallel (object-form) lifecycle commands, legacyIds/deprecated, _REMOTE_USER env vars.

CLI-level (devcontainers/cli CHANGELOG):
  0.89.0 (Aug 2026) opt-in OCI authentication hardening: --oci-auth-hardening, --allow-cross-origin-auth-host, auth diagnostics
  0.88.0 (Jun 2026) WSLc support
  0.87.0 (May 2026) LOCKFILES GRADUATED TO STABLE — generated by default on build and up; --no-lockfile / --frozen-lockfile added; --experimental-lockfile/--experimental-frozen-lockfile deprecated
  0.86.1 (Apr 2026) features from --additional-features are no longer written to the lockfile
  0.86.0 (Apr 2026) devcontainer.metadata label ALWAYS written as a JSON array; Windows drive letter normalized lowercase
  0.85.0 (Mar 2026) inline buildx global/target platform envvars when resolving base image and user
  0.83.0 (Feb 2026) standalone install script (bundled Node, no npm/Python/C++ toolchain needed)
  0.82.0 (Jan 2026) commands default --workspace-folder to the current directory
  0.81.0 (Jan 2026) --mount-git-worktree-common-dir (git worktree support; needs `git worktree add --relative-paths`)
  0.80.3 (Dec 2025) skip injecting dockerfile:1.4 syntax directive on Docker Engine >= 23.0.0
  0.80.0 (Jul 2025) Podman: label=disable instead of the z flag
  0.79.0 (Jun 2025) devcontainers-contrib redirected to devcontainers-extra
  0.77.0 (May 2025) Podman --uidmap/--gidmap vs --userns fixes; omit --userns=keep-id for root
  0.71.0 (Sep 2024) non-zero exit on unexpected errors; --gpu-availability option
  0.69.0 (Aug 2024) richer Template metadata cached on the OCI manifest (files, optionalPaths single-file resolution)
  0.68.0 (Aug 2024) Template optionalPaths support: `templates metadata` command, `templates apply --omit-paths`
  0.65.0 (Jun 2024) `devcontainer build --label`; prefer Docker Compose v2 over v1
  0.63.0 (Jun 2024) Feature manifest config layer changed to an EMPTY descriptor
  0.61.0/0.60.0 (May 2024) --cache-to/--cache-from on `up`; compose project name attribute support
  0.58.0 (Mar 2024) `features generate-docs` / `templates generate-docs`; SELinux label only on Linux hosts; empty remote-env values allowed
  0.56.1 (Jan 2024) hidden --omit-syntax-directive (user-namespace-remapping mitigation; slated for removal)
  0.55.0 (Dec 2023) adopt additional_contexts in compose
  New commands older docs don't mention: `devcontainer set-up` (adopt an existing container as a dev container, --container-id required), `features resolve-dependencies`, `features info`, `templates metadata`, `*/generate-docs`.
SCHEMA-level additions older docs miss: customizations.vscode.mcp (Model Context Protocol server configs), top-level `secrets`, hostRequirements.gpu object form, build.options, deprecation flags on the five legacy built-in feature ids.
CI-action additions: useNativeRunner (native multi-arch), cacheTo, noCache, platform; the action now runs on node24.
