## THE GAP (bottom line)

Three distinct layers exist, and they do not meet:

1. **Generation** — well covered. Trail of Bits `devcontainer-setup` (6.9k-star repo, active), devcontainers/templates, `devcontainer templates apply`. Nobody needs another scaffolder.
2. **Runtime/CI execution** — well covered. devcontainers/ci Action, `devcontainer up/build/exec`, `devcontainer features test`.
3. **Audit / conformance of an *existing* devcontainer** — a hole with exactly two occupants, neither adequate:
   - **decolint** (Go, MIT, 31 rules, SARIF output, `--merge` resolution). Genuinely good and it is the thing most likely to make a new tool redundant. But: 1 star, 7 weeks old, no schema-conformance rules, security/reproducibility categories are **off by default**, and there is zero agent/skill packaging around it.
   - **mmalyska/claude-plugins `devcontainer-auditor`** agent. Right shape, wrong content: 0 stars, no license, hard-wired to the author's personal Renovate config (`github>mmalyska/renovate-config`) and a WireGuard use case.

**The real gap is not a new linter — it is an agent-facing audit skill that (a) runs JSON-Schema conformance that nothing in CI does today, (b) drives decolint/hadolint/trivy/scout as the engines rather than reimplementing their rules, and (c) ships as one source generating both Claude Code and Copilot artifacts.** Note that this repo (/Users/emildan/work/devcontainers) is already laid out as a multi-target agent-config repo (AGENTS.md, CLAUDE.md, GEMINI.md, QODER.md, .cursorrules, .windsurfrules all present and byte-identical at 1759 bytes) — that fan-out is exactly what rulesync/ruler automate.

---

## 1. CLAUDE CODE SKILLS / AGENTS / PLUGINS

| Project | What it covers | What it does NOT cover | Maintained |
|---|---|---|---|
| **trailofbits/skills → plugins/devcontainer-setup** | Scaffolds Dockerfile + devcontainer.json + post_install.py + .zshrc + install.sh. Python(uv)/Node(fnm)/Rust/Go. Claude Code preinstalled, bubblewrap sandboxing, ast-grep, network isolation. Multi-language projects. | Auditing an existing config. Schema conformance. Security posture of the *result*. Its "validation" = 4-item checklist (placeholders substituted, JSON valid/no trailing commas, extensions present, postCreate chained with &&). | **Yes** — repo ★6,924, pushed 2026-08-31; skill path last touched 2026-08-26 |
| **trailofbits/claude-code-devcontainer** | Companion repo: sandboxed devcontainer for Claude Code bypass mode, built for security audits / untrusted code review | Not a skill; a reference config | **Yes** — ★933, pushed 2026-08-28 |
| **mmalyska/claude-plugins → plugins/devcontainer** | Agent `devcontainer-auditor` + skills `ghcr-image-pipeline`, `secrets-injection`, `renovate-digest-pinning`. Audit checklist: image digest pinning, secrets block + devcontainer.env.sample + .gitignore, WireGuard caps, lifecycle-hook placement (onCreate vs postCreate vs updateContent), Renovate automerge rule, remoteUser/containerUser. Severity-graded report format (PASS/WARN/FAIL, CRITICAL for leaked env). | Schema conformance. Feature/image metadata resolution. Anything not in the author's own stack — requires `renovate.json5` to extend `github>mmalyska/renovate-config`. No license. | Personal marketplace — ★0, pushed 2026-08-17, license=null |
| **JetBrains/skills → devcontainer/SKILL.md** | Actually `name: skillshare-devcontainer` — routes CLI/test execution into a project's container ("All CLI execution MUST happen inside the devcontainer"). Zero-rebuild bind-mount workflow, `make devc*` lifecycle, ssenv isolated HOMEs. | Authoring or auditing. Entirely project-specific (runkids/skillshare). | ★331, pushed 2026-06-29 |
| **RedHatProductSecurity/prodsec-skills → devcontainer-setup** | Verbatim adaptation of the ToB skill (`origin:` field says so). CC BY-SA 4.0. | Same gaps as ToB | derivative |
| **majiayu000/claude-skill-registry** (+ `-data`) | Mirror registry carrying devcontainer, devcontainer-setup, devcontainer-help, devcontainer-expert. `devcontainer-expert` v2.0.0 MIT = generic VS Code how-to (create/configure devcontainer.json, Templates & Features, Docker Compose, troubleshooting). | Prose guidance only; no executable checks, no rule IDs, no CI output | aggregator |
| Others: diegosouzapw/awesome-omni-skills, shipshitdev/skills, Anhvu1107/all-agent-skill, FrancoStino/opencode-skills-collection, plurigrid/asi, Tyler-R-Kendrick/agent-skills, event4u-app/agent-config, stacklok/toolhive-studio, sfc-gh-dflippo, AxiumFoundry, runkids/veto | mostly mirrors of ToB or project-local execution skills | — | — |
| **anthropics/skills** | 20 official skills (docx, pdf, pptx, xlsx, mcp-builder, skill-creator, webapp-testing, …) | **No devcontainer skill at all** | active |
| **anthropics/devcontainer-features** | One Feature: `ghcr.io/anthropics/devcontainer-features/claude-code:1.0` | not a skill | ★298, pushed **2025-12-16** — ~8 months stale |

