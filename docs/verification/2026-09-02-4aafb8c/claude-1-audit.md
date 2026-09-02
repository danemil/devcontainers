Mode: **AUDIT** — read-only, no edits.

Tool probe: every `command -v` probe in this session was **blocked by the permission layer** (not denied-as-absent). Per the skill I treat every tool as not run and report the full not-checked block below.

```
devcontainers · AUDIT · .devcontainer/devcontainer.json · rules corpus 0.4.0
```

Discovery: `.devcontainer/devcontainer.json` is the winning config. No `.devcontainer.json` at root and no one-level subfolder config — nothing shadowed. Parsed as JSONC; no comments or trailing commas present.

## Findings

```
DC-SEC-001   [SPEC]  ERROR  .devcontainer/devcontainer.json:8   remoteEnv.TOKEN holds a literal
                                                                 credential-shaped value ("ghp_…",
                                                                 GitHub PAT prefix + PAT length)
```
The reference CLI writes `remoteEnv` from devcontainer.json into the `devcontainer.metadata` image label **by default** — the opt-out flag `--omit-config-remote-env-from-metadata` is `default: false` and `hidden: true`, so anyone who can pull the image reads this value, and no `--help` output would warn you. This entry is not a substitution reference (`${localEnv:…}`), so the substitution exclusion does not save it; the `ghp_` prefix is on the rule's report-it list.

**Fix:** declare the name under the top-level `secrets` property (declarative only — it injects nothing) and pass the value at run time via `--secrets-file <json>`; or, if it must stay, indirect it as `"TOKEN": "${localEnv:TOKEN}"` so the literal is never committed. Keep the secrets file outside the repo (or `.gitignore` it in the same change and verify with `git check-ignore`). Running `devcontainer up --secrets-file …` creates a container — I did not run it and would need your confirmation.

The value string reads like a deliberate dummy ("examplenotreal", zero-padded). That does not change the finding: the rule's placeholder carve-out covers obviously non-credential forms like `changeme` or `<your-key-here>`, not a well-formed `ghp_` token. It is also already committed to git history, so if any real token ever occupied that key, rotate it.

```
DC-LIFE-002  [SPEC]  ERROR  .devcontainer/devcontainer.json:11  waitFor is "postAttachCommand",
                                                                 which is not in the enum
```
The schema enum is exactly five values — `initializeCommand`, `onCreateCommand`, `updateContentCommand`, `postCreateCommand`, `postStartCommand` — defaulting to `updateContentCommand`. `postAttachCommand` is the classic wrong reach because it *is* a real lifecycle hook and is the only one missing from the enum. Nothing in a normal workflow catches this: the reference CLI parses and merges the config but ships no JSON-Schema validator, so the invalid value reaches the tool unchallenged and schema registration only produces editor-time squiggles.

**Fix:** pick from the five. If the intent was "block until my setup finishes", the value is `postCreateCommand`. If the intent was the default, delete the property.

## Observations (outside the corpus — no rule covers these, no severity)

- **`docker-in-docker:latest` is unpinned** (line 5). An untagged/`latest` Feature reference means the environment is not reproducible week to week. Pinning to a major (`:2`) is the usual convention. `[OPINION]` — and per refusal 6 this is yours to decide, not mine to change unasked.
- **docker-in-docker implies a privileged container.** Worth being deliberate about, especially given the token above sharing that container.
- **`postCreateCommand: "npm install"` currently has nothing to install** — `package.json` declares no dependencies and there is no lockfile. Harmless today; noting it because it makes the hook look load-bearing when it is not.

## Not checked

```
not checked   JSON Schema conformance     no validator run — the CLI ships none, SchemaStore is editor-only
not checked   Dockerfile lint             n/a — config uses an image, no Dockerfile; hadolint probe blocked
not checked   image vulnerabilities       trivy probe blocked by the permission layer — NOT RUN
not checked   image supply chain          docker scout probe blocked by the permission layer — NOT RUN
not checked   image configuration         dockle probe blocked by the permission layer — NOT RUN
not checked   devcontainer.json lint      decolint probe blocked by the permission layer — NOT RUN
not checked   resolved Feature order      devcontainer CLI probe blocked — order not resolved
not checked   base image metadata         image not pulled
```

None of these read as "passed". In particular I have said nothing about whether `mcr.microsoft.com/devcontainers/javascript-node:20` carries vulnerabilities.

## Tally

```
findings:             2   DC-SEC-001, DC-LIFE-002

checked, no finding:  0   nothing qualifies: with the image unpulled, for every rule that did
                          not fire, the devcontainer.metadata label could still supply what
                          fires it

not checked:          8   conjunct 1 failed — an input was never read:
                          DC-FEAT-001  install order not resolved — devcontainer CLI unavailable;
                                       docker-in-docker's devcontainer-feature.json not vendored
                          DC-FEAT-002  Feature contents not vendored in this workspace
                          conjunct 2 failed — the label could still supply what fires it:
                          DC-LIFE-001  postCreateCommand carries `npm install`, and
                                       onCreateCommand/updateContentCommand are absent — but the
                                       rule is scoped to projects that prebuild, and prebuild use
                                       is not established (no CI workflows in the repo; Codespaces
                                       prebuild config lives in repo settings, not in the tree)
                          DC-LIFE-003  lifecycle commands merge as a collected list
                          DC-PERF-001  turns on mounts/remoteUser being absent — label not read
                          DC-USER-001  turns on remoteUser/containerUser being absent — label not
                                       read (this image family sets remoteUser via its own label)
                          DC-ENV-001   userEnvProbe may arrive via the label
                          DC-DEP-001   top-level extensions/settings/devPort have no row in the
                                       property reference — silence is not label-immunity

not applicable:       2   DC-FEAT-003   this repo authors no Features
                          DC-CLAUDE-001 config does not install or run Claude Code
                          -----
                          12 of 12 rules accounted for
```

Note on `DC-LIFE-001`: if you *do* use Codespaces prebuilds, this becomes a live finding — no `postCreateCommand` runs during prebuild creation, so `npm install` would never be baked and every codespace pays for it. Tell me whether you prebuild and I can place it properly.

Two rules that did fire, both ERROR. Pulling the image and installing the devcontainer CLI is what would move the eight "not checked" rules; an empty clean bucket here is the honest result for the inputs I had, not a malfunction.

**Next action:** tell me whether to switch to AUTHOR mode and fix the two findings (`remoteEnv.TOKEN` → `${localEnv:TOKEN}` plus a `secrets` declaration, and `waitFor` → `postCreateCommand`). AUDIT does not edit files, so nothing has changed on disk.
