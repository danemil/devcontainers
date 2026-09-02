## devcontainers · DEBUG · `.devcontainer/devcontainer.json`

Your symptom has a named heading in this skill, and it routes to **`DC-ENV-001` [SPEC]** (Severity: WARN) — start there, but your config has two other things that bear on it.

**First, the honest caveat:** the tool probe was blocked by this environment's permission hook, so I analysed by reading only. See the not-checked block at the bottom.

### 1. `userEnvProbe` — the default is *not* your problem, but the label might be

`DC-ENV-001` [SPEC]: `userEnvProbe` decides which shell startup files contribute to the lifecycle environment. Legal values are `none`, `interactiveShell`, `loginShell`, `loginInteractiveShell` (default). The default reads all four files (`/etc/bash.bashrc`, `~/.bashrc`, `/etc/profile`, `~/.profile`), so it is the *most* generous setting.

Your file doesn't set it — but `userEnvProbe` **is** label-storable, and it merges "last value wins." Your base image or the docker-in-docker Feature could be setting it to `none` or a half-value, which you'd never see by reading `devcontainer.json`. That is the single highest-value thing to check:

```bash
devcontainer read-configuration --workspace-folder . --include-merged-configuration
docker inspect --format '{{ index .Config.Labels "devcontainer.metadata" }}' mcr.microsoft.com/devcontainers/javascript-node:20
```

If it comes back `none`, that is your answer and you can stop.

### 2. The version-manager case, which is what `javascript-node:20` most often is

The classic shape (skill DEBUG item 3): `nvm` hooks an rc file. If the tool you're invoking gets onto `PATH` via an `~/.bashrc` nvm hook rather than an image-level `ENV`, your interactive terminal finds it and the hook does not. The tell is `command not found` for something demonstrably installed.

The fix that doesn't depend on shell startup at all is `containerEnv` (visible to every process in the container) or `remoteEnv` (tool processes and lifecycle commands only) — or invoke by absolute path in the hook. Note `containerEnv` and `remoteEnv` are **not** interchangeable: anything the entrypoint needs must be in `containerEnv`.

### 3. If the failing command is `docker`, it's topology, not environment

You have `ghcr.io/devcontainers/features/docker-in-docker` — a real nested daemon inside the container, requiring `privileged: true`, started by an entrypoint. A `docker` call from `postCreateCommand` can land before that daemon is ready, while your terminal — attached later — always finds it up. `[OPINION]` — the topology is documented, the race is my inference, not stated by any source here.

Also relevant to ordering: Feature-contributed lifecycle commands always run **before** your `postCreateCommand`, and a non-zero exit anywhere aborts everything after it. So if your hook appears never to have run at all (as opposed to running and failing), read the Feature's contributed command first — that's a different bug from this one.

### Two defects I found while reading, unrelated to the symptom

**`DC-LIFE-002` [SPEC] ERROR — `devcontainer.json:11`.** `"waitFor": "postAttachCommand"` is not a legal value. The enum is exactly `initializeCommand`, `onCreateCommand`, `updateContentCommand`, `postCreateCommand`, `postStartCommand`. `postAttachCommand` is the one people reach for because it's a real hook and the only one missing from the enum. Nothing catches this: the reference CLI parses and merges but does not validate against the JSON Schema. What an out-of-enum value actually does at runtime is not stated by any source I have. If the intent was "block until my setup finishes," the value is `postCreateCommand`.

**`DC-SEC-001` [SPEC] ERROR — `devcontainer.json:8`.** `TOKEN` holds a literal with a `ghp_` prefix under a secret-shaped key. The reference CLI writes `remoteEnv` into the `devcontainer.metadata` image label by default (`--omit-config-remote-env-from-metadata` defaults to `false` and is `hidden`, so it doesn't show in `--help`) — anyone who can pull the image can read it. The string self-describes as an example, so this may be deliberate; if any real token ever sat there, rotate it. The fix is `--secrets-file`, or indirect through `${localEnv:TOKEN}` so the literal never enters the file.

One more, briefly: `docker-in-docker:latest` — omitting a tag means `latest`, so the Feature can move under you week to week.

### Not checked

```
not checked   merged configuration        devcontainer CLI not probed — permission hook blocked the probe
not checked   base image metadata         image not pulled; docker not probed
not checked   resolved Feature order      devcontainer CLI not probed
not checked   JSON Schema conformance     no validator run — the CLI ships none, SchemaStore is editor-only
not checked   Dockerfile lint / image vulns / image config / json lint   tools not probed
```

This is a DEBUG pass, not an audit — I walked the symptom list, not all twelve rules.

**Next action:** run the two commands in §1 and paste back the merged `userEnvProbe` plus the *actual* error text from the hook. Which of "command not found," "hook never ran," or a `docker` error you're seeing decides between §1/§2 and §3, and I don't want to guess between them.