GitHub code search `devcontainer filename:SKILL.md` → 4,472 hits, top 30 reviewed. No spec-conformance auditor found.

---

## 2. COPILOT PROMPT / INSTRUCTION PACKS

**github/awesome-copilot** (★38,489, pushed 2026-08-31) — searched full recursive tree + code search:

- **No** `*.instructions.md`, `*.prompt.md`, or `*.chatmode.md` for devcontainers. Zero.
- `instructions/containerization-docker-best-practices.instructions.md` — comprehensive Docker guidance (immutability, portability, isolation, multi-stage, layer optimization, security scanning). **applyTo glob explicitly excludes devcontainer.json**: `'**/Dockerfile,**/Dockerfile.*,**/*.dockerfile,**/docker-compose*.yml,**/docker-compose*.yaml,**/compose*.yml,**/compose*.yaml'`
- `skills/github-codespaces-efficiency/` (SKILL.md + references/codespaces.md + references/review-rubric.md) — the only substantive devcontainer-adjacent skill. **Scope = cost and startup time**, not correctness. Workflow: measure (`gh codespace list`, `gh api /repos/$repo/codespaces/machines`) → guardrails → top-3 fixes ranked by monthly USD savings → verify. Heuristics: image >2 GB, >10 features, missing `devcontainer-lock.json`, prebuild scope, idle timeout. Output template is Waste sources / Proposed fixes / Validation / Impact (startup time, monthly spend, resource utilization).
- Other incidental devcontainer mentions: skills/aspire/references/deployment.md, skills/dependabot/, agents/python-notebook-sample-builder.agent.md, workshop prerequisite docs.

→ **Copilot-side devcontainer authoring/audit is completely unoccupied.**

---

## 3. VALIDATION TOOLING

### JSON Schema
- `https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json` — 24,142 bytes, draft **2019-09**.
  - top-level keys: `$schema, description, allowComments, allowTrailingCommas, definitions, oneOf, unevaluatedProperties`
  - `allowComments: true`, `allowTrailingCommas: false` → **must JSONC-parse first**
  - `unevaluatedProperties: false` + top-level `oneOf` (len 2) → needs a 2019-09-capable validator; ajv default build and old python-jsonschema will silently under-validate
  - definitions: `devContainerCommon, nonComposeBase, dockerfileContainer, buildOptions, imageContainer, composeContainer, Mount`
  - `devContainerCommon` props: `$schema, additionalProperties, capAdd, containerEnv, containerUser, customizations, features, forwardPorts, hostRequirements, init, initializeCommand, mounts, name, onCreateCommand, otherPortsAttributes, overrideFeatureInstallOrder, portsAttributes, postAttachCommand, postCreateCommand, postStartCommand, privileged, remoteEnv, remoteUser, secrets, securityOpt, updateContentCommand, updateRemoteUserUID, userEnvProbe, waitFor`
  - `nonComposeBase`: `appPort, overrideCommand, runArgs, shutdownAction, workspaceFolder, workspaceMount`
  - `composeContainer`: `dockerComposeFile, overrideCommand, runServices, service, shutdownAction, workspaceFolder`
  - `buildOptions`: `args, cacheFrom, options, target`; `Mount`: `source, target, type`
  - `customizations` is **untyped** (`{"type":"object"}` with only a description) → tool-specific keys are never validated by the base schema
  - `features` carries `deprecated`/`deprecationMessage` on legacy names: fish, maven, gradle, homebrew, jupyterlab (and more) — a validator that reports deprecations is a cheap, real win
  - `secrets` is patternProperties `^[a-zA-Z_][a-zA-Z0-9_]*$` → objects with description metadata
  - `hostRequirements.memory` pattern `^\d+([tgmk]b)?$`, `cpus` integer min 1
