RAW NOTES — GitHub Copilot customization surfaces, verified Aug 2026

=====================================================================
1. REPOSITORY CUSTOM INSTRUCTIONS
=====================================================================
Path: .github/copilot-instructions.md
Format: plain Markdown. No frontmatter required (frontmatter is a feature of
        *.instructions.md, not this file).
Applied: automatically to every request made in that repository's context.
Enabling in VS Code: the old settings-based path
  github.copilot.chat.codeGeneration.instructions  -> DEPRECATED as of VS Code 1.102.
  (I could not find github.copilot.chat.codeGeneration.useInstructionFiles named
   on the current page at all — it appears to have been retired along with the
   deprecation. FLAG: do not cite it as current.)
Current VS Code settings that govern instructions:
  chat.instructionsFilesLocations
  chat.useAgentsMdFile
  chat.useNestedAgentsMdFiles           (experimental)
  chat.useClaudeMdFile
  chat.includeApplyingInstructions      (pattern-based / applyTo)
  chat.includeReferencedInstructions    (follow Markdown links)
  chat.useCustomizationsInParentRepositories  (monorepo: walks up to .git)
  github.copilot.chat.organizationInstructions.enabled
  github.copilot.chat.reviewSelection.instructions
  github.copilot.chat.commitMessageGeneration.instructions
  github.copilot.chat.pullRequestDescriptionGeneration.instructions

SIZE LIMIT: historical 4000-char truncation for Copilot code review — REMOVED.
No current documented hard cap. Soft guidance: ~1000 lines/file max.

Monorepo discovery: VS Code walks up the folder hierarchy to a .git folder and
collects customizations from every intermediate folder.

=====================================================================
2. PATH-SPECIFIC INSTRUCTIONS
=====================================================================
Workspace path: .github/instructions/NAME.instructions.md   (nested dirs OK)
User path:      ~/.copilot/instructions/*.instructions.md
Claude-format:  .claude/rules  (user level) — uses `paths:` array, default ["**"]

Frontmatter:
---
name: string          # display name; defaults to filename
description: string   # shown on hover
applyTo: glob         # e.g. '**/*.ts,**/*.tsx'  or  '**'
---

applyTo semantics:
  - relative to workspace root
  - '**' = all files
  - MULTIPLE patterns go in ONE string, comma-separated: '**/*.ts,**/*.tsx'
    (not a YAML list)

Real example from docs:
---
name: 'Python Standards'
description: 'Coding conventions for Python files'
applyTo: '**/*.py'
---

PRECEDENCE (docs.github.com/en/copilot/concepts/response-customization),
high -> low:
  1. Personal instructions
  2. Path-specific  (.github/instructions/**/*.instructions.md)
  3. Repository-wide (.github/copilot-instructions.md)
  4. Agent          (AGENTS.md / CLAUDE.md / GEMINI.md)
  5. Organization
"All relevant instructions are provided to Copilot, though higher-priority ones
take precedence."

CONFLICTING VS CODE PRECEDENCE (code.visualstudio.com), high -> low:
  1. Personal (user-level)
  2. Repository (.github/copilot-instructions.md OR AGENTS.md)   <-- same tier
  3. Organization
=> VS Code flattens copilot-instructions.md and AGENTS.md together; GitHub ranks
   copilot-instructions.md above AGENTS.md. FLAG THIS.

CLI: "does not define a general precedence order between these files."
   Duplicates removed, no ranking.

=====================================================================
3. PROMPT FILES
=====================================================================
Path: .github/prompts/NAME.prompt.md  (workspace default)
      + user-profile location (VS Code profile data dir; Settings Sync capable)
Extra locations: chat.promptFilesLocations
Monorepo: chat.useCustomizationsInParentRepositories

Frontmatter (ALL OPTIONAL):
  description     - brief summary
  name            - identifier used after '/' in chat; defaults to filename
  argument-hint   - guidance text shown in chat input
  agent           - 'ask' | 'agent' | 'plan' | <custom agent name>
                    *** NOTE: key is `agent`, NOT the older `mode` ***
  model           - language model selection
  tools           - list; '<server name>/*' includes all tools of an MCP server

