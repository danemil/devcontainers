---
name: devcontainer-author
description: Create or modify a devcontainer.json, citing the specification for every default and property introduced.
argument-hint: what the dev container should provide (language, tools, services)
agent: agent
---

Use the `devcontainers` skill in **AUTHOR** mode.

Task: ${input:task:describe what this dev container needs to provide}

Follow the skill's AUTHOR rules of engagement. In particular:

- Load `references/spec-facts.md` before writing. If it cannot be read, say so in your
  first sentence and continue in the narrowed mode the skill defines — do not introduce a
  property, assert a default, or claim a CLI flag exists from memory.
- State every default explicitly and cite it, taking the value from the rule or the
  specification rather than from recall.
- Cite rule IDs with their tier, as `DC-XXX-NNN [TIER]`.
- Run the skill's "After writing" checks before telling me it is done.