- `devContainer.schema.json` — **447 bytes**, pure `allOf` stub:
  ```json
  {"allOf":[{"$ref":"./devContainer.base.schema.json"},
   {"$ref":"https://raw.githubusercontent.com/microsoft/vscode/main/extensions/configuration-editing/schemas/devContainer.codespaces.schema.json"},
   {"$ref":"https://raw.githubusercontent.com/microsoft/vscode/main/extensions/configuration-editing/schemas/devContainer.vscode.schema.json"}]}
  ```
  → full validation reaches **outside the devcontainers org**, onto **branch-tracking (`main`) unversioned URLs** in microsoft/vscode. Fragile; worth vendoring + pinning.
- `devContainerFeature.schema.json` — third schema in the spec repo.
- **SchemaStore catalog** registers `devcontainer.json` / `.devcontainer.json` → base schema, and `devcontainer-feature.json` → feature schema. This is why editors validate and CI does not.

### devcontainer CLI
- `package.json` dependencies: chalk, follow-redirects, js-yaml, **jsonc-parser**, ncp, node-pty, proxy-agent, pull-stream, recursive-readdir, semver, shell-quote, stream-to-pull-stream, tar, text-table, vscode-uri, yargs. **No ajv, no JSON Schema library anywhere.**
- Commands: `up`, `build`, `run-user-commands`, `read-configuration`, `exec`, `outdated`, `upgrade`, `features <...>`, `templates <...>`. `stop` and `down` still unimplemented.
- `read-configuration` = "Outputs current configuration for workspace" — merge/read, **not validation**.
- Lockfiles `.devcontainer-lock.json` generated by default on build/up; `--no-lockfile`, `--frozen-lockfile`.
- Install: `curl -fsSL https://raw.githubusercontent.com/devcontainers/cli/main/scripts/install.sh | sh` (bundled Node, Linux/macOS x64+arm64) or `npm i -g @devcontainers/cli` (needs Python + C/C++ toolchain).

### devcontainer features test
- docs/features/test.md. Mirrored `src/` and `test/` dirs. Three modes: auto-generated (`--skip-autogenerated`), scenarios via `test/<F>/scenarios.json` (`--skip-scenarios`), duplicate-install (`--skip-duplicated`). Pass = container builds+starts AND `test.sh` exits 0. Used in CI by devcontainers/features and devcontainers/feature-starter. Also `devcontainer templates apply` / `publish` (docs/templates/).
- anthropics/devcontainer-features mirrors this exactly: `.github/workflows/{test,validate,release}.yaml`, `test/claude-code/{basic.sh,scenarios.json,test.sh}`.

### decolint — the important one
- `github.com/bare-devcontainer/decolint`, Go, MIT, ★1, created 2026-07-11, pushed 2026-08-29.
- Lints `devcontainer.json`, `devcontainer-feature.json`, `devcontainer-template.json`.
- **Rules (31 total)**, files under `rules/`:
  `conflicting_container_def, feature_install_script_not_executable, id_dir_mismatch, invalid_semver, missing_build_dockerfile, missing_compose_service, missing_container_def, missing_feature_install_script, missing_required_props, missing_workspace_mount_folder, no_app_port, no_apparmor_unconfined, no_bind_mount, no_cap_add_all, no_dangerous_cap_add, no_docker_socket_mount, no_host_namespace, no_host_port_format, no_image_latest, no_privileged_container, no_seccomp_override, no_seccomp_unconfined, pin_extension_version, pin_feature_exact_version, pin_feature_version, pin_image_digest, require_cap_drop_all, require_no_new_privileges, require_non_root, template_options, undefined_template_option, unused_template_option`