Invocation:
  1. type '/' + prompt name in chat
  2. Command Palette -> "Chat: Run Prompt"
  3. play button in editor title bar of an open .prompt.md

Variables:
  ${input:variableName}
  ${input:variableName:placeholder}
  ${selection}
  ${workspaceFolder}
  ${fileBasename}
  ...other built-in VS Code variables
Tool reference inside body text: #tool:<tool-name>

=====================================================================
4. CUSTOM CHAT MODES -> RENAMED "CUSTOM AGENTS"
=====================================================================
*** .chatmode.md IS DEPRECATED. ***
Docs: "Custom agents were previously known as custom chat modes. The
functionality remains the same, but the terminology has been updated to better
reflect their purpose." and "If you have existing .chatmode.md files, rename
them to .agent.md"

Current: NAME.agent.md
Locations:
  workspace: .github/agents/     (also .claude/agents/ for Claude format)
  user:      ~/.copilot/agents
Setting: chat.agentFilesLocations   (replaces chat.modeFilesLocations)

Frontmatter (VS Code full set):
  description   (REQUIRED per GitHub reference)
  name
  argument-hint
  tools
  agents
  model
  user-invocable            default true
  disable-model-invocation  default false
  target                    'vscode' | 'github-copilot' (default: both)
  mcp-servers               object; NOT used in VS Code/IDEs
  metadata                  object; NOT used in VS Code/IDEs
  handoffs
  hooks
RETIRED: `infer` — split into user-invocable + disable-model-invocation.
NOT supported on cloud agent (github.com): argument-hint, handoffs.
Body limit: 30,000 characters.

Invocation: agent picker in chat; CLI via --agent=NAME or /agent.

=====================================================================
5. AGENTS.md
=====================================================================
YES, Copilot reads it.
GitHub docs: AGENTS.md / CLAUDE.md / GEMINI.md — "Searched in root and nested
directories." Grouped as "Agent instructions"; ranked BELOW
.github/copilot-instructions.md in GitHub's 5-tier precedence.

VS Code:
  AGENTS.md at workspace root — enabled via chat.useAgentsMdFile
  Nested AGENTS.md in subfolders — EXPERIMENTAL, chat.useNestedAgentsMdFiles
  CLAUDE.md — chat.useClaudeMdFile; searched at workspace root, .claude/CLAUDE.md,
    and ~/.claude/CLAUDE.md

Copilot CLI: YES. Reads AGENTS.md, CLAUDE.md, GEMINI.md.
CLI discovery scope: repo root + cwd + intermediate dirs between them + any dirs
nested in the path of a file it is working on.
CLI also reads:
  .github/copilot-instructions.md
  .github/instructions/**/*.instructions.md   (standard locations only, NOT
                                                intermediate dirs)
  $HOME/.copilot/copilot-instructions.md
  $HOME/.copilot/instructions/**/*.instructions.md
  dirs named by COPILOT_CUSTOM_INSTRUCTIONS_DIRS

SUPPORT MATRIX (docs.github.com/en/copilot/reference/custom-instructions-support)
Agent instructions (AGENTS.md/CLAUDE.md/GEMINI.md) supported on:
  github.com cloud agent YES, github.com code review YES, github.com Chat NO
  VS Code Chat YES, VS Code cloud agent YES, VS Code code review NO
  Visual Studio: NO (all three)
  JetBrains: Chat NO, cloud agent YES, code review NO
  Eclipse: cloud agent YES only
  Xcode: cloud agent YES only
  Copilot CLI YES
Repository instructions (.github/copilot-instructions.md): supported nearly
  everywhere (only Eclipse code review is NO).
Path-specific: NOT supported in github.com Chat, VS Code code review, Visual
  Studio code review, Eclipse Chat, Eclipse code review.
