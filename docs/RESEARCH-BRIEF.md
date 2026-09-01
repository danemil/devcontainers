# BRIEF — verified ground truth (2026-08-31)

All claims below were produced by 5 research agents and adversarially fact-checked.
Full notes: notes-bp-repo.md, notes-spec.md, notes-copilot.md, notes-claude.md, notes-prior-art.md
Cached primary sources in this same directory: base.json (devContainer.base.schema.json), jsonref.md,
sp-*.md (spec proposals), cli-readme.md, cli-changelog.md, devContainersSpecCLI.ts, gh-rc.md,
settings-reference.md, hooks.md, plugins-reference.md, permissions.md, mcp.md, memory.md, commands.md, sup.md.

## 1. The subject repo: afonsograca/devcontainers-best-practices

- It is an AGENT SKILL, not a template collection. 8 Markdown files + evals/evals.json. Zero executable code. 41 KB.
- Self-described as a POINTER/ROUTER skill: "guides you to the right documentation and references".
  It deliberately refuses to assert unofficial best practices ("When the spec or official docs do not
  state a recommendation, do not present it as a best practice").
- Tree: SKILL.md, references/{spec,schema,tools,features,templates,vscode-containers,tips-and-tricks}.md, evals/evals.json.
- Its "Best practices (from official docs)" section has EXACTLY SEVEN rules: containerEnv-over-remoteEnv;
  forwardPorts-over-appPort; pre-build when possible; security/trust of configs+images; Feature version
  pinning; rebuild after changes; lifecycle script order.
- NOT stated anywhere despite the README claiming them: "use Features when possible", "non-root user",
  "prefer official Features/templates". README overstates the SKILL.md.
- Distribution: skills.sh (`npx skills add afonsograca/devcontainers-best-practices`), Anthropic-style
  SKILL.md format. Topics include claude-code-skills. NOT written for Copilot (Copilot appears only as
  subject matter: how to configure Copilot inside a devcontainer).
- Health: MIT but LICENSE has no copyright holder name. 1 star, 0 forks, 1 contributor, 8 commits,
  ZERO releases and ZERO tags. Created 2026-03-06, last commit 2026-05-30 (~3 months stale).
  CHANGELOG claims a v0.1.0 release tag that does not exist -> README version badge is broken.
- Known factual drift: references/tools.md says Zed lacks forwardPorts/portsAttributes and cannot manage
  container extensions. Current zed.dev docs contradict the extensions claim (customizations.zed.extensions exists).
- Real gaps vs spec: never mentions `waitFor`, `secrets`, lockfiles, feature dependency resolution semantics,
  image metadata merge rules, updateRemoteUserUID.
- VERDICT: good discipline (cite-the-spec), thin content, unmaintained, zero execution capability.

## 2. containers.dev spec — the facts that matter for tooling

- Config discovery precedence: .devcontainer/devcontainer.json > .devcontainer.json > .devcontainer/<folder>/devcontainer.json (one level).
- Schema: devContainer.base.schema.json (JSON Schema draft 2019-09, `unevaluatedProperties: false`,
  top-level oneOf). devContainer.schema.json is a 447-byte allOf stub $ref-ing two UNVERSIONED
  microsoft/vscode `main`-branch schemas. Naive validators (draft-07 ajv default, old python jsonschema)
  will NOT work. Registered with SchemaStore -> editor-only validation is what most teams get today.
- `secrets` is in the base schema but NOT on the containers.dev json_reference page. Declarative only.
- `waitFor` enum: [initializeCommand, onCreateCommand, updateContentCommand, postCreateCommand, postStartCommand].
  Default updateContentCommand. postAttachCommand is NOT a legal value.
- Lifecycle: initializeCommand (HOST, only host hook, NOT available to Features) -> onCreateCommand ->
  updateContentCommand -> postCreateCommand -> postStartCommand -> postAttachCommand.
  Re-run gated by marker files: onCreate/updateContent/postCreate keyed to createdAt; postStart keyed to
  startedAt; postAttach ALWAYS runs.
- Prebuilds: `--prebuild` stops after updateContentCommand and re-runs it. In Codespaces prebuilds,
  onCreate + updateContent are baked into the snapshot; postCreate is NOT. => expensive work belongs in
  onCreate/updateContent, not postCreate. This is the single highest-value non-obvious rule.
- Feature-contributed lifecycle commands always run BEFORE the user's command for the same hook.
- Feature install order: round-based topological sort over dependsOn (hard, recursive, version-pinnable)
  and installsAfter (soft, non-recursive). overrideFeatureInstallOrder only sets roundPriority and can
  NEVER violate the dependency graph. Dependency resolution happens ONLY at initial creation from
  devcontainer.json — rebuilds from an image freeze resolved deps into the devcontainer.metadata label.
- Two Features with different options are DIFFERENT features and both install -> features must be idempotent.
- Version pinning: publishers push tags 1, 1.2, 1.2.3, latest; consumers may pin any tag or an immutable
  @sha256: digest. Omitting a tag means :latest.
- Lockfiles: graduated experimental -> STABLE in CLI 0.87.0 (May 2026), written by default on build/up.
  File is devcontainer-lock.json beside devcontainer.json. Local + deprecated GitHub-Release features not recorded.
- customizations namespace is intentionally OPEN — any tool may claim a subproperty; no registry, no schema
  constraint. customizations.vscode keys: extensions, settings, mcp, devPort. Top-level extensions/settings/
  devPort are DEPRECATED. customizations.codespaces: repositories, openFiles, disableAutomaticConfiguration.
- Codespaces reads customizations.codespaces + hostRequirements from devcontainer.json ONLY (not the image
  label); ignores bind mounts except the docker socket; no "host:port" forwardPorts form; shutdownAction N/A.
- ${devcontainerId} substitutable only in a fixed property list; NOT in image-build inputs.
- Image metadata merge rules are property-specific (init/privileged: any-true; capAdd/securityOpt: union;
  lifecycle commands: collected list; mounts: collected, last source wins; remoteEnv/containerEnv: per-var
  last wins; hostRequirements: max wins; waitFor/remoteUser/etc: last wins).
- NOT label-storable: initializeCommand, image, build.*, dockerComposeFile, service, runServices, appPort,
  runArgs, workspaceMount, workspaceFolder, features, overrideFeatureInstallOrder.
- SECRETS FOOTGUN: the CLI writes remoteEnv from devcontainer.json into the image metadata label by default.
  Real secrets belong in --secrets-file (redacted from logs), not remoteEnv/containerEnv.
- macOS/Windows bind-mount perf: sanctioned fixes are a named volume for hot dirs
  (source=${localWorkspaceFolderBasename}-node_modules,target=...,type=volume) or workspaceMount+workspaceFolder
  into a volume. Named volumes come up ROOT-OWNED -> need a chown in postCreateCommand.
- updateRemoteUserUID defaults true on Linux when containerUser/remoteUser is set; builds an extra `…-uid`
  derived image. CI Action exposes skipContainerUserIdUpdate.
- docker-in-docker: privileged:true + named volumes for /var/lib/docker,/var/lib/containerd keyed by
  ${devcontainerId}. docker-outside-of-docker: bind-mounts the host socket + securityOpt label=disable.
- CLI commands: up, set-up, build, run-user-commands, read-configuration, outdated, upgrade, exec,
  features {test,package,publish,info,resolve-dependencies,generate-docs}, templates {apply,publish,metadata,generate-docs}.
  `stop`/`down` listed as not implemented.
- devcontainers/ci@v0.3 inputs: imageName, imageTag, platform, runCmd, subFolder, configFile, checkoutPath,
  push (never|filter|always), refFilterForPush, eventFilterForPush, env, inheritEnv, skipContainerUserIdUpdate,
  userDataFolder, cacheFrom, noCache, cacheTo, useNativeRunner.
- 2024-2026 additions older guidance misses: Template optionalPaths; customizations.codespaces.
  disableAutomaticConfiguration; build.options; ${localEnv:VAR:default} / ${containerEnv:VAR:default};
  GPU hostRequirement object form; declarative secrets; STABLE lockfiles (2026); OCI auth hardening
  (--oci-auth-hardening, 0.89.0 Aug 2026); `devcontainer set-up`; devcontainer.metadata always a JSON array (0.86.0).
- Deprecated but still present: legacy feature ids (fish, maven, gradle, homebrew, jupyterlab); top-level
  dockerFile+context; appPort; GitHub-Release feature distribution (unsupported inside dependsOn).

## 3. GitHub Copilot extensibility (2026) — THE PIVOTAL FACT

**Copilot supports Anthropic-style SKILL.md Agent Skills, GA since 2025-12-18**, described as an open
standard following the Agent Skills specification, explicitly interoperable with anthropics/skills.

- Skill directories — Project: `.github/skills/`, `.claude/skills/`, `.agents/skills/`.
  Personal: `~/.copilot/skills/`, `~/.claude/skills/`, `~/.agents/skills/`.
  Each skill = lowercase-hyphenated subdir containing SKILL.md. Extra locations via chat.agentSkillsLocations.
  => A SINGLE `.claude/skills/<name>/SKILL.md` is read by BOTH Claude Code and Copilot. No duplication needed.
- SKILL.md frontmatter (Copilot): REQUIRED name (lowercase/digits/hyphens, <=64 chars) + description (<=1024 chars).
  OPTIONAL: license, allowed-tools, argument-hint, user-invocable (default true),
  disable-model-invocation (default false), context: fork (EXPERIMENTAL).
- Three-level progressive disclosure confirmed: (1) name+description only at discovery, (2) body on match,
  (3) referenced files only when needed.
- Skills supported across: Copilot cloud agent, Copilot code review, Copilot CLI, the Copilot app,
  agent mode in VS Code and JetBrains.
- Install/manage: `gh skill` (gh skill update uses provenance metadata written into frontmatter),
  `copilot skill {list,add,remove}`, in-session `/skills list|info|add|reload|remove`.

Other surfaces:
- Repo instructions: `.github/copilot-instructions.md` (no frontmatter). Old 4,000-char cap REMOVED;
  soft guidance ~1,000 lines. github.copilot.chat.codeGeneration.instructions is DEPRECATED (VS Code 1.102).
- Path-specific: `.github/instructions/NAME.instructions.md`, frontmatter applyTo (glob, comma-separated
  in one string, workspace-root relative), name, description. User-level: ~/.copilot/instructions/.
- Copilot READS AGENTS.md (repo root + nested), CLAUDE.md (gated chat.useClaudeMdFile), GEMINI.md.
  Copilot CLI reads AGENTS.md/CLAUDE.md/GEMINI.md + .github/copilot-instructions.md +
  .github/instructions/**  + $HOME/.copilot/{copilot-instructions.md,instructions/**}.
- PRECEDENCE IS SURFACE-DEPENDENT AND CONTESTED: docs.github.com ranks personal > path-specific >
  copilot-instructions.md > AGENTS.md/CLAUDE.md > org. VS Code treats copilot-instructions.md and AGENTS.md
  at the SAME tier. Copilot CLI docs explicitly state they define NO general precedence order.
  Do not design anything that depends on a single unified precedence rule.
- Chat modes RENAMED to custom agents. `.chatmode.md` DEPRECATED. Current: `NAME.agent.md` in
  `.github/agents/` (workspace) or `~/.copilot/agents`. VS Code ALSO reads `.claude/agents/`.
  Frontmatter: description (REQUIRED), name, argument-hint, tools, agents, model, user-invocable,
  disable-model-invocation, target (vscode|github-copilot), mcp-servers, handoffs, hooks.
  Body max 30,000 chars. Copilot CLI: --agent=NAME or /agent; repo path .github/agents/NAME.agent.md.
- Prompt files `.github/prompts/NAME.prompt.md` are VS CODE / Visual Studio / JetBrains ONLY.
  Frontmatter: description, name, argument-hint, agent (ask|agent|plan|custom name — NOT the old `mode`),
  model, tools. Variables: ${input:name}, ${input:name:placeholder}, ${selection}, ${workspaceFolder},
  ${fileBasename}; tools referenced in body as #tool:<name>.
  The Copilot CLI customization comparison page lists ONLY: custom instructions, skills, tools, MCP servers,
  hooks, subagents, custom agents, plugins. Prompt files are ABSENT -> DO NOT assume CLI prompt-file support.
- Copilot CLI: `npm i -g @github/copilot` (Node 22+), brew cask copilot-cli, winget. Binary `copilot`.
  Config under ~/.copilot (COPILOT_HOME): config.json (trustedFolders), mcp-config.json, permissions-config.json.
  Headless: `-p PROMPT` (+ `-s` to suppress decoration). No documented JSON output format.
  Permissions: --allow-tool/--deny-tool with Kind(argument) syntax; kinds include shell, write, MCP server name.
  shell(git:*) matches `git push` but not `gitea`. DENY ALWAYS WINS.
- MCP divergence: `.vscode/mcp.json` top-level key is **"servers"** (NOT mcpServers) with an `inputs` ARRAY
  ({promptString|pickString|command}) referenced as ${input:id}; stdio keys type/command/args/cwd/env/envFile/
  dev/sandboxEnabled; http/sse keys type/url/headers/oauth. Copilot CLI uses ~/.copilot/mcp-config.json with
  **mcpServers**. Claude uses .mcp.json with **mcpServers**. Three files, two schemas.
- Copilot coding agent (cloud) environment comes from `.github/workflows/copilot-setup-steps.yml` — job must
  be named exactly `copilot-setup-steps`. A DEVCONTAINER DOES NOT CONFIGURE IT. A failing setup step is
  skipped, not fatal. Max timeout-minutes 59. Ubuntu x64 / Windows x64 only.

## 4. Claude Code extensibility (2026)

- Docs moved: docs.claude.com/en/docs/claude-code/* -> code.claude.com/docs/en/*. Raw markdown via `.md` suffix.
- Skills: ~/.claude/skills/<n>/SKILL.md, .claude/skills/<n>/SKILL.md, <plugin>/skills/<n>/SKILL.md, managed.
  Name-conflict: enterprise > personal > project (INVERSE of settings precedence). Plugin skills namespaced.
- Commands MERGED into skills: .claude/commands/deploy.md == .claude/skills/deploy/SKILL.md, both give /deploy.
- Claude SKILL.md frontmatter (all optional): name, description, when_to_use, argument-hint, arguments,
  disable-model-invocation, user-invocable, allowed-tools, disallowed-tools, model, effort, context, agent,
  background, hooks, paths, shell, metadata, license, compatibility.
- **PORTABILITY CONSTRAINT**: only SIX fields are portable under the agentskills.io open standard —
  name, description, license, compatibility, metadata, allowed-tools. Any other field breaks claude.ai
  upload / Skills API / package_skill.py with a HARD ERROR.
  Copilot additionally accepts argument-hint, user-invocable, disable-model-invocation, context.
  => Portable-to-both intersection for a shared file: name, description, license, allowed-tools,
     argument-hint, user-invocable, disable-model-invocation, metadata (+ compatibility for Claude only).
- Directory name (not frontmatter `name`) determines the invoked command name for personal/project skills.
- Size guidance: keep SKILL.md under 500 lines. Listing budget = 1% of context window;
  description+when_to_use capped at 1,536 chars per entry.
- Dynamic context injection: !`cmd` inline or a fenced ```! block runs BEFORE content reaches Claude.
  (Claude-only; NOT portable to Copilot.)
- Substitutions: $ARGUMENTS, $ARGUMENTS[N], $N, $name, ${CLAUDE_SESSION_ID}, ${CLAUDE_EFFORT},
  ${CLAUDE_SKILL_DIR}, ${CLAUDE_PROJECT_DIR}, ${CLAUDE_PLUGIN_ROOT}, ${CLAUDE_PLUGIN_DATA}.
- Subagents: .claude/agents/ (project) > ~/.claude/agents/ > plugin agents/ (OPPOSITE of skill ordering).
  Frontmatter REQUIRED name+description; OPTIONAL tools, disallowedTools, model, permissionMode, maxTurns,
  skills, mcpServers, hooks, memory, background, effort, isolation, color, initialPrompt, experimental.
  Non-fork subagent gets a FRESH context: own system prompt + task message + full CLAUDE.md hierarchy +
  git status + preloaded `skills`. Does NOT see conversation history.
- Hooks: ~37 events (SessionStart, SessionEnd, Setup, UserPromptSubmit, UserPromptExpansion, Stop,
  StopFailure, PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, PermissionDenied,
  PostToolBatch, SubagentStart/Stop, TaskCreated/Completed, TeammateIdle, WorktreeCreate/Remove,
  Notification, ConfigChange, InstructionsLoaded, CwdChanged, FileChanged, DirectoryAdded,
  PreModelSwitch/PostModelSwitch, Elicitation/ElicitationResult, MessageDisplay, PreCompact/PostCompact).
  Structure: event -> matcher groups -> hook handlers. FIVE handler types: command, http, mcp_tool,
  prompt, agent. Exit 0 = ok (stdout parsed as JSON only if it starts { and ends }); exit 2 = BLOCKING
  (JSON cannot override); any other exit = NON-blocking, action PROCEEDS.
  PreToolUse blocks via hookSpecificOutput.permissionDecision deny|ask|defer|allow (top-level decision/reason
  deprecated for this event). suppressOutput is now a NO-OP.
  Hooks declarable in 7 places incl. SKILL.md frontmatter `hooks` and subagent frontmatter `hooks`.
  FileChanged matcher matches filenames -> a devcontainer.json watcher is possible.
- Plugins: .claude-plugin/plugin.json (OPTIONAL; only `name` required). Bundles at root: skills/, commands/,
  agents/, workflows/, output-styles/, themes/, hooks/hooks.json, .mcp.json, .lsp.json, bin/ (added to PATH),
  settings.json (only `agent` + `subagentStatusLine`). Marketplace: .claude-plugin/marketplace.json with
  name, owner{name}, plugins[]; source may be ./relative or {github|url|git-subdir|npm|archive|command}.
  Install: claude plugin marketplace add <src>; claude plugin install <plugin>@<marketplace>.
  A skill folder containing .claude-plugin/plugin.json loads as a plugin named <name>@skills-dir.
- Settings precedence: managed > CLI args > .claude/settings.local.json > .claude/settings.json >
  ~/.claude/settings.json. List-valued keys MERGE.
- Permissions: allow/ask/deny/additionalDirectories/defaultMode/disableBypassPermissionsMode/disableAutoMode.
  Evaluation deny > ask > allow, first match wins; specificity does NOT reorder.
  Bash(ls *) matches `ls -la` but not `lsof`; Bash(ls*) matches `lsof`. Bash(cmd:*) is the trailing form.
- .mcp.json: top-level `mcpServers`. Scope precedence local > project > user > plugin > connectors;
  the WHOLE winning entry is used, fields are NOT merged.
- CLAUDE.md: managed policy > ~/.claude/CLAUDE.md > ./CLAUDE.md or ./.claude/CLAUDE.md > ./CLAUDE.local.md.
  `@path` imports resolve relative to the importing FILE, max FOUR hops, skipped inside code spans/fences.
  **Claude Code does NOT read AGENTS.md** — workaround is CLAUDE.md containing `@AGENTS.md` or a symlink.
- .claude/rules/*.md: recursive discovery, launch-time load, `paths` frontmatter glob scoping.
- Claude-in-container: Feature ghcr.io/anthropics/devcontainer-features/claude-code:1.0.
  --dangerously-skip-permissions is REJECTED as root -> remoteUser must be non-root.
  Reference devcontainer at anthropics/claude-code/.devcontainer (devcontainer.json, Dockerfile,
  init-firewall.sh); firewall needs NET_ADMIN + NET_RAW via runArgs. It is an EXAMPLE, not a maintained image.
  Auth persistence needs a volume at ~/.claude AND CLAUDE_CONFIG_DIR, because ~/.claude.json lives OUTSIDE
  ~/.claude. Reference uses source=claude-code-config-${devcontainerId}.
  Managed settings in-container: /etc/claude-code/managed-settings.json, highest precedence.

## 5. Prior art and the real gap

- **decolint** (Go): the only standalone devcontainer linter. 31 rules across correctness/security/
  reproducibility/style. Has a `--merge` mode that resolves the EFFECTIVE config contributed by Features
  and base-image metadata. Does NOT do JSON Schema conformance (no unknown/misspelled property rule).
  1 star, created 2026-07-11, requires GOEXPERIMENT=jsonv2. Unknown bus factor.
- The devcontainer CLI does NOT validate against the JSON Schema. It parses JSONC and merges config only.
- SchemaStore registration = editor-only validation. This is what most teams actually get. Nothing in CI.
- **github/awesome-copilot contains NO devcontainer instruction, prompt, or chatmode.** Nearest items:
  a generic Docker instructions file and a Codespaces cost/startup skill (scoped to cost + startup time).
- **Trail of Bits `devcontainer-setup`** is the most-used devcontainer Claude skill — a GENERATOR
  (Dockerfile + devcontainer.json + post_install.py for Python/Node/Rust/Go with Claude Code preinstalled).
  Its "validation" is a template-substitution checklist. Not an auditor.
- **mmalyska/claude-plugins `devcontainer` plugin** has a `devcontainer-auditor` agent — the closest prior
  art — but it is a personal marketplace, 0 stars, NO LICENSE, and its checklist is hard-coded to the
  author's own Renovate config and WireGuard setup.
- The other ~30 devcontainer SKILL.md files on GitHub are registry mirrors, forks of the Trail of Bits
  skill, or project-local "run my commands in the container" skills. None is a spec-conformance auditor.
- anthropics/skills has NO devcontainer skill.
- `devcontainer features test` is the official, maintained conformance harness for FEATURE AUTHORS
  (auto-generates a container per feature, scenarios.json, duplicate-install mode).
- devcontainers/{images,features,templates,ci} actively maintained; devcontainers/spec comparatively dormant
  (last substantive commits Aug 2025; 2026 commits are website housekeeping).
- Dockerfile-side tooling (hadolint, dockle, trivy, docker scout) is mature but NONE understands
  devcontainer.json. trivy's misconfig scanner does not list devcontainer.json.
- (superseded in part; see ERRATA) NONE of hadolint/trivy/dockle/docker scout/devcontainer CLI is installed on this machine ->
  anything that shells out MUST probe and degrade gracefully.
- **AGENTS.md**: real, 60,000+ repos, but deliberately schema-free plain Markdown. No machine-readable
  fields, no skill format. Cannot itself carry an audit rule set.
- **rulesync** (dyoshikawa/rulesync): maintained cross-tool converter that ALREADY generates Claude Code
  AND GitHub Copilot artifacts — skills, subagents, commands, MCP, hooks, permissions — from one source,
  and can convert directly between tools without adopting its source-of-truth layout.
- **ruler** (intellectronica/ruler): fans one rule set out to ~25 agents, maps skills to per-tool dirs,
  but is rules-and-distribution oriented and cannot import from existing per-tool artifacts.

## 6. The design question

Design the SKILLS + AGENTS package that should exist, usable from BOTH GitHub Copilot (chat AND CLI)
and Claude Code. It must be better than afonsograca's router skill and must not rebuild decolint,
`devcontainer features test`, or the Trail of Bits generator without a reason.
Judge every proposal on Total Cost of Ownership: implementation cost, cognitive cost, operational cost,
change cost. Premature complexity is the cardinal sin.

---

## ERRATA (post-verification corrections to the above)

**2026-09-01 — §5, tool availability on this machine. The claim is wrong for one of five tools.**

§5 states: "NONE of hadolint/trivy/dockle/docker scout/devcontainer CLI is installed on this
machine -> anything that shells out MUST probe and degrade gracefully."

Measured 2026-09-01, during Task 7:

    hadolint      ABSENT      trivy   ABSENT      dockle  ABSENT      devcontainer  ABSENT
    docker-scout  ABSENT (as a bare binary on PATH)
    docker scout version  ->  exit 0, PRESENT

`docker scout` is a **Docker CLI plugin**, not a standalone binary. `command -v docker-scout`
reports absent while `docker scout` runs fine — which is almost certainly how the original claim
was formed, and is exactly why a probe must test the SUBCOMMAND, not the binary name.

Consequences:
- The skill's probe design is **validated**, not invalidated: probing `docker scout` as a
  subcommand is the correct form, and probing `command -v docker-scout` would produce a false
  "not installed" on this very machine.
- Four of five tools are genuinely absent, so the degrade-gracefully requirement stands unchanged.
- The consequence for a live audit is CONDITIONAL, and the first version of this erratum
  overstated it. There is no `docker scout` line in the skill's worked not-checked block to drop
  — image vulnerabilities are attributed there to `trivy not available` — and availability is not
  execution: the skill moves a line out of that block only when a tool was available AND actually
  ran. `docker scout` needs an image to scan, and AUDIT is read-only and does not pull. So the
  likely live-audit output on this machine keeps all seven lines and changes one REASON, e.g.
  "image vulnerabilities — trivy not available; docker scout available but the image was not
  pulled". Only if an image is present to scan and `docker scout` actually runs does the
  image-vulnerabilities line move out of the block.
- The operative warning stands: a Gate D, Task 9 or Task 10 run that assumes zero available
  scanners is wrong here, and a `docker scout` result appearing in a live run is not a bug.

The original §5 text is left in place rather than rewritten: it is dated, adversarially
fact-checked research, and silently editing it would destroy the provenance that makes the rest of
it trustworthy. This erratum supersedes it on this one point.
