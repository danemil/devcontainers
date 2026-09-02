**AUTHOR mode.** Tool probe: `devcontainer`, `hadolint`, `trivy`, `dockle`, `decolint` not available; `docker scout` available but not run (no image pulled).

A `.devcontainer/devcontainer.json` already existed, so I made the minimal change: bumped the base image from `mcr.microsoft.com/devcontainers/javascript-node:20` → `:22`, giving Node 22 per the [javascript-node Feature/image tags]. Nothing else in the file was touched (refusal 6).

Two pre-existing things I didn't fix since they weren't asked about, flagged per rules:
- `ghcr.io/devcontainers/features/docker-in-docker:latest` is unpinned → non-reproducible builds week to week `[OPINION]`. Want it pinned to a version, e.g. `:2`?
- `remoteEnv.TOKEN` holds what looks like a placeholder GitHub token string — `DC-SEC-001 [tier unknown, rules.md not loaded in AUTHOR mode]` says real secrets don't belong in `remoteEnv`/`containerEnv`. If this is a real token, move it to a Codespaces/host secret instead.

Not validated: no JSON Schema check ran (none exists via CLI), no build/lint ran. This edit requires a rebuild to take effect — rebuild command (not run, needs your confirmation):
```
devcontainer up --workspace-folder .
```