Personal: only github.com Chat, JetBrains Chat, Copilot CLI.
Organization: only github.com surfaces (Chat, cloud agent, code review).
Org instructions require Copilot Business or Enterprise; set by org owners.

=====================================================================
6. AGENT SKILLS / SKILL.md  ***GA***
=====================================================================
STATUS: GA (generally available). VS Code docs say so explicitly.
Announced: github.blog changelog 2025-12-18 "GitHub Copilot now supports Agent Skills"
Described as "an open standard" following the Agent Skills specification;
docs point at anthropics/skills and github/awesome-copilot as sources.
=> YES, this is Anthropic-style SKILL.md progressive disclosure, interoperable.

DIRECTORIES
  Project:  .github/skills/
            .claude/skills/
            .agents/skills/
  Personal: ~/.copilot/skills/
            ~/.claude/skills/
            ~/.agents/skills/
  Extra project locations: chat.agentSkillsLocations (VS Code setting)

Layout: one directory per skill, lowercase-hyphenated, containing SKILL.md.
  e.g. .github/skills/webapp-testing/SKILL.md
Skill dirs are "folders of instructions, scripts, and resources".

FRONTMATTER
 REQUIRED:
   name         lowercase letters/numbers/hyphens only, MAX 64 chars,
                typically matches the directory name
   description  what it does + when Copilot should use it, MAX 1024 chars
 OPTIONAL:
   license          license text/description
   allowed-tools    pre-approves tools (e.g. `shell`) without confirmation prompt
   argument-hint    hint text for slash-command usage
   user-invocable   default true  (controls slash command visibility)
   disable-model-invocation  default false (restricts automatic loading)
   context: fork    EXPERIMENTAL — runs skill in a subagent / forked context
                    ("might change or be removed")
 PROVENANCE (written by `gh skill` on install):
   source repository, ref, tree SHA — used by `gh skill update` to detect
   upstream changes.

PROGRESSIVE DISCLOSURE (3 levels, verbatim):
  1. Discovery phase: Copilot reads skill name and description from frontmatter
     to determine relevance
  2. Instructions loading: the SKILL.md body loads into context when matched or
     explicitly invoked
  3. Resource access: referenced files load only when the agent actually needs them

SURFACES SUPPORTING SKILLS:
  Copilot cloud agent, Copilot code review, GitHub Copilot CLI, the GitHub
  Copilot app, agent mode in VS Code and JetBrains IDEs.

MANAGEMENT
  gh skill  (GitHub CLI) — discover/install/update  [changelog 2026-04-16]
  copilot skill list|add|remove  (terminal)
  In-session slash commands:
    /skills list
    /skills info [SKILL-NAME]
    /skills add
    /skills reload
    /skills remove [SKILL-DIRECTORY]

vs PROMPT FILES: skills are model-invoked by default via description matching
(progressive disclosure); prompt files are user-invoked templates. Skills also
carry supporting files/scripts; prompt files are a single .md.

=====================================================================
7. COPILOT CLI
=====================================================================
INSTALL
  npm install -g @github/copilot        (Node.js 22+)
  brew install --cask copilot-cli
  winget install GitHub.Copilot
  curl -fsSL https://gh.io/copilot-install | bash
  PowerShell v6+ required on Windows
INVOKE: `copilot`
AUTH: /login  OR fine-grained PAT with "Copilot Requests" permission exported as
      COPILOT_GITHUB_TOKEN | GH_TOKEN | GITHUB_TOKEN

CONFIG FILES  (~/.copilot , or $HOME\.copilot\ on Windows; relocate w/ COPILOT_HOME)
  config.json              - contains trustedFolders array
  mcp-config.json          - MCP servers
  permissions-config.json  - saved tool approvals

