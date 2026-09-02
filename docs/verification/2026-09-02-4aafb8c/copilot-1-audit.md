Mode: **AUDIT** (review/check request). Loading rules corpus and locating the config.

## devcontainers · AUDIT · `.devcontainer/devcontainer.json` · rules corpus 0.4.0

**Config located:** `.devcontainer/devcontainer.json` (no shadowing `.devcontainer.json` present). Parsed as JSONC — plain JSON, no comments/trailing commas. Lifecycle hooks: only `postCreateCommand`. Feature: `ghcr.io/devcontainers/features/docker-in-docker:latest`. No `.github/workflows` exist in this repo, so no CI/prebuild evidence is visible.

### Findings

| Rule | Tier | Severity | Location | Finding |
|---|---|---|---|---|
| `DC-SEC-001` [SPEC] | ERROR | `remoteEnv.TOKEN` (line 7) | The literal value `ghp_examplenotreal000000000000000000000000` is a `ghp_`-prefixed (GitHub PAT-shaped) credential written directly into the file. The reference CLI writes `remoteEnv` into the `devcontainer.metadata` image label by default (`--omit-config-remote-env-from-metadata` defaults `false`), so this literal is committed to source **and** baked into any built image label. **Fix:** declare it under `secrets` and pass the real value via `--secrets-file`, or at minimum indirect it as `"TOKEN": "${localEnv:TOKEN}"` so no literal is committed. |
| `DC-LIFE-002` [SPEC] | ERROR | `waitFor` (line 10) | `"postAttachCommand"` is not a legal `waitFor` value — the schema enum is exactly `initializeCommand, onCreateCommand, updateContentCommand, postCreateCommand, postStartCommand`. The reference CLI merges but does not schema-validate, so this reaches the tool unchallenged. **Fix:** if the intent is "block until setup finishes," use `"postCreateCommand"`; if the intent was the default, delete the property (default is `updateContentCommand`). |

### Observations (outside the corpus, no rule ID)
- `ghcr.io/devcontainers/features/docker-in-docker:latest` is unpinned — floats to whatever the tag resolves to at build time, non-reproducible week to week. *(No rule in this corpus specifically covers Feature version pinning; flagged as `[OPINION]`.)*
- `image` tag `:20` is a moving minor/patch stream, not a pinned digest — same reproducibility caveat, `[OPINION]`.

### Not checked

```
not checked   JSON Schema conformance     no validator run — the CLI ships none, SchemaStore is editor-only
not checked   Dockerfile lint             hadolint not available (n/a anyway — no Dockerfile, uses `image`)
not checked   image vulnerabilities       trivy not available
not checked   image supply chain          docker scout available but NOT RUN — image not pulled
not checked   image configuration         dockle not available
not checked   devcontainer.json lint      decolint not available
not checked   resolved Feature order      devcontainer CLI not available
not checked   base image metadata         image not pulled
```

### Rule-by-rule tally

```
findings:             2   DC-SEC-001, DC-LIFE-002
checked, no finding:  0
not checked:          8
  conjunct 1 failed — an input was never read:
    DC-FEAT-001  install order not resolved; docker-in-docker's devcontainer-feature.json
                 (dependsOn/installsAfter edges) not fetched — remote reference, not vendored
    DC-FEAT-002  same devcontainer-feature.json needed to rule out a dependsOn-pulled
                 duplicate install; not read
  conjunct 2 failed — the label could still supply what fires it:
    DC-LIFE-001  onCreateCommand/updateContentCommand absent in file, and prebuild use
                 (Codespaces config or CI --prebuild) not established one way or the other
    DC-LIFE-003  postStartCommand/postAttachCommand/onCreateCommand/updateContentCommand
                 absent from file; label could add an object-form entry with unseen ordering
                 assumptions (postCreateCommand itself, present as a plain string, is fine)
    DC-PERF-001  mounts, remoteUser, containerUser all absent from file — label could still
                 supply a volume mount plus non-root user this rule would then apply to
    DC-USER-001  remoteUser/containerUser absent from file — label not read, so the
                 default-true `updateRemoteUserUID` scope condition can't be ruled in or out
    DC-ENV-001   userEnvProbe absent from file — label not read
    DC-DEP-001   3 of 4 inputs (top-level extensions/settings/devPort) carry no
                 label-storability attestation in the property reference at all — absence in
                 file doesn't prove absence at runtime (appPort, the one attested input, is
                 absent and clean)
not applicable:       2
    DC-FEAT-003    this repo authors no Feature (only consumes a remote one)
    DC-CLAUDE-001  config does not install or run Claude Code
                   -----
                   12 of 12 rules accounted for
```

plus the non-rule areas in the not-checked block above.

**Bottom line:** two real, fixable defects — a committed GitHub-token-shaped secret in `remoteEnv`, and an invalid `waitFor` value that the CLI will silently accept. Everything else needs either the devcontainer CLI, the pulled image, or the Feature's own metadata to adjudicate soundly, and none of those were available here.
