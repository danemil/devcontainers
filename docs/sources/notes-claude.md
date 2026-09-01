## SOURCE-OF-TRUTH NOTE
docs.claude.com/en/docs/claude-code/* → 301 → code.claude.com/docs/en/*. Append `.md` to any page for raw Markdown (curl works; no auth). Index: https://code.claude.com/docs/llms.txt

Raw markdown cached during this research at:
/private/tmp/claude-501/-Users-emildan-work-devcontainers/a20885cc-5e6c-44db-9455-632f7c67942e/scratchpad/
  hooks.md (316KB), plugins-reference.md (115KB), plugin-marketplaces.md (117KB),
  settings.md (58KB), permissions.md (76KB), mcp.md (111KB), memory.md (37KB),
  devcontainer.md (19KB), commands.md (163KB), settings-reference.md (415KB)

Skills page (96KB) persisted at:
/Users/emildan/.claude/projects/-Users-emildan-work-devcontainers/a20885cc-5e6c-44db-9455-632f7c67942e/tool-results/toolu_017Tt4Xa1z5AepvWF2Ev7zeJ.txt

=====================================================================
1. AGENT SKILLS
=====================================================================

### Directory layout
```
~/.claude/skills/<skill-name>/SKILL.md      # personal, all projects
.claude/skills/<skill-name>/SKILL.md        # project
<plugin>/skills/<skill-name>/SKILL.md       # plugin → /plugin-name:skill-name
.claude/commands/<name>.md                  # legacy flat command, still works
```
Reserved folder name: `synced` (any capitalization) at enterprise/personal/project levels — used by CLAUDE_CODE_SYNC_SKILLS for claude.ai-synced skills at ~/.claude/skills/synced/.

Symlinks: a <skill-name> entry may be a symlink to a directory elsewhere; Claude Code follows it and reads SKILL.md from the target. Same target reachable twice = loaded once.

### Nested / monorepo discovery
- Project skills load from .claude/skills/ in the start dir AND every parent up to repo root.
- Nested .claude/skills/ BELOW the start dir are NOT loaded at startup; they load the first time Claude reads/edits a file in that subdir, then stay for the session.
- On name clash, nested variant gets a directory-qualified name: apps/web/.claude/skills/deploy/SKILL.md → /apps/web:deploy
- Invoking the unqualified /deploy loads the project-root one AND appends a list of directory-qualified variants with an instruction to also invoke matching ones.

### Frontmatter reference (full table, ALL optional)
| Field | Notes |
|---|---|
| name | Display name in listings; defaults to directory name. For PERSONAL/PROJECT skills this does NOT set the command name (directory does). For PLUGIN skills it DOES set the last command segment. |
| description | Recommended. Combined description+when_to_use truncated at 1,536 chars in the listing. Falls back to first paragraph of body. |
| when_to_use | Extra trigger phrases; appended to description; counts toward the 1,536 cap. |
| argument-hint | Autocomplete hint, e.g. `[issue-number]` or `[filename] [format]` |
| arguments | Named positional args for $name substitution. Space-separated string or YAML list. |
| disable-model-invocation | true = only user can invoke. Also prevents preloading into subagents and (v2.1.196+) prevents scheduled-task firing. Default false. |
| user-invocable | false = only Claude invokes; hidden from / menu. Default true. |
| allowed-tools | Pre-approve tools for the INVOKING TURN ONLY. Space- or comma-separated string, or YAML list. Does NOT restrict. |
| disallowed-tools | Remove tools from the pool while the skill is active; clears next message. Can't remove EndConversation while any other tool remains. |
| model | Same values as /model, or `inherit`. Applies rest of current turn only; not saved. With context:fork sets the forked subagent's model. |
| effort | low/medium/high/xhigh/max |
| context | `fork` = run in forked subagent context |
| agent | which subagent type when context:fork |
| background | only with context:fork. false = wait for result in the invoking turn. Default true. Requires v2.1.218+. |
| hooks | Hooks registered on invoke, persist rest of session. Supports the `once` option (skills only). |
| paths | Glob patterns limiting auto-activation. Comma-separated string or YAML list. Same format as path-specific rules. |
| shell | `bash` (default) or `powershell` for !`cmd` and ```! blocks |
| metadata | Free-form YAML map for your own tooling. Don't reuse frontmatter names as keys. |
| license | Agent Skills spec field; accepted, not acted on. |
| compatibility | Agent Skills spec field; ≤500 chars; accepted, not acted on. |

Frontmatter read ONLY if the opening `---` is the file's FIRST line.
Booleans accept yes/no/on/off/1/0 any case, plus true/false (v2.1.218+).
Malformed YAML → body loads with EMPTY metadata; /skill-name still works but no description. Debug with --debug or `claude plugin validate .claude/skills` (v2.1.233+).

### Agent Skills open standard (agentskills.io)
Portable six fields ONLY: name, description, license, compatibility, metadata, allowed-tools.
Everything else is a Claude Code extension and HARD-FAILS claude.ai upload / Skills API / package_skill.py:
  "Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name"

### Progressive disclosure
```
my-skill/
├── SKILL.md      (required - overview and navigation)   ← keep under 500 lines
├── reference.md  (detailed API docs - loaded when needed)
├── examples.md   (usage examples - loaded when needed)
└── scripts/
    └── helper.py (utility script - executed, not loaded)
```
Reference them from SKILL.md so Claude knows what to load:
  - For complete API details, see [reference.md](reference.md)

### Discovery / invocation mechanics
- Listing of names+descriptions always in context; body loads on invoke.
- Listing budget = 1% of model context window. Tune: `skillListingBudgetFraction` (0.02 = 2%) or SLASH_COMMAND_TOOL_CHAR_BUDGET (fixed char count).
- Per-entry cap 1,536 chars (`skillListingMaxDescChars`).
- On overflow, descriptions are dropped starting with LEAST-invoked skills.
- `skillOverrides` setting: set an entry to "name-only" to list without a description, or "off" to hide.
- /doctor estimates listing context cost; /context has a Skills row.
- disableBundledSkills turns off all bundled skills except /doctor.

### Lifecycle
Rendered SKILL.md enters conversation as ONE message and PERSISTS across turns. Claude Code does NOT re-read the file later — write standing instructions, not one-time steps.
Re-invoke with identical rendered content → short "already loaded" note, not a second copy. Different content (args changed, !`cmd` output changed) → full content appended again.
Auto-compaction: re-attaches most recent invocation of each skill after the summary, first 5,000 tokens each, combined budget 25,000 tokens, filled from most-recently-invoked backward.

### Substitutions
$ARGUMENTS, $ARGUMENTS[N], $N, $name, ${CLAUDE_SESSION_ID}, ${CLAUDE_EFFORT},
${CLAUDE_SKILL_DIR}, ${CLAUDE_PROJECT_DIR}, ${CLAUDE_PLUGIN_ROOT}, ${CLAUDE_PLUGIN_DATA}

${CLAUDE_SKILL_DIR} / ${CLAUDE_PROJECT_DIR} substitute in TWO places: body AND Bash rules in allowed-tools. Canonical no-prompt pattern:
```yaml
---
name: render-chart
description: Render a chart from a CSV file
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/render.sh *)
---
Run `${CLAUDE_SKILL_DIR}/scripts/render.sh <csv-file>` to render the chart.
```
Indexed args use shell-style quoting: /my-skill "hello world" second → $0="hello world", $1="second".
Unfilled $N stays literal; unfilled $name → empty string.
Skill stacking: /write-tests /fix-issue 123 loads BOTH, passing "123" to each. First skill + up to 5 more.

### Dynamic context injection
Inline: !`git diff HEAD` — recognized only at line start or after whitespace. `KEY=!`cmd`` stays literal.
Multi-line: fenced block opened with ```!
Runs ONCE over the original file; output not re-scanned.
Working dir = session shell cwd (moves with cd). stderr merged into stdout under bash. 2-minute Bash-tool timeout. Output past inline ceiling → file path + preview.
Kill switch: "disableSkillShellExecution": true (user/project/plugin/add-dir sources; bundled+managed exempt). Replaced with `[shell command execution disabled by policy]`.

=====================================================================
2. SUBAGENTS
=====================================================================
Locations & precedence (1 = highest) — NOTE: inverse of skills
1 Managed settings (org-wide)
2 --agents CLI flag (JSON, current session)
3 .claude/agents/          ← project WINS over personal here
4 ~/.claude/agents/
5 plugin agents/

Discovery walks UP from cwd; files scanned recursively; subdirectory path does not affect identity, only the `name` field.

Required frontmatter: name (lowercase+hyphens, no `:`), description
Optional: tools, disallowedTools, model, permissionMode, maxTurns, skills, mcpServers, hooks, memory, background, effort, isolation, color, initialPrompt, experimental

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---
You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```
model: sonnet|opus|haiku|fable|<full id e.g. claude-opus-5>|inherit
permissionMode: default|acceptEdits|auto|dontAsk|bypassPermissions|plan|manual
isolation: worktree
color: red|blue|green|yellow|purple|orange|pink|cyan
disallowedTools applies FIRST, then tools resolves against the remainder.
MCP patterns: mcp__<server>, mcp__<server>__*, mcp__* (denylist only)

Dispatch:
  natural language: "Use the code-reviewer subagent to ..."
  guaranteed:       @agent-code-reviewer  |  @"code-reviewer (agent)"
  plugin:           @agent-my-plugin:code-reviewer
  session-wide:     claude --agent code-reviewer   OR  {"agent": "code-reviewer"} in .claude/settings.json
  CLI JSON:         claude --agents '{"code-reviewer": {"description":..., "prompt":..., "tools":[...], "model":"sonnet"}}'

Isolation (non-fork): fresh context = own system prompt + env details + task message + full CLAUDE.md hierarchy + git-status snapshot from parent session start + preloaded `skills` content + sibling roster (v2.1.206+).
Does NOT see: conversation history, output style, auto memory, skills already invoked by main.
Explore and Plan skip CLAUDE.md + git status, and are one-shot (not resumable).

Fork (/subtask or Agent tool subagent_type:"fork"): inherits full conversation, system prompt, tools, model, permissions. Tool calls stay out of main; only final result returns. Background by default. Can't spawn further forks. Reuses parent prompt cache.

Model resolution: per-invocation model param > frontmatter model (inherit = main's) > CLAUDE_CODE_SUBAGENT_MODEL env > main conversation model.
Depth limit 3 (CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH); 20 concurrent (CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS).
Removed from ALL subagents: Agent (at depth limit), AskUserQuestion, EndConversation, EnterPlanMode, ExitPlanMode (unless permissionMode:plan), ScheduleWakeup, TaskOutput, WaitForMcpServers, Workflow.
Restrict spawning: `tools: Agent(worker, researcher), Read, Bash` — only applies to main-thread agents run with claude --agent.

=====================================================================
3. SLASH COMMANDS
=====================================================================
MERGED INTO SKILLS. `.claude/commands/NAME.md` → `/NAME` (file name without extension).
Same frontmatter as skills EXCEPT `name` and `paths`, which are IGNORED in a command file.
Skill beats command on name collision.
Docs recommend skills over commands (supporting files, invocation control, auto-loading).

Command name sources:
  .claude/skills/deploy-staging/SKILL.md      → /deploy-staging
  apps/web/.claude/skills/deploy/SKILL.md     → /apps/web:deploy  (on clash)
  .claude/commands/deploy.md                  → /deploy
  my-plugin/skills/review/SKILL.md            → /my-plugin:review (or /my-plugin:fancy with name: fancy)
  my-plugin/SKILL.md (plugin root)            → name field supplies whole final segment; plugin dir name is fallback

ARGUMENTS + positional: see §1 substitutions. Bare-name plugin alias /fancy also works unless taken.
Inline bash: !`cmd` and ```! blocks (see §1).
@file references: local skills/commands DO attach referenced files (confirmed by contrast in the synced-skills section) — see unknowns.
allowed-tools: turn-scoped pre-approval, e.g.
  allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *)
Workspace trust does NOT gate allowed-tools — a repo-checked-in project skill's allowed-tools applies even in a never-trusted folder under `claude -p`. REVIEW BEFORE RUNNING UNTRUSTED REPOS.

=====================================================================
4. HOOKS
=====================================================================
### Schema (three levels of nesting)
```json
{
  "hooks": {
    "<HookEventName>": [
      {
        "matcher": "<filter>",
        "hooks": [
          {
            "type": "command|http|mcp_tool|prompt|agent",
            "command": "...",
            "args": [],
            "if": "Bash(rm *)",
            "timeout": 600,
            "statusMessage": "...",
            "once": false,
            "async": false,
            "asyncRewake": false,
            "shell": "bash"
          }
        ]
      }
    ]
  },
  "disableAllHooks": false
}
```
Terms: hook EVENT → matcher GROUP → hook HANDLER.

### All event names (full 2026 set)
Per-session: SessionStart, SessionEnd, Setup
Per-turn: UserPromptSubmit, UserPromptExpansion, Stop, StopFailure
Agentic loop: PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, PermissionDenied, PostToolBatch
Subagent/task: SubagentStart, SubagentStop, TaskCreated, TaskCompleted, TeammateIdle
Reactive: WorktreeCreate, WorktreeRemove, Notification, ConfigChange, InstructionsLoaded, CwdChanged, FileChanged, DirectoryAdded
Model: PreModelSwitch, PostModelSwitch
MCP/display: Elicitation, ElicitationResult, MessageDisplay, PreCompact, PostCompact

hooks.md section line offsets for verbatim per-event input schemas:
SessionStart 1089, Setup 1222, InstructionsLoaded 1261, UserPromptSubmit 1296, UserPromptExpansion 1358, MessageDisplay 1408, PreToolUse 1540, PermissionRequest 1821, PostToolUse 1917, PostToolUseFailure 2024, PostToolBatch 2086, PermissionDenied 2143, Notification 2191, SubagentStart 2283, SubagentStop 2319, TaskCreated 2348, TaskCompleted 2402, Stop 2458, StopFailure 2560, TeammateIdle 2588, ConfigChange 2635, CwdChanged 2706, DirectoryAdded 2741, FileChanged 2787, WorktreeCreate 2864, WorktreeRemove 2922, PreCompact 2971, PostCompact 3003, PreModelSwitch 3031, PostModelSwitch 3186, SessionEnd 3239, Elicitation 3277, ElicitationResult 3349

### Matcher
"*" | "" | omitted            → match all
only [A-Za-z0-9_\- ,|]        → exact string, or |/,-separated list of exact strings
anything else                 → unanchored JS RegExp (RegExp.prototype.test)
Edit.* matches NotebookEdit too → anchor as ^Edit$.
Hyphens joined the exact set in v2.1.195; commas in v2.1.191.
FileChanged & StopFailure: exact-match set of only [_0-9A-Za-z|].

### Common input fields (stdin JSON / HTTP POST body)
session_id, prompt_id, transcript_path, cwd, permission_mode, effort{level}, hook_event_name
+ agent_id, agent_type when inside a subagent or under --agent
+ SessionStart only may carry `model`; Pre/PostModelSwitch carry from_model / to_model
There is NO $CLAUDE_MODEL env var.

PreToolUse example (verbatim):
```json
{
  "session_id": "abc123",
  "prompt_id": "550e8400-e29b-41d4-a716-446655440000",
  "transcript_path": "/home/user/.claude/projects/.../transcript.jsonl",
  "cwd": "/home/user/my-project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {"command": "npm test", "description": "Run test suite", "timeout": 120000, "run_in_background": false},
  "tool_use_id": "toolu_01ABC123..."
}
```

### JSON output — three kinds of fields
UNIVERSAL top-level:
  continue (default true; false stops Claude entirely, takes precedence over event-specific decisions)
  stopReason (shown to user when continue:false; NOT shown to Claude)
  suppressOutput (NO-OP — accepted but not acted on)
  systemMessage (warning to user; may arrive as SDKInformationalMessage in stream-json)
  terminalSequence (OSC 0/1/2/9/99/777 + BEL only; anything else → field ignored)
Top-level `decision` + `reason` — current format for PostToolUse, Stop, etc.
`hookSpecificOutput` — nested; REQUIRES hookEventName set to the event name.

All hook output strings (additionalContext, systemMessage, plain stdout) capped at 10,000 chars; overflow → file + preview.
Stdout must contain ONLY the JSON object (shell profile banners break parsing).

### PreToolUse decision control (hookSpecificOutput ONLY; top-level decision/reason DEPRECATED here)
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "My reason here",
    "updatedInput": { "field_to_modify": "new value" },
    "additionalContext": "Current environment: production. Proceed with caution."
  }
}
```
permissionDecision: allow | deny | ask | defer
  allow → skips prompt (except actions no mode auto-approves, and AskUserQuestion/ExitPlanMode which need updatedInput paired)
  deny  → prevents the call; reason shown TO CLAUDE
  ask   → prompts user; label shows source: [settings] / [plugin:<name>] / [skill]
  defer → -p mode only; exits with stop_reason "tool_deferred", resume via claude -p --resume <session-id>
Multi-hook precedence: deny > defer > ask > allow
Deny and ask RULES still evaluate regardless of hook output.
updatedInput REPLACES the whole input object; permission rules and Bash auto-background eligibility are evaluated against the hook's returned input.
Deprecated aliases: "approve"→"allow", "block"→"deny".

### Exit codes
0  — success. stdout parsed as JSON only if it starts with `{` AND ends with `}`.
     Plain-text stdout becomes CONTEXT only on: UserPromptSubmit, UserPromptExpansion, SessionStart, PostModelSwitch.
     stderr → debug log only; Claude never sees it.
2  — BLOCKING. Blocks regardless of JSON; even permissionDecision:"allow" cannot override.
     Message = JSON blocking reason if present, else stderr.
     JSON is still read on exit 2 (except Elicitation/ElicitationResult, where hookSpecificOutput is ignored).
     Valid-block + schema-invalid JSON still blocks (v2.1.214+), using stderr as the reason.
other — NON-BLOCKING error; action PROCEEDS. Exit 1 does NOT block.
     With schema-valid JSON on stdout, the exit code is IGNORED and the JSON alone decides.
     A hook that can't start (exit 127, bad path) lands here silently — watch for
     "Failed with non-blocking status code: /bin/sh: /path/to/hook.sh: No such file or directory".
Exception: WorktreeCreate fails creation on ANY nonzero exit.
Timeouts: a timed-out command/http/mcp_tool hook renders NO decision and does NOT block PreToolUse.
     (An Agent SDK callback hook that exceeds its timeout DOES block the tool call.)
     PreModelSwitch: a hook canceled at timeout BLOCKS the switch.

Canonical blocking script (verbatim from docs):
```bash
#!/bin/bash
input=$(cat)
command=$(jq -r '.tool_input.command' <<<"$input")
if [[ "$command" == rm* ]]; then
  echo "Blocked: rm commands are not allowed" >&2
  exit 2
fi
exit 0
```

### Handler common fields
type (required), if, timeout, statusMessage, once
timeout defaults: 600s command/http/mcp_tool; 30s prompt; 60s agent.
  Lowered to 30 on UserPromptSubmit, PreModelSwitch, PostModelSwitch; to 10 on MessageDisplay.
  SessionEnd hooks share a 1.5s budget (raisable to 60s).
`if` uses permission-rule syntax; ONE rule only (no && / || / lists). Evaluated ONLY on tool events; on any other event a hook with `if` set NEVER runs.
`if` Bash matching is BEST-EFFORT: leading VAR=value stripped; subcommands of && checked; $() and backticks checked; when Claude Code can't determine the commands it runs the hook anyway. Docs: "use the permission system rather than a hook to enforce a hard allow or deny."
`if` file-tool dirs: "Edit(src/**)" matches only ./src; use "Edit(**/src/**)" for any depth (changed in v2.1.214).
`once` honored ONLY in skill frontmatter; ignored in settings files and agent frontmatter.

Handler types:
  http: url, headers, allowedEnvVars   (+ allowedHttpHookUrls / httpHookAllowedEnvVars settings gate ALL sources incl. managed)
  mcp_tool: server, tool, input (supports ${tool_input.file_path})
  prompt: prompt, model
  agent: prompt  (experimental)

All matching hooks run in PARALLEL. Same handler in multiple settings files runs ONCE; a plugin's or skill's copy stays separate.

Hook locations: ~/.claude/settings.json, .claude/settings.json, .claude/settings.local.json, managed policy, plugin hooks/hooks.json, skill frontmatter, subagent frontmatter. Entries MERGE across levels.
allowManagedHooksOnly blocks user/project/local/plugin hooks (managed-force-enabled plugins exempt) and narrows statusLine/fileSuggestion/subagentStatusLine to managed settings.

Warning: PreToolUse does NOT fire for files added via @ in a prompt (no tool call happens) — use a Read deny rule. Also never fires for EndConversation.

=====================================================================
5. PLUGINS
=====================================================================
### .claude-plugin/plugin.json (OPTIONAL; name is the only required field)
```json
{
  "name": "plugin-name",
  "displayName": "Plugin Name",
  "version": "1.2.0",
  "description": "Brief plugin description",
  "author": { "name": "Author Name", "email": "author@example.com", "url": "https://github.com/author" },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "metadata": { "catalogId": "cat-123", "tier": "pro" },
  "skills": "./custom/skills/",
  "commands": ["./custom/commands/special.md"],
  "agents": ["./custom/agents/reviewer.md"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "outputStyles": "./styles/",
  "lspServers": "./.lsp.json",
  "experimental": { "themes": "./themes/", "monitors": "./monitors.json" },
  "dependencies": ["helper-lib", { "name": "secrets-vault", "version": "~2.1.0" }]
}
```
Plus: $schema, defaultEnabled (bool), userConfig (object), channels (array), workflows (string|array).
`skills` ADDS to the default skills/ scan; commands/agents/workflows/outputStyles/themes REPLACE their defaults.
Unrecognized top-level fields are IGNORED (so one manifest can double as a VS Code / npm / MCPB manifest). `claude plugin validate` reports them as warnings; --strict makes them errors.
Wrong-type recognized field: most → plugin fails to load; experimental/metadata → ignored with a warning.

### Directory layout
```
enterprise-plugin/
├── .claude-plugin/plugin.json   ← ONLY this goes inside .claude-plugin/
├── skills/<name>/SKILL.md
├── commands/*.md
├── agents/*.md
├── workflows/*.js
├── output-styles/*.md
├── themes/*.json
├── monitors/monitors.json
├── hooks/hooks.json
├── bin/                         ← added to Bash tool PATH; bare-command invokable
├── settings.json                ← ONLY `agent` and `subagentStatusLine` keys supported
├── .mcp.json
├── .lsp.json
├── scripts/
├── LICENSE
└── CHANGELOG.md
```
A CLAUDE.md at plugin root is NOT loaded as project context — ship instructions as a skill.

### .claude-plugin/marketplace.json (repository root)
```json
{
  "name": "company-tools",
  "owner": { "name": "DevTools Team", "email": "devtools@example.com" },
  "plugins": [
    { "name": "code-formatter", "source": "./plugins/formatter",
      "description": "Automatic code formatting on save", "version": "2.1.0",
      "author": { "name": "DevTools Team" } },
    { "name": "deployment-tools",
      "source": { "source": "github", "repo": "company/deploy-plugin" },
      "description": "Deployment automation tools" }
  ]
}
```
Required: name, owner{name}, plugins[]. Optional: $schema, description, version, metadata.pluginRoot, allowCrossMarketplaceDependenciesOn, renames.
Plugin entry required: name, source. Entry may carry ANY plugin.json field plus marketplace-only: source, category, tags, strict, relevance, headers, headersHelper.
RESERVED marketplace names (third parties cannot use): claude-code-marketplace, claude-code-plugins, claude-plugins-official, claude-plugins-community, claude-community, anthropic-marketplace, anthropic-plugins, agent-skills, anthropic-agent-skills, knowledge-work-plugins, life-sciences, claude-for-legal, claude-for-financial-services, financial-services-plugins, first-party-plugins, healthcare.

### Sources
relative string "./my-plugin" (must start ./ unless bare name under metadata.pluginRoot)
github  {repo, ref?, sha?}
url     {url, ref?, sha?}
git-subdir {url, path, ref?, sha?}   (sparse clone)
npm     {package, version?, registry?}
archive {url, sha256?}                (v2.1.224+, no git/npm needed)
command {command, timeout?, mode?}    (v2.1.229+, re-run once per session)
When both ref and sha are set, sha is the effective pin.
Marketplace sources support ref but NOT sha; plugin sources support both.
Installed plugins are copied to ~/.claude/plugins/cache (except command sources in link mode).

### CLI
claude plugin marketplace add <source> [--scope user|project|local] [--sparse <paths...>]
  <source> = owner/repo (with @ref), git URL (with #ref), URL to marketplace.json, or local path
  URLs must include the scheme (v2.1.196+ rejects bare hosts)
claude plugin install <plugin>@<marketplace> [-s|--scope user|project|local] [--config k=v] [-y|--yes]
  --scope project writes enabledPlugins to .claude/settings.json
In-session: /plugin marketplace add ..., /plugin install ...@..., /reload-plugins, /plugin uninstall <name>@<marketplace>
Other: plugin init, uninstall, prune, enable, disable, update, list, details, tag, validate [--strict]

Skills-directory plugins: drop .claude-plugin/plugin.json into a skill folder → loads as <name>@skills-dir, can bundle agents/hooks/MCP. Project-level requires workspace trust.

=====================================================================
6. SETTINGS PRECEDENCE + PERMISSIONS
=====================================================================
Files: ~/.claude/settings.json (user) | .claude/settings.json (shared project) | .claude/settings.local.json (project local) | managed-settings.json (+ MDM, server-managed)

Precedence, highest first:
1 Managed settings (managed-settings.json, MDM policy, server-managed from claude.ai console)
2 Command line args (incl. --settings <file-or-json>, merged key-by-key)
3 .claude/settings.local.json
4 .claude/settings.json
5 ~/.claude/settings.json
Env vars are NOT a level — resolved per key-pair (ANTHROPIC_MODEL beats the `model` key from any file; ANTHROPIC_DEFAULT_MODEL applies only when no file sets model).
LIST keys (permissions.allow etc.) MERGE across files. Never-merged: fallbackModel, modelPicker, availableModels, modelSettings.
Managed Linux path in containers: /etc/claude-code/managed-settings.json

### permissions object
Type: object with allow, ask, deny, additionalDirectories, defaultMode, disableBypassPermissionsMode, disableAutoMode
```json
{
  "permissions": {
    "allow": ["Bash(npm run *)"],
    "ask": ["Bash(git push *)"],
    "deny": ["Read(./.env)"],
    "defaultMode": "acceptEdits"
  }
}
```
Evaluation: deny → ask → allow. First match wins; SPECIFICITY IS IRRELEVANT. A broad deny cannot carry allowlist exceptions.
Bare tool name in deny (`Bash`) removes the tool from Claude's context entirely; scoped (`Bash(rm *)`) leaves it available. Bash(*) ≡ Bash.
EndConversation cannot be removed by a deny rule while any other tool remains, and ask never prompts for it.

Rule syntax: Tool or Tool(specifier)
  Bash(npm run build)           exact
  Read(./.env)
  WebFetch(domain:example.com)
Parameter matching (deny/ask ONLY): Tool(param:value)
  Agent(model:opus), Agent(isolation:worktree), Bash(run_in_background:true)
  * wildcard supported in the value; omitted params never match; compared against literal pre-normalization input.
  Primary content fields NOT matchable: command, file_path, path, notebook_path, url. Bash(command:rm *) is ignored + startup warning.
Tool-name globs: deny/ask accept "*" and "mcp__*". Allow accepts globs only after a literal mcp__<server>__ prefix (server segment must be glob-free). Unanchored allow globs ("*", "B*", "mcp__*") are SKIPPED with a warning.
Settings-file mcp__ rules WITH parentheses are skipped; use --disallowedTools for MCP param rules.
Rules match CANONICAL tool names (transcript label "Stop Task" is canonically TaskStop).

Wildcard table (verbatim):
  Bash(npm run build)   matches `npm run build`; NOT `npm run build --watch`
  Bash(npm run *)       matches `npm run build`, `npm run test --watch`, `npm run`; NOT `npm install`
  Bash(git log * main)  matches `git log --oneline main`; NOT `git log main`
  Bash(git * main)      matches `git merge main`, `git push origin main`, `git -c core.fsmonitor=<script> diff main`
  Bash(* --version)     matches `node --version`, `bash -c 'echo hi' --version`; NOT `node -v`
  Bash(ls *)            matches `ls -la`, `ls`; NOT `lsof`
  Bash(ls*)             matches `ls -la` AND `lsof`
  Bash(* --help *)      matches `npm --help x`; NOT `npm --help`
`Bash(ls:*)` ≡ `Bash(ls *)`; the :* form is recognized only at the END of a pattern.

Modes: default (labeled Manual; alias `manual`), acceptEdits, plan, auto, dontAsk, bypassPermissions.
"Yes, and don't ask again" saves to .claude/settings.local.json at the GIT REPO ROOT (worktree-resolved) as of v2.1.211.

=====================================================================
7. .mcp.json
=====================================================================
Project root, checked into version control. Top-level key: mcpServers.
```json
{
  "mcpServers": {
    "shared-server": { "type": "http", "url": "https://example.com/mcp" }
  }
}
```
type: "http" (alias "streamable-http"), "sse" (DEPRECATED), "ws", or omitted = stdio.
stdio keys: command, args, env. HTTP/SSE keys: url, headers (+ oauth object with authServerMetadataUrl).
Per-server: "timeout": 600000 (ms) overrides MCP_TOOL_TIMEOUT for that server.
A url with NO type is a config error:
  MCP server "<name>" has a "url" but no "type"; add "type": "http" (or "sse" / "ws") to this entry
Env expansion: ${VAR} and ${VAR:-default}, in command, args, and env.
CLAUDE_PROJECT_DIR is set in the SERVER's env, not Claude Code's — so referencing it in a project .mcp.json needs ${CLAUDE_PROJECT_DIR:-.}. Plugin MCP configs substitute it directly.
Scope precedence: local > project (.mcp.json) > user (~/.claude.json) > plugin > claude.ai connectors. Whole entry from the winner; no field merging.
Project servers need interactive approval; reset with `claude mcp reset-project-choices`. Skipped in claude -p / SDK / cloud sessions. Block with disabledMcpjsonServers, --setting-sources, or --strict-mcp-config.
Statuses: "⏸ Pending approval (run `claude` to approve)", "✘ Rejected (see disabledMcpjsonServers in settings)".
CLI: claude mcp add --transport http|sse|stdio <name> <url|-- command args>; claude mcp add-json; --scope local|project|user. For stdio, `--` separates Claude's options from the server command.

=====================================================================
8. CLAUDE.md
=====================================================================
Load order (broadest → most specific; concatenated, NOT overriding):
  Managed policy: macOS /Library/Application Support/ClaudeCode/CLAUDE.md
                  Linux+WSL /etc/claude-code/CLAUDE.md
                  Windows C:\Program Files\ClaudeCode\CLAUDE.md
  User:    ~/.claude/CLAUDE.md
  Project: ./CLAUDE.md  OR  ./.claude/CLAUDE.md
  Local:   ./CLAUDE.local.md  (gitignore it)
Directory tree: root → cwd, so nearer files are read LAST. Within a directory, CLAUDE.local.md is appended AFTER CLAUDE.md.
Subdirectory CLAUDE.md/CLAUDE.local.md load ON DEMAND when Claude reads files there.
Block-level HTML comments <!-- ... --> are STRIPPED before injection (free maintainer notes); preserved inside code blocks and when read with the Read tool.
Size guidance: target under 200 lines per file.
Exclusions: claudeMdExcludes setting.
--add-dir CLAUDE.md files are NOT loaded unless CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 (then loads CLAUDE.md, .claude/CLAUDE.md, .claude/rules/*.md, CLAUDE.local.md).

Imports: @path/to/import — relative (to the IMPORTING FILE) or absolute; recursive max depth FOUR. Skipped inside code spans/fences (`` `@README` `` stays literal).
External imports in a PROJECT file (resolving outside cwd) → one-time approval dialog; decline is permanent. User-scope files trusted without the dialog (except Cowork desktop sessions, which skip such imports entirely).

AGENTS.md: NOT read by Claude Code. Workaround = CLAUDE.md containing `@AGENTS.md`, or `ln -s AGENTS.md CLAUDE.md` (Windows symlinks need Admin/Developer Mode → prefer the import).
/init reads .cursor/rules/, .cursorrules, .github/copilot-instructions.md. With CLAUDE_CODE_NEW_INIT=1 it also reads AGENTS.md, .devin/rules/, .windsurf/rules/, .windsurfrules, .clinerules.
/import (v2.1.213+) appends a one-time copy of AGENTS.md etc. and carries over MCP servers, commands, subagents, skills.

.claude/rules/*.md: recursive .md discovery; no-frontmatter rules load at launch with the same priority as .claude/CLAUDE.md; `paths:` frontmatter (glob list) scopes a rule to matching files. Skipped when `project` is excluded from --setting-sources.

=====================================================================
9. DEVCONTAINERS
=====================================================================
Doc page: https://code.claude.com/docs/en/devcontainer (formerly .../claude-code/devcontainer)

Feature install (.devcontainer/devcontainer.json):
```json
{
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": { "ghcr.io/anthropics/devcontainer-features/claude-code:1.0": {} }
}
```
Feature repo: https://github.com/anthropics/devcontainer-features/tree/main/src/claude-code
The :1.0 tag pins the FEATURE INSTALL SCRIPT, not the Claude Code release. Feature installs latest CLI, which auto-updates in-container by default.
Installs the VS Code extension too (other editors ignore it). Installs Node.js when the base image lacks it; on "Failed to install Node.js and npm" add "ghcr.io/devcontainers/features/node:1": {} ABOVE the claude-code feature.

Persist auth across rebuilds (remoteUser: node):
```json
"mounts": ["source=claude-code-config,target=/home/node/.claude,type=volume"],
"containerEnv": { "CLAUDE_CONFIG_DIR": "/home/node/.claude" }
```
Reason both are needed: ~/.claude.json (OAuth account, personal MCP servers, per-project trust) lives OUTSIDE ~/.claude.
Per-project isolation: source=claude-code-config-${devcontainerId} (what the reference uses).
Codespaces: ~/.claude survives stop/start, cleared on REBUILD. Carry auth via ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`) as a Codespaces secret.

Org policy: /etc/claude-code/managed-settings.json, highest precedence.
  RUN mkdir -p /etc/claude-code
  COPY managed-settings.json /etc/claude-code/managed-settings.json

PERMISSION-SKIPPING FLAG: --dangerously-skip-permissions
  Rejected when launched as root → remoteUser must be non-root.
  Docs pair it with network egress restriction.
  Suggested safer alternative: auto mode.
  Admin block: permissions.disableBypassPermissionsMode = "disable" in managed settings.
  Warning verbatim: "When executed with --dangerously-skip-permissions, dev containers do not prevent a malicious project from exfiltrating anything accessible inside the container, including the Claude Code credentials stored in ~/.claude." Avoid mounting ~/.ssh or cloud credential files.

Reference container: https://github.com/anthropics/claude-code/tree/main/.devcontainer — an EXAMPLE, not a maintained base image. Three files:
  .devcontainer/devcontainer.json  — volume mounts, runArgs capabilities, VS Code extensions, containerEnv
  .devcontainer/Dockerfile         — base image, dev tools, Claude Code install
  .devcontainer/init-firewall.sh   — restricts outbound traffic
Firewall needs NET_ADMIN + NET_RAW added via runArgs; neither the script nor the caps are required for Claude Code itself.
Allowed-domain reference: /docs/en/network-config#network-access-requirements and /docs/en/data-usage#telemetry-services