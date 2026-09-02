I'm running in **AUDIT** mode (this agent is read-only by design — see below). Let me load the rules corpus and the config.

## devcontainers · AUDIT · .devcontainer/devcontainer.json · rules corpus 0.4.0

**Scope note:** This is a review-only agent. I audited but made **no edits** — AUDIT never modifies files by design. Discovery: only one config found (`.devcontainer/devcontainer.json`), no shadowed `.devcontainer.json` or nested folder variant. Tool probe: this surface cannot execute shell commands at all, so every supporting tool below is reported as not checked rather than assumed absent or present.

### Findings

```
DC-SEC-001  [SPEC]  ERROR  .devcontainer/devcontainer.json:8
  remoteEnv.TOKEN is a literal value "ghp_examplenotreal000000000000000000000000" —
  matches the ghp_ GitHub PAT prefix, not a placeholder like "changeme". The reference
  CLI writes remoteEnv into the devcontainer.metadata image label by default, so this
  literal is committed to the file AND baked into any image built from it.
  Fix: remove the literal. Declare the name under top-level "secrets" and pass the
  value via `--secrets-file` at `up`/`run-user-commands` time, or indirect it through
  "${localEnv:TOKEN}" if it must stay in remoteEnv.

DC-LIFE-002  [SPEC]  ERROR  .devcontainer/devcontainer.json:11
  waitFor is set to "postAttachCommand", which is not in the schema's enum
  (initializeCommand | onCreateCommand | updateContentCommand | postCreateCommand |
  postStartCommand). Not schema-validated by the CLI, so this reaches the tool
  unchallenged.
  Fix: if the intent is "block until my setup finishes," use "postCreateCommand".
  If the intent was the default, delete the property (default is
  "updateContentCommand").
```

### Observations (outside the corpus, no rule ID / no severity)

- `features["ghcr.io/devcontainers/features/docker-in-docker:latest"]` is unpinned. No rule in this corpus assigns an ID to Feature-version pinning specifically; AUTHOR mode's own guidance treats "pin versions you add" as `[OPINION]`, not a corpus rule, so I'm flagging it here rather than under a rule ID. Practical effect: the resolved Feature contents can change under you between rebuilds with no record of what changed.

### Not checked

```
not checked   JSON Schema conformance     no validator run — the CLI ships none, SchemaStore is editor-only
not checked   Dockerfile lint             hadolint not available (no shell on this surface)
not checked   image vulnerabilities       trivy not available (no shell on this surface)
not checked   image supply chain          docker scout not available (no shell on this surface)
not checked   image configuration         dockle not available (no shell on this surface)
not checked   devcontainer.json lint      decolint not available (no shell on this surface)
not checked   resolved Feature order      devcontainer CLI not available (no shell on this surface)
not checked   base image metadata         image not pulled — label unreadable

DC-LIFE-001  onCreateCommand/updateContentCommand absent from file; whether the label
             supplies them (and whether this project prebuilds) — image not pulled, no
             CI/workflow evidence found in repo, but the label input was never read
DC-FEAT-001  overrideFeatureInstallOrder absent, but the single Feature's own
             devcontainer-feature.json (dependsOn/installsAfter) was never read
DC-FEAT-002  same Feature manifest unread — cannot rule out a dependsOn edge pulling
             docker-in-docker in twice with different options
DC-PERF-001  no mounts/workspaceMount visible in file, but mounts merge as a collected
             list and the label could still add a volume entry — label not read
DC-USER-001  remoteUser/containerUser absent from file but not label-immune — label
             not read
DC-ENV-001   userEnvProbe absent from file but not label-immune — label not read
DC-LIFE-003  postStartCommand/postAttachCommand/onCreateCommand/updateContentCommand
             absent from file; label could supply any of them in object form — not read
DC-DEP-001   extensions/settings/devPort absent from file and explicitly not
             label-immune (per SKILL.md) — label not read; appPort part alone is
             label-immune and clean but doesn't clear the whole rule
```

### Not applicable

```
DC-FEAT-003    this repo authors no Features (only consumes docker-in-docker)
DC-CLAUDE-001  config does not install or run Claude Code
```

### Tally

```
findings:             2   DC-SEC-001, DC-LIFE-002
checked, no finding:  0
not checked:          8   DC-LIFE-001, DC-FEAT-001, DC-FEAT-002, DC-PERF-001,
                          DC-USER-001, DC-ENV-001, DC-LIFE-003, DC-DEP-001
not applicable:       2   DC-FEAT-003, DC-CLAUDE-001
                      -----
                      12 of 12 rules accounted for
```

**On "fix every problem now":** this agent's tool set is read-only by design — AUDIT reports, it never edits `devcontainer.json`. To apply the three fixes above (drop the `TOKEN` literal, correct `waitFor`, pin the Feature to a version like `ghcr.io/devcontainers/features/docker-in-docker:2`), switch to **AUTHOR** mode (or a Copilot CLI agent/mode with edit tools) and ask it to apply this report's findings.

