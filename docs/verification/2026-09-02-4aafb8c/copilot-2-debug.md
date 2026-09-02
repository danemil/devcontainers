Mode: **DEBUG** — symptom "works in terminal but not in postCreateCommand" maps directly to this skill's list.

**Mode: DEBUG.** Config found: `.devcontainer/devcontainer.json` (winning file, no shadow).

Tools probed: `devcontainer`, `hadolint`, `trivy`, `dockle`, `decolint` — none available; `docker scout` available but not run (image not pulled). Nothing below was validated by execution — read from the file plus the rule.

Most likely cause: **`DC-ENV-001` [SPEC]** — `userEnvProbe` decides which shell startup files get read when a lifecycle command runs, and that's usually why something works in your interactive terminal but not in `postCreateCommand`.

- Your file doesn't set `userEnvProbe`, so the spec default `loginInteractiveShell` applies *unless* a base-image metadata label overrides it (not checked — image not pulled).
- `loginInteractiveShell` reads all four startup files (`/etc/profile`, `~/.profile`, `/etc/bash.bashrc`, `~/.bashrc`), so if this were the cause you'd typically see it with `"none"` (no files read at all) or `"loginShell"`/`"interactiveShell"` (only half).
- Classic trigger: a version manager (`nvm`, `pyenv`, `rbenv`, `sdkman`) that hooks into `.bashrc`/`.profile` — the tool's on PATH in your terminal but the probe used for lifecycle commands doesn't source that file.

Other angles from the same symptom list, worth checking in order:
1. **Root vs. remote user** — build-time/Feature installs run as root; `postCreateCommand` runs as the remote user, so anything installed only into root's home won't be on PATH here.
2. **Feature ordering** — Feature-contributed commands run before yours for the same hook, so don't assume a Feature's setup finished before `postCreateCommand` if it hasn't.
3. Best fix regardless of `userEnvProbe`: put the variable in `containerEnv` (all processes) or `remoteEnv` (remote-user sessions/lifecycle) instead of relying on shell rc files — not for secrets (`DC-SEC-001` [SPEC]).

Side note (not asked, flagging only): your `remoteEnv.TOKEN` looks like a GitHub token pattern — even as a placeholder, real secrets shouldn't go in `remoteEnv`/`containerEnv` per `DC-SEC-001` [SPEC]. Say if you want that addressed.

To pin down your actual case: what's the exact command/error, and is it "command not found" or something else?