- Categories (docs/data/categories.yaml): `correctness` (**error, the only one on by default**, 13 rules) / `security` (**off**, 11) / `reproducibility` (**off**, 5) / `style` (**off**, 2). Default posture is quiet — a skill that turns the right categories on is real value.
- `--merge` resolves Feature + base-image metadata and attributes findings back to the property that pulled them in. README's killer example: a digest-pinned, `--cap-drop=ALL`, `no-new-privileges` config still fails on seccomp override/unconfined and two unpinned VS Code extensions inherited from the base image.
- Also flags Codespaces-platform silent drops: `no-bind-mount`, `no-host-port-format` ("Codespaces only supports a bare port number").
- Output: text with line:col, JSON, **GitHub Actions annotations, SARIF**. Config `.decolint.json`/`.decolint.jsonc`, `decolint init`.
- Run with no install: `docker run --rm -v "$PWD:/workspace" ghcr.io/bare-devcontainer/decolint` (linux/amd64 + arm64). Signed release binaries. Source build needs `GOEXPERIMENT=jsonv2 go install github.com/bare-devcontainer/decolint/cmd/decolint@latest` — **experimental encoding/json/v2 dependency is a stability risk**.
- Repo has `.claude/CLAUDE.md`, `AGENTS.md`, attestation + CodeQL + SARIF-upload workflows.
- **Not covered:** JSON Schema conformance / unknown-property / typo detection; lifecycle-hook placement advice; anything about the Dockerfile itself.

### Dockerfile side
| Tool | Covers | Doesn't cover | Maintained |
|---|---|---|---|
| hadolint | Dockerfile lint + inline shellcheck | devcontainer.json | ★12,378, 2026-08-24 |
| dockle | built-image linting, CIS-ish best practice | devcontainer.json; needs a built image | ★3,295, 2026-08-10 |
| trivy | vuln + misconfig + secrets + SBOM. Misconfig types: Docker, Kubernetes, Terraform, CloudFormation, Azure ARM, Helm — **devcontainer.json absent** | devcontainer.json semantics | ★37,716, 2026-08-28 |
| docker scout | `quickview`, `cves`, `compare`; bundled with Docker Desktop 4.17+; docker/scout-action | devcontainer.json | active (Docker Inc.) |

**Local machine probe:** `devcontainer` ✗, `hadolint` ✗, `trivy` ✗, `dockle` ✗, `docker` ✓ (/usr/local/bin/docker). Any skill must probe-and-degrade, and the `docker run ghcr.io/bare-devcontainer/decolint` path is the only zero-install option here.

---

## 4. REFERENCE COLLECTIONS

| Repo | ★ | Last push | Note |
|---|---|---|---|
| devcontainers/spec | 5,689 | 2026-03-20 | **Comparatively dormant** — last 2 commits are website housekeeping (2026-03-17 "Add tools from website", 2026-03-15 "Add Emacs extension"), before that nothing since 2025-08-01. Holds the 3 schemas. |
| devcontainers/cli | 2,927 | 2026-08-31 | reference implementation, very active |
| devcontainers/images | 2,116 | 2026-08-27 | mcr.microsoft.com/devcontainers prebuilt images |
| devcontainers/features | 1,530 | 2026-08-26 | spec-maintainer Features |
| devcontainers/templates | 1,435 | 2026-08-28 | spec-maintainer Templates |
| devcontainers/ci | 493 | 2026-06-01 | GH Action + ADO Task; build/prebuild/run. Inputs: imageName, cacheFrom, push, runCmd. Note: "not currently capable of taking advantage of pre-built Codespaces". Least active core repo. |
| devcontainers/devcontainers.github.io | 205 | 2026-08-25 | containers.dev content |
| devcontainers/feature-starter | 447 | **2024-08-22** | stale |
| devcontainers/action | 87 | **2024-10-04** | stale |
| microsoft/vscode-dev-containers | 4,743 | **2023-11-30** | EOL, migrated to devcontainers org |
| devcontainers-extra/features | 152 | 2026-08-06 | community Features |
| manekinekko/awesome-devcontainers | 511 | 2026-08-20 | curated list; **names decolint as the only linter** |

