---
name: devcontainer-debug
description: Diagnose a dev container that fails to build, starts slowly, ignores changes, or behaves differently from the host.
argument-hint: the symptom, plus the first lines of any error output
agent: agent
---

Use the `devcontainers` skill in **DEBUG** mode.

Symptom: ${input:symptom:describe what is going wrong}

Follow the skill's DEBUG routing. In particular:

- Ask me for the actual error text before theorising, if I have not already pasted it.
- Match the symptom to one of the skill's headings, work that list in order, and stop at
  the first cause that actually explains the behaviour.
- The symptom lists route to a rule and deliberately carry none of its claim. Open the
  rule in `references/rules.md` before asserting anything normative — or say plainly that
  you could not, and name the ID for me to look up.
- An honest dead end is the correct output. Do not invent a mechanism to close the gap.