READS (customization):
  YES: AGENTS.md, CLAUDE.md, GEMINI.md
  YES: .github/copilot-instructions.md
  YES: .github/instructions/**/*.instructions.md  (applyTo honored)
  YES: $HOME/.copilot/copilot-instructions.md, $HOME/.copilot/instructions/
  YES: skills (.github/skills, .claude/skills, .agents/skills, ~/.copilot/skills,
       ~/.agents/skills)
  YES: custom agents .agent.md (.github/agents/NAME.agent.md; home dir wins on conflict)
  YES: MCP (~/.copilot/mcp-config.json)
  YES: hooks (shell command at session lifecycle points)
  NOT DOCUMENTED / apparently NO: .github/prompts/*.prompt.md, *.chatmode.md
    -> the CLI feature-comparison page lists ONLY instructions, agents, skills,
       MCP, hooks. Absence of evidence, but consistent. FLAG.

TOOL PERMISSION FLAGS
  --allow-tool=TOOL_SPEC
  --deny-tool=TOOL_SPEC
  --allow-all-tools
  --available-tools
  --allow-all-paths
  --disallow-temp-dir
  --allow-all-urls
  --allow-url=DOMAIN
  --deny-url=DOMAIN
  --allow-all   (alias --yolo)
  RULE: deny ALWAYS beats allow, even under --allow-all or a saved approval in
        permissions-config.json.

PERMISSION PATTERN SYNTAX:  Kind(argument)
  argument optional; omitting matches all tools of that kind
  Kinds: shell, write (non-shell file modification), MCP_SERVER_NAME
  Shell stem matching: `:*` suffix matches stem + space
     shell(git:*) matches "git push"/"git pull", does NOT match "gitea"
  Example: copilot --allow-tool='shell'

HEADLESS / PROGRAMMATIC
  -p PROMPT   execute prompt non-interactively, exit when done
  -s          suppress stats/decoration, output only the agent's response
              (for piping in scripts)
  --share=PATH      export transcript after completion
  --share-gist      publish transcript to a GitHub gist (CI use)
  Examples:
    copilot -p "What does this project do?" -s
    copilot -p "Fix the race condition in the worker pool" \
      --model gpt-5.3-codex --allow-tool='write, shell'
    copilot -p "Review the latest commit" --allow-tool='shell' --agent code-review
  NOT DOCUMENTED: exit codes, stdin piping, JSON/stream output formats, session
  resumption in programmatic mode.

OTHER FLAGS VERIFIED: --model, --agent=NAME, --resume, --continue, --cloud
NOT VERIFIED (do not cite): --log-level, --log-dir, --no-color, --screen-reader,
  --banner, --disable-builtin-mcps

SUBCOMMANDS: copilot login (--host --web-flow --device-code --with-token),
  copilot completion SHELL, copilot plugins list|enable|disable|remove,
  copilot skill, copilot mcp add, copilot update, copilot version

SLASH COMMANDS: /login /resume /agent /add-dir /cwd /cd /every /after /settings
  /usage /context /compact /sandbox /mcp /mcp add /feedback /diff /permissions
  /allow-all /yolo /autopilot [OBJECTIVE] (alias /goal) /skills*

BUILT-IN AGENTS: Explore, Task, General purpose, Code review, Research, Rubber duck
BUILT-IN MCP: GitHub MCP server preconfigured.

=====================================================================
8. MCP CONFIG — VS CODE vs CLAUDE
=====================================================================
VS Code workspace file: .vscode/mcp.json
VS Code user file:      ~/.copilot/mcp-config.json   <-- SAME FILE AS THE CLI
  (commands: "MCP: Open User Configuration", "MCP: Open Remote User Configuration")
Claude: .mcp.json (project) / ~/.claude.json etc.

*** KEY DIFFERENCE #1: top-level key ***
  VS Code / Copilot : "servers"
  Claude Code       : "mcpServers"
  VS Code docs never mention "mcpServers" as an alias. NOT verified either way.

*** KEY DIFFERENCE #2: VS Code has a top-level "inputs" ARRAY. Claude has none. ***

Top-level shape:
{
  "servers": {},
  "inputs": [],
  "sandbox": {}
}

stdio server:
{
  "servers": {
    "myServer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "cwd": "${workspaceFolder}",
      "env": {"API_KEY": "${input:api-key}"},
      "envFile": "${workspaceFolder}/.env",
      "dev": {"watch": "src/**/*.ts"},
      "sandboxEnabled": false
    }
  }
}