---

## 5. PORTABLE AGENT CONFIG ECOSYSTEM

**AGENTS.md** (agents.md, openai/agents.md ★24,017, pushed 2026-08-25)
- "a README for agents"; plain Markdown, any headings, no required fields.
- Nesting: nearest file in the directory tree wins; explicit user prompts override everything.
- 60,000+ open-source projects; supported by Claude Code, Jules, Cursor, VS Code, Copilot.
- **Explicitly not** a machine-readable schema, skill spec, or tool-integration format. Can carry devcontainer *advice*, cannot carry a rule set.

**rulesync** — dyoshikawa/rulesync, ★1,368, pushed 2026-08-31, npm + Homebrew tap + single-binary installer.
- Generates rules / ignore / mcp / commands / subagents / **skills** / hooks / permissions / checks across ~40 tools.
- Skills ✅ for Claude Code, Claude Code **plugin**, GitHub Copilot, GitHub Copilot CLI, Codex, Cursor, OpenCode, Gemini CLI, Kiro, Antigravity, Junie, Warp, Zed, …
- Open-standards row: AGENTS.md (rules/commands/subagents/skills ✅), AgentsSkills (skills ✅).
- `rulesync generate --targets "*" --features "*"`; import from CLAUDE.md/.cursorrules/.github/copilot-instructions.md; **`rulesync convert --from cursor --to copilot,claudecode`** with no `.rulesync/` adoption.
- → **This is the one-source→both-artifacts answer for #5. Don't build a converter.**

**ruler** — intellectronica/ruler, ★2,903, pushed 2026-08-26.
- Fans one rule set out to ~25 agents. Per-tool table gives rules file / MCP config / **Skills location** / Subagents location. Copilot → `AGENTS.md`, `.mcp.json`, `.claude/skills/`, `.github/agents/`. Claude Code → `CLAUDE.md`, `.mcp.json`, `.claude/skills/`, `.claude/agents/`.
- Distribution-only; no import/convert-from direction.

**steipete/agent-rules** — ★5,695, **archived 2026-05-03**. Dead; don't cite as live.

No "aiconfig-style" devcontainer-specific converter exists. Nothing in this ecosystem knows anything about devcontainers.

---

## RECOMMENDED POSITIONING (what to actually build)

1. **Don't** write another scaffolder (ToB owns it) or another rule engine (decolint owns it).
2. **Do** own the *conformance* layer nothing occupies: JSONC-parse → validate against `devContainer.base.schema.json` (draft 2019-09, `unevaluatedProperties:false`) with a vendored, pinned copy of the two microsoft/vscode sub-schemas; report unknown/misspelled properties and the schema's own `deprecated` feature names. No CLI does this today.
3. **Do** own orchestration + interpretation: probe for decolint / devcontainer CLI / hadolint / trivy / scout, fall back to `docker run ghcr.io/bare-devcontainer/decolint`, enable decolint's off-by-default security + reproducibility categories, and merge everything into one severity-ranked report. Cite rule IDs so findings are checkable.
4. **Do** cover what decolint deliberately doesn't: lifecycle-hook placement (initialize/onCreate/updateContent/postStart/postAttach), `waitFor`, secrets hygiene (`secrets` block + `.env.sample` + `.gitignore`), lockfile presence, `overrideFeatureInstallOrder`, `hostRequirements` sanity.
5. **Do** author once and emit both targets via **rulesync** (`--targets claudecode,copilot`) — and fill the Copilot hole directly by contributing a `devcontainer-*.instructions.md` / skill to `github/awesome-copilot`, where the applyTo glob for devcontainer.json is currently unclaimed.
6. **Consider** contributing the schema-conformance rule upstream to decolint (Go, MIT, "Rules are plain Go code and new ones are easy to add") rather than reimplementing — but weigh its ★1 / 7-week age / `GOEXPERIMENT=jsonv2` bus factor before depending on it as a hard requirement.
