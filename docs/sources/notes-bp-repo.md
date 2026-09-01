========================================
1. IDENTITY
========================================
Repo: https://github.com/afonsograca/devcontainers-best-practices
Owner: afonsograca (user id 4775087). Repo id 1174678617.
Default branch: main. Homepage: https://www.skills.sh/afonsograca/devcontainers-best-practices (HTTP 200)
Topics: agent-skills, ai-agents, claude, claude-code-skills, claude-skills, codespaces,
        containers-dev, dev-containers, devcontainer, devcontainer-json, devcontainers, docker, vscode
language: null | size: 41 KB | has_wiki true | has_discussions false | is_template false | archived false

GitHub `description` field, VERBATIM:
  "Agent skill for devcontainer.json, the Dev Container spec, Features, Templates & tools (VS Code, Codespaces, Cursor, Zed, Podman)."

README opening paragraph, VERBATIM:
  "An agent skill for **dev containers** — `devcontainer.json`, the Dev Container spec & schema,
   Features, Templates, and the tools that support them (VS Code, GitHub Codespaces, Cursor, Zed,
   DevPod, Podman). It teaches agents and developers **where and how** to look up the right
   reference and apply official best practices. Installable via [skills.sh](https://skills.sh/)."

README also states, VERBATIM:
  "This skill is **reference and ecosystem oriented**. For implementation patterns (Dockerfiles,
   Docker-in-Docker, env management), see the complementary [DevContainer Workflow]
   (https://github.com/ilude/claude-code-config) skill."

CLASSIFICATION: agent skill = curated reference/router documentation. NOT a template collection,
NOT an awesome-list, NOT code. Zero executable files. All content is Markdown + one JSON eval file.

========================================
2. FULL FILE / DIRECTORY TREE (from git/trees/main?recursive=1, truncated=false)
========================================
.
├── .devcontainer/
│   └── devcontainer.json                  904 B
├── .gitignore                              38 B
├── CHANGELOG.md                          1258 B
├── CODE_OF_CONDUCT.md                    5407 B   (Contributor Covenant 2.1 — not fetched in full)
├── CONTRIBUTING.md                       3396 B
├── LICENSE                               1056 B   (MIT)
├── README.md                             6333 B
└── skills/
    └── devcontainers-best-practices/
        ├── SKILL.md                     11072 B
        ├── evals/
        │   └── evals.json                4922 B
        └── references/
            ├── features.md              13934 B
            ├── schema.md                 5648 B
            ├── spec.md                   5038 B
            ├── templates.md             10618 B
            ├── tips-and-tricks.md        7760 B
            ├── tools.md                 14746 B
            └── vscode-containers.md      8191 B

Total: 8 Markdown content files + 1 evals JSON + 1 devcontainer.json + LICENSE/.gitignore.
NOTE: README's own "Repository structure" tree is WRONG — it omits vscode-containers.md,
tips-and-tricks.md and evals/ entirely.

.gitignore contents (all 3 lines):
  .DS_Store
  skills/*-workspace/
  *.skill

========================================
3. SKILL.md FRONTMATTER (verbatim structure)
========================================
---
name: devcontainers-best-practices
description: <880 characters>
license: MIT
metadata:
  author: Afonso Graça
---
Frontmatter keys present: name, description, license, metadata. No allowed-tools.
Body word count ≈ 1065 words.

description VERBATIM (880 chars):
  "Expert reference for the Dev Container ecosystem. Consult this skill whenever the user is setting
   up a dev container, configuring or debugging devcontainer.json, working in a Docker-based
   development environment, or asking about dev containers, GitHub Codespaces, DevPod, or Zed — even
   if they don't say \"devcontainer\" explicitly. Covers the full Dev Container spec, schema
   validation, tool-specific behaviors and limitations (VS Code, Cursor, Zed, Codespaces,
   CodeSandbox, Podman), Features and Templates (choosing, authoring, publishing), lifecycle scripts,
   environment variables, port forwarding, multi-container setups, and official best practices from
   containers.dev and devcontainers.github.io. Also use when the user is confused by container
   behavior that differs between tools, wants to write or publish a custom Feature, or needs to
   validate or debug a devcontainer.json."

SKILL.md section headings, in order:
  # Devcontainers Best Practices
  ## Quick start
  ## When to use this skill
  ## Canonical sources
  ## Reference files      (a table: Need -> File)
  ## Quick lookup         (numbered 1-8)
  ## Best practices (from official docs)
  ## Summary

========================================
4. THE ACTUAL BEST-PRACTICE RULES ASSERTED (VERBATIM TEXT)
========================================
--- 4a. SKILL.md "Best practices (from official docs)" — the canonical list, exactly 7 rules ---

Preamble, VERBATIM:
  "Only apply recommendations that are stated in the spec or official devcontainer documentation;
   cite the source when relevant."

RULE 1 — containerEnv over remoteEnv. VERBATIM:
  "**Environment variables**: Prefer `containerEnv` over `remoteEnv` when possible so all processes
   in the container see the variable and it is not client-specific. Use `remoteEnv` when the value is
   not static and you want to avoid rebuilding. ([Dev Container metadata reference –
   containerEnv/remoteEnv](https://containers.dev/implementors/json_reference/).)"

RULE 2 — forwardPorts over appPort. VERBATIM:
  "**Port forwarding**: In most cases use the `forwardPorts` property rather than `appPort`;
   forwarded ports behave like localhost to the application. Use `appPort` (or Docker Compose
   `ports`) when you need published/network-visible ports. ([VS Code – Forwarding or publishing a
   port](...#forwarding-or-publishing-a-port), [Dev Container metadata reference](...).)"

RULE 3 — pre-build. VERBATIM:
  "**Pre-build when possible**: Pre-building images (e.g. with Dev Container CLI or GitHub Actions)
   speeds up startup and lets you pin tool versions; image metadata can be inherited so repos need
   only a minimal `devcontainer.json`. ([VS Code – Pre-building dev container images](...),
   [containers.dev/guides](https://containers.dev/guides).)"

RULE 4 — security/trust. VERBATIM:
  "**Security and trust**: Dev container configs and images can run arbitrary commands. Only use
   configs and images from trusted sources. For sandboxing and security context, see the spec and
   community articles (e.g. [The Red Guild – Where do you run your code]
   (https://blog.theredguild.org/where-do-you-run-your-code/) with attribution)."

RULE 5 — Feature version pinning. VERBATIM:
  "**Feature versions**: To pin to a specific version, append it to the Feature ID (e.g. from the
   [versions list](https://github.com/devcontainers/features/pkgs/container/features/go/versions)).
   The `:latest` tag is applied implicitly if omitted. ([Features – containers.dev]
   (https://containers.dev/implementors/features/).)"

RULE 6 — rebuild after changes. VERBATIM:
  "**Rebuild after changes**: After changing the dev container configuration, rebuild so tools pick
   up changes (e.g. \"Dev Containers: Rebuild Container\" or \"Codespaces: Rebuild Container\" in the
   command palette, in VS Code or compatible editors such as Cursor). ([VS Code Dev Containers
   extension](https://devcontainers.github.io/supporting), [GitHub Codespaces](...).)"

RULE 7 — lifecycle script order. VERBATIM:
  "**Lifecycle script order**: Creation scripts run in this order: `onCreateCommand` →
   `updateContentCommand` → `postCreateCommand`. If one fails, later scripts are not run. ([Dev
   Container metadata reference – Lifecycle scripts](https://containers.dev/implementors/json_reference/).)"

Closing guard, VERBATIM:
  "When the spec or official docs do not state a recommendation, do not present it as a best
   practice; either omit it or phrase it as a suggestion with a clear citation."

Community/optional paragraph, VERBATIM:
  "**Optional / community guidance:** Community articles (e.g. [Daytona – Ultimate guide to dev
   containers](https://www.daytona.io/dotfiles/ultimate-guide-to-dev-containers)) suggest practices
   such as keeping images lightweight, caching dependencies, and using Docker Compose for
   multi-service setups. Use with attribution and prefer spec/official docs when they conflict."
   ^^ NOTE: this is the ONLY place "caching dependencies" or "lightweight images" appears, and it is
      explicitly demoted to unofficial. There is NO "cache X in a named volume" rule anywhere.

--- 4b. Additional prescriptive rules scattered in references/ ---

FEATURES (references/features.md):
  R8  Reference official Features via OCI: "Format: `ghcr.io/devcontainers/features/<feature-name>:<version>`
      Example: `ghcr.io/devcontainers/features/go:1`, `ghcr.io/devcontainers/features/docker-in-docker:1`"
  R9  VERBATIM QUOTE from devcontainers/features README (verified accurate against live README line 46):
      "Features follow semantic versioning conventions, so you can pin to a major version `:1`,
       minor version `:1.0`, or patch version `:1.0.0` by specifying the appropriate label."
  R10 "the **`:latest` version annotation is added implicitly if omitted**."
  R11 Feature options are typed boolean|string, with `default`, and for string either `enum`
      (allowed values only) or `proposals` (suggested; "the installation script can handle arbitrary
      values provided by the user").
  R12 devcontainer-feature.json REQUIRED properties: `id` (must match directory name) and `version` (semver).
      Quoted: "The id should be unique in the context of the repository/published package where the
      feature exists and must match the name of the directory where the devcontainer-feature.json resides."
  R13 dependsOn = hard dependency; installsAfter = soft dependency. VERBATIM schema quotes:
      dependsOn: "An object of Feature dependencies that must be satisfied before this Feature is
                  installed. Elements follow the same semantics of the features object in devcontainer.json."
      installsAfter: "Array of ID's of Features that should execute before this one. Allows control for
                  feature authors on soft dependencies between different Features."
  R14 "If **`overrideFeatureInstallOrder`** is inconsistent with the dependency graph, the
      implementing tool **should fail** the dependency resolution step."
  R15 Round-based install algorithm: build graph → roundPriority (default 0) → round-based sorting,
      commit only max-roundPriority nodes per round, Round Stable Sort tiebreak (option values
      lexicographically, then option keys, then number of user-defined options); "If a round adds no
      nodes to the installation order, the tool must **fail** (e.g. circular dependency)."
  R16 "before round-based installation, tools should remove any `installsAfter` edge that does not
      correspond to a Feature in the set to be installed."
  R17 Official repo layout: `src/<feature-name>/` with devcontainer-feature.json + install.sh;
      `test/` mirrors src/ with test.sh per Feature.
  R18 Features distribution: "`namespace` is a unique identifier for the collection of Features;
      there are no strict rules, but one pattern is to set it equal to the source repository's `/`."
      (sic — the "owner/repo" got mangled to "`/`")

FEATURE AUTHORING rules (references/features.md "Authoring Features"):
  R19 TESTING: "Use **`devcontainer features test`** ... Use the `--base-image` flag or [scenarios]
      ... to validate against multiple base images."
  R20 IDEMPOTENCY, VERBATIM: "Design Features to be **idempotent**: they may be installed multiple
      times with different options (e.g. when other Features depend on them). For versioned tools
      (e.g. Go, Ruby), support installing multiple versions—use a version manager (SDKMAN, rvm) when
      available, or install each version to a known location and symlink the active one. Expose the
      tool on PATH via **`containerEnv`** in `devcontainer-feature.json`, e.g.
      `\"PATH\": \"/usr/local/myTool/bin:${PATH}\"`."
  R21 OS DETECTION, VERBATIM: "**Detect OS/distro:** Many Features target a subset of base images
      (e.g. Debian/Ubuntu). Source `/etc/os-release`, check the distro/codename, and **exit with a
      clear error** if the OS is not supported so users know which base image to use."
  R22 NON-ROOT (authoring only), VERBATIM: "**Non-root user:** Installation runs as root; the
      container may use a non-root `remoteUser`. Use the injected env vars **`_REMOTE_USER`** and
      **`_REMOTE_USER_HOME`** (see [Features spec – user env var]
      (https://containers.dev/implementors/features/#user-env-var)) when installing into the user's
      home or setting ownership."
      ^^ This is the ONLY non-root guidance in the whole skill, and it is scoped to FEATURE AUTHORS,
         not to devcontainer.json authors. There is NO "set a non-root remoteUser" rule.
  R23 REDUNDANT INSTALL PATHS, VERBATIM: "**Redundant install paths:** Upstream URLs or package
      sources can change. Prefer multiple install strategies (e.g. package manager first, then
      GitHub release fallback) and add scenario tests that exercise different paths."

TEMPLATES (references/templates.md):
  R24 "**the `options` must be unique for every `devcontainer-template.json`**"
  R25 Templates versioned by `version` in devcontainer-template.json, per semver.
  R26 OCI ref format: `ghcr.io/devcontainers/templates/<template-name>:<version>`
      e.g. `ghcr.io/devcontainers/templates/python:6.0.0`, `.../docker-in-docker:1.3.2`
  R27 VERBATIM: "the **`namespace`** is a unique identifier for the collection of Templates and
      **must be different than the collection of Features**... **Templates and Features should be
      placed in different git repositories**"
  R28 Template layout: `src/<template-id>/` REQUIRED: devcontainer-template.json +
      .devcontainer/devcontainer.json; OPTIONAL: .devcontainer/Dockerfile; test/ with test.sh.
  R29 To get listed on containers.dev/templates: PR the collection into
      https://github.com/devcontainers/devcontainers.github.io/blob/gh-pages/_data/collection-index.yml
  R30 Template vs Feature vs Dockerfile table (skill explicitly refuses to prescribe):
      "The spec does not prescribe when to choose a Template vs a Feature vs a custom Dockerfile."
      Template = "packaged set of source files that encode a **complete** dev container configuration"
      Feature  = "modular, reusable component that adds specific tools or capabilities to an existing base image"
      Dockerfile = "used when you need full control over the image build and layers; can be combined with Features"

PODMAN / runArgs (references/tools.md) — the strongest single actionable rule in the repo:
  R31 VERBATIM: "`runArgs` in `devcontainer.json` is applied regardless of whether the runtime is
      Docker or Podman. There is no way to make `runArgs` conditional on the runtime in the config
      file itself. **Podman rootless** often requires extra arguments (e.g. `--userns=keep-id`,
      `--security-opt=label=disable`) that **Docker does not support**; using those in `runArgs` will
      break Docker and services like GitHub Codespaces."
      Workaround VERBATIM: "Use a **shim script** that invokes Podman and adds the extra args only
      when the command is `run`. Set the script path in user settings as
      **`dev.containers.dockerPath`**. The script can check for `podman run` and prepend options like
      `--userns=keep-id` before forwarding all arguments."
      Cited to https://github.com/orgs/devcontainers/discussions/149

CROSS-PLATFORM (references/tools.md):
  R32 "Use **multi-platform base images** when possible"
  R33 "**Volume paths** differ between Windows and Linux; prefer relative paths or paths that are
      consistent inside the container."
  R34 "**Scripts** run inside the container (Linux), so `uname` and similar reflect the container OS,
      not the host."
  R35 "**Test on both platforms** (and in CI if applicable)"

MULTI-CONTAINER (references/tools.md):
  R36 "VS Code allows **one container per window**."
  R37 "**Docker Compose:** Define multiple services in one `docker-compose.yml`. Create **one
      `devcontainer.json` per service**, each referencing the same Compose file and setting
      **`service`** to the desired service name. Use **`workspaceFolder`** so each config opens the
      right subfolder (e.g. `/workspaces/project-b-node-js` when the repo root is mounted at `/workspaces`)."
  R38 "**Layout:** A common pattern is `.devcontainer/<project>/devcontainer.json` with a shared
      `.devcontainer/docker-compose.yml`."
  R39 "**Shutdown behavior:** Set **`shutdownAction`: `\"none\"`** in each `devcontainer.json` so
      closing one window does not stop the other services."
  R40 "**GitHub Codespaces** lists all `devcontainer.json` files under `.devcontainer/` (including in
      subfolders) in the configuration dropdown when creating a codespace."

VS CODE (references/vscode-containers.md):
  R41 Extensions opt-out: "Prefix an extension ID with `-` (e.g. `\"-dbaeumer.vscode-eslint\"`) to
      avoid installing an extension that a base image or Feature adds."
  R42 `dev.containers.defaultExtensions` user setting installs extensions in every dev container.
  R43 Dotfiles user settings: `dotfiles.repository`, `dotfiles.targetPath`, `dotfiles.installCommand`
  R44 Alpine warning: "Alpine images can cause issues with some extensions due to `glibc`
      dependencies in native code."
  R45 Known limitations list: Windows container images unsupported; all roots in a multi-root
      workspace open in the same container; Ubuntu Docker snap unsupported; Docker Toolbox on
      Windows unsupported; Alpine glibc issues.
  R46 Host requirements: Windows Docker Desktop 2.0+ (Win10 Pro/Ent); Win10 Home 2004+ needs Docker
      Desktop 2.3+ w/ WSL2; macOS Docker Desktop 2.0+; Linux Docker CE/EE 18.06+ & Compose 1.21+;
      remote hosts ≥2 GB RAM / 2 cores. Containers: x86_64/ARM Debian 9+, Ubuntu 16.04+,
      CentOS/RHEL 7+, Alpine 3.9+.
  R47 Three quick-start workflows: try a sample; Open Folder in Container (bind mount);
      Clone Repository in Container Volume (isolated Docker volume, better perf on Win/macOS).

TIPS & TRICKS (references/tips-and-tricks.md):
  R48 Line endings: "Use a `.gitattributes` file (e.g. `* text=auto eol=lf`) or `git config core.autocrlf`"
  R49 SSH key with passphrase hangs VS Code push/sync → "Use an SSH key without a passphrase, use
      HTTPS, or run `git push` from the terminal."
  R50 Persist user profile via volume mounts, VERBATIM JSON:
      "mounts": [
          "source=profile,target=/root,type=volume",
          "target=/root/.vscode-server,type=volume"
      ]
      + "Adjust paths if you use a non-root `remoteUser`."
      ^^ This is the closest thing to a "cache in a named volume" rule, and it is about SHELL HISTORY
         / user profile persistence, not dependency caches.
  R51 Cleanup commands: `docker ps -a`, `docker rm <id>`, `docker image prune`,
      `docker ps -a --filter="label=vsch.quality" --format "table {{.ID}}\t{{.Status}}\t{{.Image}}\t..."`,
      `docker-compose down`, `docker system prune --all`
  R52 Remote Docker host over SSH tunnel: set `DOCKER_HOST=tcp://localhost:<port>` and
      `containers.environment` in settings.
  R53 Copilot in-container instructions: `customizations.vscode.settings` with
      `github.copilot.chat.codeGeneration.instructions`, or a `copilot-instructions.md` file.
  R54 Reporting issues: "Dev Containers: Show Container Log"; Output → "Log (Remote Extension Host)".

SPEC/SCHEMA (references/spec.md, references/schema.md):
  R55 Lifecycle: creation order onCreate → updateContent → postCreate (inside container, first time);
      initializeCommand runs ON THE HOST; postStartCommand on each start; postAttachCommand on each attach.
  R56 "If one lifecycle script fails, any subsequent scripts are not executed."
  R57 Object form of lifecycle commands enables parallel execution (containers.dev/implementors/spec/#parallel-exec).
  R58 Merge: properties marked 🏷️ can live in the `devcontainer.metadata` container image label,
      an array of JSON snippets auto-merged with devcontainer.json at container creation.
  R59 Use the REFERENCE for human docs/intent; use the SCHEMA for validation and tooling.
  R60 Add a `$schema` property to devcontainer.json pointing at the canonical schema URL for editor
      validation and IntelliSense.
  R61 Validate with the CLI: `devcontainer read-configuration`, `devcontainer build`, `devcontainer up`;
      install via `npm install -g @devcontainers/cli`.
  R62 Canonical schema URLs cited (both verified HTTP 200):
      base: https://github.com/devcontainers/spec/blob/main/schemas/devContainer.base.schema.json
      main: https://github.com/devcontainers/spec/blob/main/schemas/devContainer.schema.json

========================================
5. TOOL-SPECIFIC LIMITATION TABLES REPRODUCED BY THE SKILL (references/tools.md)
========================================
VS Code Dev Containers extension — "Not yet supported when using Clone Repository in Container Volume":
  workspaceMount, workspaceFolder, ${localWorkspaceFolder}, ${localWorkspaceFolderBasename}
  [VERIFIED still accurate against live containers.dev/supporting]

GitHub Codespaces:
  mounts — "Codespaces ignores \"bind\" mounts except the Docker socket. Volume mounts are still allowed."
  forwardPorts / portsAttributes — "does not yet support the \"host:port\" variation"
  shutdownAction — "Does not apply to Codespaces."
  ${localEnv:VARIABLE_NAME} — "the host is in the cloud rather than your local machine"
  customizations.codespaces, hostRequirements — "reads from devcontainer.json, not image metadata"
  [VERIFIED accurate against live containers.dev/supporting]
  Codespaces product-specific props: `repositories`, `permissions`, `openFiles`

CodeSandbox:
  forwardPorts — not needed; all ports auto-mapped to a public URL
  portsAttributes / otherPortsAttributes / hostRequirements — not yet supported
  remoteUser — "CodeSandbox currently ignores this and overrides as `root`; rootless Podman is used."
  shutdownAction — does not apply
  capAdd — not supported; containers run as non-root
  features — docker-cli auto-added + host socket; docker-in-docker / docker-outside-of-docker differ
  ${localEnv:...} — host is in the cloud
  [VERIFIED accurate against live containers.dev/supporting]

Zed:
  forwardPorts — "Not yet supported; only `appPort` is supported for port forwarding."
  portsAttributes — "Not yet implemented."
  "Zed follows the core Dev Container Specification, but does not manage extensions separately for
   container environments—the host's extensions are used as-is."
  "Configuration changes to `devcontainer.json` do not trigger automatic rebuilds"
  [*** OUTDATED — see gaps section 8 ***]

========================================
6. CANONICAL SOURCES THE SKILL CITES (all verified reachable)
========================================
containers.dev/implementors/spec/          200
containers.dev/implementors/json_reference/ 200
containers.dev/implementors/json_schema/   200
containers.dev/implementors/reference/     (cited)
containers.dev/implementors/features/      (cited)
containers.dev/implementors/features-distribution/  200
containers.dev/implementors/templates/     (cited)
containers.dev/implementors/templates-distribution/ 200
containers.dev/guides                      (cited)
containers.dev/guide/feature-authoring-best-practices 200
containers.dev/features , containers.dev/templates , containers.dev/collections
devcontainers.github.io/supporting         200 (same content as containers.dev/supporting)
github.com/devcontainers/{spec,features,templates,cli,feature-starter,template-starter}
code.visualstudio.com/docs/devcontainers/{containers,tips-and-tricks}
code.visualstudio.com/remote/advancedcontainers/overview
zed.dev/docs/dev-containers
github.com/orgs/devcontainers/discussions/149
chris-ayers.com/posts/stir-trek-and-multiple-dev-containers/
blog.theredguild.org/where-do-you-run-your-code/
daytona.io/dotfiles/ultimate-guide-to-dev-containers

========================================
7. LICENCE / FRESHNESS / STARS / MAINTENANCE
========================================
Licence:      MIT (spdx MIT). LICENSE line 3 reads exactly "Copyright (c) 2025" — NO holder name,
              and the year predates the repo's own first commit (2026-03-06).
Created:      2026-03-06T18:03:46Z
Last commit:  2026-05-30T10:31:08Z   (pushed_at 2026-05-30T10:35:58Z; updated_at 2026-05-30T10:36:01Z)
Age of HEAD:  ~3 months stale as of 2026-08-31
Stars:        1
Forks:        0
Watchers/subscribers: 0
Open issues:  0
Contributors: 1  (afonsograca, 8 commits — 100% single-author)
Branches:     main only
Tags:         NONE (empty array)
Releases:     NONE (empty array)

FULL COMMIT LOG (8 commits, all by "Afonso", gitmoji + conventional commits):
  2026-05-30T10:31:08Z  :mag: (skill): add common dev container task phrasings to description
  2026-05-30T10:22:14Z  :see_no_evil: (repo): ignore packaged .skill build artifacts
  2026-05-30T10:21:48Z  :white_check_mark: (evals): add grading assertions and Podman runArgs eval
  2026-05-30T10:21:47Z  :mag: (skill): expand description and README for discoverability
  2026-05-21T10:39:45Z  :construction_worker: (devcontainer): add dev container configuration
  2026-05-21T10:39:11Z  :white_check_mark: (evals): add skill evals and gitignore workspace artifacts
  2026-03-06T18:02:02Z  :sparkles: (skills): add initial devcontainers-best-practices skill with reference docs
  2026-03-06T11:37:47Z  :tada: (repo): initial project setup

CHANGELOG.md claims "## [0.1.0] - 2025-03-06" and links to a release tag v0.1.0 that DOES NOT EXIST.
=> README's shields.io "GitHub release (latest SemVer)" badge is broken.
=> CONTRIBUTING documents a tag-based manual release process that has never been exercised.

CONTRIBUTING.md notable policies:
  - Trunk-based development, single protected `main`, PRs required, conventional commits, gitmoji encouraged.
  - "Releases are manual." "This skill is distributed via **GitHub only**... there is no npm package to publish."
  - Liberal ownership model: "If you get a merged pull request... you are eligible for push access."
  - Adapted from Moya's contributors guide; ends with a :skateboard: Van Halen contract-rider easter egg.
CODE_OF_CONDUCT.md: Contributor Covenant 2.1 (5407 B, standard).

MAINTENANCE VERDICT: hobby/solo project, ~3 months idle, no releases, no external contributors,
essentially zero community adoption (1 star). Discovery is via skills.sh listing, not GitHub.

========================================
8. GAPS, ERRORS, OUTDATED ADVICE vs. CURRENT SPEC
========================================
--- 8a. OUTDATED (verified against live upstream today) ---
G1 ZED EXTENSIONS CLAIM IS NOW WRONG. tools.md: "Zed... does not manage extensions separately for
   container environments—the host's extensions are used as-is." Live zed.dev/docs/dev-containers now
   documents `customizations.zed.extensions`:
     { "customizations": { "zed": { "extensions": ["vue", "ruby"] }, "vscode": {...}, "codespaces": {...} } }
   (with the caveat "extensions load for the Zed session, so these extensions will exist on your
   local Zed instances as well").
G2 ZED PORT LIMITATIONS LIKELY STALE. tools.md asserts forwardPorts "Not yet supported; only
   `appPort` is supported" and portsAttributes "Not yet implemented." The live Zed docs' "Known
   Limitations" section now lists ONLY: "Configuration changes: Updates to devcontainer.json do not
   trigger automatic rebuilds or reloads." No ports table remains.
G3 ZED SETTINGS OMITTED. Live Zed docs document `use_podman: true` (required when using podman) and
   `dev_container_use_buildkit: false` (for engines lacking integrated BuildKit, e.g. Apple Container
   via a Docker-API bridge). Neither appears in the skill.

--- 8b. MISSING SPEC SURFACE (0 grep hits across all 8 skill files) ---
G4  `waitFor` — documented on containers.dev json_reference AND in devContainer.base.schema.json.
    Schema enum: [initializeCommand, onCreateCommand, updateContentCommand, postCreateCommand,
    postStartCommand]; "The user command to wait for before continuing execution in the background
    while the UI is starting up. The default is \"updateContentCommand\"."
    This is a glaring omission because the skill has a dedicated lifecycle-ordering rule (RULE 7).
G5  `secrets` — present in devContainer.base.schema.json (/definitions/devContainerCommon/properties/secrets):
    "Recommended secrets for this dev container. Recommendations are provided as environment variable
    keys with optional metadata." patternProperties ^[a-zA-Z_][a-zA-Z0-9_]*$ with sub-props
    `description` and `documentationUrl`. NOT on the containers.dev json_reference page — so the
    omission is arguably defensible under the skill's own "only official docs" rule, but it means the
    skill will mislead anyone asking "how do I declare secrets in devcontainer.json?".
G6  `containerUser` — json_reference: "Overrides the user for all operations run as inside the
    container. Defaults to either root or the last USER instruction in the related Dockerfile."
G7  `updateRemoteUserUID` — "On Linux, if containerUser or remoteUser is specified, the user's
    UID/GID will be updated to match the local user's UID/GID to avoid permission problems with bind
    mounts. Defaults to true." (Directly relevant to the Podman/permission scenario in eval #2, and absent.)
G8  `userEnvProbe` — enum none|interactiveShell|loginShell|loginInteractiveShell (default
    loginInteractiveShell). Common source of "my PATH is wrong in the container" confusion.
G9  `overrideCommand` — "Defaults to true for when using an image Dockerfile and false when
    referencing a Docker Compose file."
G10 `${devcontainerId}` variable — "Allow Features to refer to an identifier that is unique to the
    dev container they are installed into and that is stable across rebuilds."
G11 `hostRequirements` — appears ONLY in the tools.md limitation tables (as a thing Codespaces/
    CodeSandbox handle specially); never explained as a property (cpus/memory/storage/gpu).
G12 `build.cacheFrom`, `build.target`, `build.options` — never mentioned; cacheFrom is the actual
    spec-level answer to "how do I cache my image build", which the skill instead punts to a Daytona
    blog post under "community guidance".
G13 Port attribute options (label, protocol, onAutoForward, requireLocalPort, elevateIfNeeded) —
    named only as "portsAttributes" with no option list.
G14 Emacs is missing from tools.md Editors, though it IS on the live official supporting page:
    "GNU Emacs can make use of dev containers using the community extension devcontainer.el...
     available by the popular package registry MELPA."

--- 8c. INTERNAL ERRORS / INCONSISTENCIES ---
G15 README advertises best practices that SKILL.md does not contain: "Use Features when possible,
    pin versions, non-root user, prefer official Features/templates for common stacks." Only
    "pin versions" is an actual asserted rule. Non-root remoteUser is NEVER asserted as a rule.
G16 README's "Repository structure" tree omits vscode-containers.md, tips-and-tricks.md, evals/.
G17 CHANGELOG date 2025-03-06 vs. actual first commit 2026-03-06 (off by a year).
G18 CHANGELOG links a v0.1.0 release tag that doesn't exist; README version badge is broken.
G19 LICENSE has no copyright holder and the wrong year.
G20 features.md mangles the distribution-spec quote: "set it equal to the source repository's `/`"
    — the "owner/repo" was eaten (templates.md renders the same sentence correctly as "`owner/repo`").
G21 SOURCING: tools.md attributes Cursor/Antigravity support to the official supporting page, which
    names neither. Live page says only "the Dev Containers extension and GitHub Codespaces support
    these VS Code properties." Same for RULE 6's citation of devcontainers.github.io/supporting for a
    Cursor claim. This violates the skill's own stated citation discipline.
G22 SELF-CONTRADICTION: the Quick-start example uses the floating tag
    `mcr.microsoft.com/devcontainers/base:ubuntu` in a skill whose flagship rule is version pinning.
G23 The repo's own .devcontainer/devcontainer.json sets no `remoteUser`/`containerUser` while
    hard-coding `/home/vscode/...` mount targets.

--- 8d. STRUCTURAL / DESIGN CRITIQUE ---
G24 It is a ROUTER, not a rules engine. Roughly 60-70% of the content is link tables ("Related
    pages", "Canonical URLs"). An agent without network access gets very little actionable
    prescription out of it — for many questions the answer it produces is a URL.
G25 No worked examples beyond ~2 tiny JSON snippets. No full annotated devcontainer.json, no
    Dockerfile example, no docker-compose.yml example, no Feature install.sh example. The README
    itself concedes this and delegates implementation patterns to a third-party skill
    (github.com/ilude/claude-code-config).
G26 Heavy VS-Code centrism: two of the eight files (vscode-containers.md, tips-and-tricks.md,
    ~16 KB of 76 KB) are summaries of code.visualstudio.com docs, and many "best practices" cite
    VS Code docs rather than the spec.
G27 Duplication: forwardPorts-vs-appPort, prebuild/image-metadata, merge logic and shutdownAction
    each appear in 2-3 files with slightly different wording.

========================================
9. EVALS (skills/devcontainers-best-practices/evals/evals.json)
========================================
skill_name: "devcontainers-best-practices". 3 evals. Every assertion has "passed": null and
"evidence": null — never executed/recorded in-repo. No "files" fixtures (all empty arrays).

EVAL 1 prompt: "Should I use `containerEnv` or `remoteEnv` for my `DATABASE_URL` in devcontainer.json?
  The URL doesn't change, it's just different per developer."
  assertions: recommends-containerenv | explains-all-processes | explains-remoteenv-use-case | cites-reference
EVAL 2 prompt: "I use Podman (rootless) on my Linux laptop and added `--userns=keep-id` and
  `--security-opt=label=disable` to `runArgs`... teammates on Docker Desktop (Mac and Windows) get
  errors... How do I make devcontainer.json work for both runtimes?"
  assertions: explains-runargs-unconditional | recommends-shim-script |
              does-not-recommend-two-configs-as-primary | cites-source
EVAL 3 prompt: "I want to write a custom dev container Feature that installs our internal CLI tool
  from a private GitHub release. What are the key things I need to get right in
  `devcontainer-feature.json` and `install.sh`?"
  assertions: devcontainer-feature-json-fields | os-detection-in-install-sh | remote-user-env-var |
              idempotency | private-release-auth | points-to-authoring-guide
  NOTE: assertion "private-release-auth" has NO backing content in the skill — features.md never
  covers auth/token strategy for private release downloads. This eval is designed to fail on its own corpus.

========================================
10. THE REPO'S OWN .devcontainer/devcontainer.json (verbatim, 904 B)
========================================
{
  "name": "Dev containers best practices",
  "image": "mcr.microsoft.com/devcontainers/base:bookworm",
  "initializeCommand": "mkdir -p ${localEnv:HOME}/.pi ${localEnv:HOME}/.claude",
  "mounts": [
    "source=${localEnv:HOME}/.pi,target=/home/vscode/.pi,type=bind,consistency=cached",
    "source=${localEnv:HOME}/.claude,target=/home/vscode/.claude,type=bind,consistency=cached"
  ],
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "configureZshAsDefaultShell": true
    },
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers-extra/features/mise:1": {},
    "ghcr.io/devcontainers-extra/features/claude-code:2": {}
  },
  "customizations": {
    "vscode": {
      "settings": { "terminal.integrated.defaultProfile.linux": "zsh" }
    }
  },
  "postCreateCommand": "mise install 2>/dev/null || true"
}
Observations: uses major-version-pinned Features (consistent with its own R9); binds host ~/.claude
and ~/.pi into the container (a Claude Code / "pi" agent workflow — reinforces the agent-host read);
no remoteUser declared despite hard-coded /home/vscode targets.

========================================
11. BOTTOM LINE FOR DOWNSTREAM CONSUMERS
========================================
- If you want a CORPUS OF CONCRETE DEVCONTAINER RULES (pin feature versions, non-root remoteUser,
  cache deps in named volumes, use build.cacheFrom, set waitFor, use updateRemoteUserUID), this repo
  is NOT it. It asserts 7 official best practices, and "non-root remoteUser" and "named-volume
  caching" are not among them despite the README implying otherwise.
- What it IS genuinely good at: (a) an accurate, well-quoted map of the containers.dev URL space;
  (b) the Feature dependency/install-order algorithm summary; (c) the Feature-authoring checklist
  (idempotency, OS detection, _REMOTE_USER, redundant install paths); (d) the Podman-vs-Docker
  runArgs shim workaround, which is a real, hard-won answer not easily found in the official docs;
  (e) the per-tool limitation tables for Codespaces and CodeSandbox (still accurate).
- Its epistemic discipline ("do not present unofficial advice as best practice") is its most
  distinctive and reusable trait — worth stealing even if the content is not.
- Freshness/adoption risk is high: 1 star, 1 contributor, no releases, ~3 months idle, and at least
  one already-outdated tool section (Zed).
