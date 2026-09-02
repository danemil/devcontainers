---
name: devcontainer-audit
description: Audit a devcontainer.json against the cited rule corpus and report findings, without editing anything.
argument-hint: optional path to a devcontainer.json or .devcontainer/ directory
agent: agent
---

Use the `devcontainers` skill in **AUDIT** mode.

Audit ${input:target:the dev container configuration in this workspace}.

Follow the skill's AUDIT procedure exactly. In particular:

- Load `references/rules.md` before reporting anything. If it cannot be read, say so and
  stop — an audit from memory is worse than no audit.
- Read and report only. **Do not edit any file.** If I ask you to fix what you found,
  announce the switch to AUTHOR mode first.
- Emit the skill's report format: the header line, the findings, the not-checked block,
  then the tally. Print each finding's tier with its ID, as `DC-XXX-NNN [TIER]`.
- Name what you could not see — the image metadata label, private Feature contents, the
  resolved install order — as "not checked" rather than assuming it.