http/sse server:
{
  "servers": {
    "remoteServer": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {"Authorization": "Bearer ${input:api-token}"},
      "oauth": {"clientId": "example-client-id", "enterpriseManaged": false}
    }
  }
}

inputs array:
{
  "inputs": [
    {"type":"promptString","id":"api-key","description":"API Key","password":true,
     "default":"optional-default"},
    {"type":"pickString","id":"environment","description":"Select environment",
     "options":["dev","prod"],"default":"dev"},
    {"type":"command","id":"token","command":"extension.getToken","args":{}}
  ]
}

Simple real example from docs:
{
  "servers": {
    "github": {"type": "http", "url": "https://api.githubcopilot.com/mcp"},
    "playwright": {"command": "npx", "args": ["-y", "@microsoft/mcp-server-playwright"]}
  }
}

Variables: ${input:variable-id} ${env:VARIABLE_NAME} ${workspaceFolder} ${userHome}
type values: "stdio" | "http" | "sse"
Sandboxing (macOS/Linux only): per-server "sandboxEnabled": true PLUS a
  top-level "sandbox" object defining filesystem and network access rules.

SUMMARY OF DIFFS vs Claude .mcp.json:
  servers            vs  mcpServers
  inputs[] array     vs  (none)
  ${input:id}        vs  (none; Claude uses ${VAR} / env expansion)
  type: stdio|http|sse  vs  Claude type: stdio|sse|http (similar)
  envFile, cwd, dev, sandboxEnabled, oauth, headers  -> VS Code extras
  command/args/env   -> same in both

=====================================================================
9. COPILOT CODING AGENT (CLOUD) + DEVCONTAINER
=====================================================================
File: .github/workflows/copilot-setup-steps.yml
Must contain a SINGLE job named exactly `copilot-setup-steps`:
  "The job MUST be called copilot-setup-steps or it will not be picked up by Copilot."
Customizable keys in that job: steps, permissions, runs-on, services, snapshot,
  timeout-minutes (MAX 59)
Runners: Ubuntu x64 Linux and Windows 64-bit ONLY.
Purpose: preinstall tools/deps before Copilot starts; upgrade to larger runners.
Failure behavior: a non-zero exit code makes Copilot SKIP remaining setup steps
  and begin work with the environment as-is (it does not abort the task).
Validation: runs as a normal Actions workflow — auto-runs on change, appears as a
  PR check; after merging to default branch, trigger manually from Actions tab.

DEVCONTAINER: *** NOT USED BY THE CODING AGENT. ***
The cloud agent runs in "its own ephemeral development environment, powered by
GitHub Actions". The customize-the-agent-environment page contains NO mention of
devcontainer.json. devcontainer.json appears in Copilot docs ONLY in the
Codespaces context (listing GitHub.copilot as an extension) — that is a different
product surface. So: a devcontainer affects Codespaces/local dev container
sessions, NOT the coding agent's cloud environment. Replicate the devcontainer's
setup as steps in copilot-setup-steps.yml instead.
Self-hosted runners: use ephemeral single-use runners (ARC / Actions Runner
Scale Set Client); do not reuse runners across jobs.

=====================================================================
NAMING CHANGES TO WATCH (2026)
=====================================================================
  .chatmode.md            -> .agent.md            (chat modes -> custom agents)
  chat.modeFilesLocations -> chat.agentFilesLocations
  prompt frontmatter `mode` -> `agent`
  agent frontmatter `infer` -> user-invocable + disable-model-invocation
  settings-based codeGeneration.instructions -> deprecated (VS Code 1.102)
  VS Code docs URL moved: /docs/copilot/customization/* -> /docs/agent-customization/*
    (both resolve; the agent-customization paths are the newer ones and
     /docs/copilot/customization/skills 404s — correct URL is
     /docs/agent-customization/agent-skills)
  MCP reference moved to /docs/agents/reference/mcp-configuration