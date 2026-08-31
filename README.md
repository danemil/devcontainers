# devcontainers

A workspace for dev container research and tooling, configured so the **same project
instructions, skills, and MCP servers work across every AI coding host** rather than
being locked to one.

## What's here

**Shared instructions**, kept in sync across hosts — identical content, host-specific
filenames: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `QODER.md`, `.cursorrules`,
`.windsurfrules`, `.kiro/steering/`, `.github/`.

**MCP wiring** for [`code-review-graph`](https://pypi.org/project/code-review-graph/) —
a knowledge graph over the codebase used in place of grep/glob for structural queries
(callers, dependents, impact radius, test coverage). Configured for Claude Code
(`.mcp.json`), Cursor, VS Code, Kiro, Qoder, opencode, and Gemini.

**Skills** — `debug-issue`, `explore-codebase`, `refactor-safely`, `review-changes`,
provided for both Claude (`.claude/skills/`) and Gemini (`.gemini/skills/`).

**Hooks** — session-start and post-edit hooks that keep the graph incrementally updated.

## tools/

### `wf-preflight.mjs`

Validates a Claude Code **Workflow** script before you invoke it.

```sh
node tools/wf-preflight.mjs <script.js>
```

It catches the failure mode the Workflow parser reports badly: a markdown backtick in
prose inside a backtick-delimited agent prompt silently closes the template literal, so
the parser blames the *next word* — `Unexpected identifier 'customizations'` — and never
mentions backticks. It also reports only the first such site, making a multi-site script
take one failed round trip per site to fix.

Detecting stray backticks directly is undecidable (`` `str`.length `` and a markdown span
before a period lex identically), so the tool checks the two things that *are* decidable:
whether the script parses in the runtime's async context, and whether any prompt uses a
multi-line template literal. Prose belongs in double-quoted lines instead, where
backticks, `${...}` and apostrophes are all inert:

```js
prompt: [
  "5. The `customizations` namespace, esp. `customizations.vscode`.",
  "Slash commands use ${input:...} and !`bash` execution.",
].join("\n")
```

## Note on portability

The MCP configs hardcode the absolute path `/Users/emildan/work/devcontainers` as the
server `cwd`. Update those if you clone this elsewhere.
