## devcontainers · AUDIT · .devcontainer/devcontainer.json · rules corpus 0.4.0

**Config discovered:** `.devcontainer/devcontainer.json` (only one present — no `.devcontainer.json` or nested variant to shadow it).

### Findings

```
DC-SEC-001   [SPEC]  ERROR  .devcontainer/devcontainer.json:8
  remoteEnv.TOKEN is a literal value "ghp_examplenotreal000000000000000000000000" — a
  secret-shaped key (TOKEN) holding a literal with the recognizable "ghp_" GitHub-token
  prefix. Per the rule, a literal under a secret-shaped key is reported unless it is an
  obvious placeholder like "changeme" or "<your-key-here>"; this string does not match that
  exempted form, so it is flagged even though "examplenotreal" suggests it's a dummy. The
  reference CLI writes remoteEnv into the image's devcontainer.metadata label by default, so
  this literal (real or not) would be baked into any built image.
  Fix: declare the name under top-level "secrets" and supply the real value via
  --secrets-file, or if it must live in remoteEnv, indirect it as "${localEnv:TOKEN}" so no
  literal is committed.

DC-LIFE-002  [SPEC]  ERROR  .devcontainer/devcontainer.json:11
  waitFor is "postAttachCommand", which is not in the schema's enum
  (initializeCommand | onCreateCommand | updateContentCommand | postCreateCommand |
  postStartCommand). The CLI parses but does not schema-validate the config, so this reaches
  the tool unchallenged.
  Fix: if the intent is "block until my setup finishes," use "postCreateCommand" instead; if
  the intent was the default, delete the property (default is "updateContentCommand").
```

### Not checked

```
not checked   JSON Schema conformance     no validator run — the CLI ships none, SchemaStore is editor-only
not checked   Dockerfile lint             hadolint not available (no shell tool in this agent)
not checked   image vulnerabilities       trivy not available (no shell tool in this agent)
not checked   image supply chain          docker scout not available (no shell tool in this agent)
not checked   image configuration         dockle not available (no shell tool in this agent)
not checked   devcontainer.json lint      decolint not available (no shell tool in this agent)
not checked   resolved Feature order      devcontainer CLI not available (no shell tool in this agent)
not checked   base image metadata         image not pulled — devcontainer.metadata label unreadable
```

### Tally

```
findings:             2   DC-SEC-001, DC-LIFE-002
checked, no finding:  1   DC-FEAT-002  read: image (line 3, "mcr.microsoft.com/devcontainers/
                          javascript-node:20" — not a devcontainer-built image, so no frozen
                          resolved-Feature-set concern), features (lines 4-6, single entry
                          "ghcr.io/devcontainers/features/docker-in-docker:latest", not
                          referenced twice) — both attested not label-storable, so the file is
                          authoritative; this repo authors no Feature, so the install.sh input
                          does not apply
not checked:          6   conjunct 1 failed — an input was never read:
                          DC-FEAT-001  overrideFeatureInstallOrder absent and attested
                                       not label-storable, but each Feature's
                                       devcontainer-feature.json (dependsOn/installsAfter
                                       edges) and the resolved install order were never read —
                                       devcontainer CLI unavailable
                          conjunct 2 failed — the label could still supply what fires it:
                          DC-PERF-001  mounts/workspaceMount absent from file but mounts
                                       travels and merges via the label — not confirmed absent
                                       at runtime
                          DC-USER-001  remoteUser/containerUser absent from file but
                                       label-storable; CI pinned-image evidence not
                                       established either way
                          DC-ENV-001   userEnvProbe absent from file but label-storable
                          DC-LIFE-003  postCreateCommand is a plain string (no parallel-object
                                       issue) but the other five hooks are absent from file and
                                       label-storable, so an object-form ordering issue at
                                       runtime can't be ruled out
                          DC-DEP-001   appPort attested absent (not label-storable); extensions/
                                       settings/devPort absent from file but the source is
                                       silent on their label-storability — not label-immune
not applicable:       3   DC-FEAT-003    this repo authors no Features
                          DC-CLAUDE-001  config does not install or run Claude Code
                          DC-LIFE-001    Detect's own scope excludes it: no evidence this
                                         project uses prebuilds (no CI workflow, no
                                         Codespaces prebuild config found in .github/)
                          -----
                          12 of 12 rules accounted for
```

### Observations (outside the corpus)

- `features.ghcr.io/devcontainers/features/docker-in-docker:latest` is pinned to `latest`, not a version tag — no rule ID covers this directly (closest is `DC-FEAT-002`'s idempotence concern, which doesn't fire here), but it means the Feature's resolved contents can change silently between builds.

**Cannot fix.** This agent is read-only by design (AUDIT mode). To apply the two ERROR fixes above, use the AUTHOR mode/agent, or edit the file directly and rebuild with `devcontainer up` (confirm before running).

