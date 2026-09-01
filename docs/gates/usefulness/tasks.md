# Gate E — task set and expert labels

**Written before any run was executed.** Nothing in this file was edited after the first
`claude -p` or `copilot -p` invocation. The labels below are the ground truth the runs are
graded against — not what `SKILL.md` or `references/rules.md` say. Where the skill and the
label disagree, the label wins and the disagreement is a finding.

## Where the experiment ran

**Not in this repository.** `/Users/emildan/work/devcontainers` contains
`docs/RESEARCH-BRIEF.md` and 26 cached primary sources in `docs/sources/`. A model in the
WITHOUT arm could read the brief and answer every task correctly from it, destroying the
control and manufacturing a spurious zero lift. The whole experiment ran in a disposable
scratch tree at `/tmp/gate-e`, which contained only:

- `fixtures/t01..t10/` — the repo state for each task (config + a README, nothing else)
- `skills/` — a **copy** of `.claude/skills/devcontainers/` plus five decoy skills
- `runs/<task>_<surface>_<condition>/` — one throwaway working directory per run

No file from `docs/` existed in either arm. The real
`.claude/skills/devcontainers/` was copied, never moved.

## Noise: what else was installed

A firing rate measured with exactly one skill installed overestimates the real thing, so the
scratch repo carried six skills and selection had to discriminate between them. All six were
present in the WITH arm; in the WITHOUT arm `devcontainers/` was moved aside and the other
five stayed.

| Skill | Description used for selection |
| --- | --- |
| `devcontainers` | the skill under test (unmodified copy) |
| `changelog` | CHANGELOG.md, release notes, semver bumps |
| `sql-review` | SQL queries, migrations, schema, slow queries |
| `terraform-modules` | Terraform/OpenTofu config, modules, state, drift |
| `gha-workflows` | GitHub Actions workflows, CI failures, permissions, caching |
| `api-docs` | OpenAPI/Swagger specs, REST reference content |

`gha-workflows` is deliberately CI-adjacent (task 1 mentions Codespaces prebuilds, which are
built by a workflow) and `terraform-modules` is deliberately infra-adjacent, so the
devcontainers description has to win on its own merits rather than by being the only
plausible candidate.

## Conditions

- **WITH** — run directory contains all six skills.
- **WITHOUT** — `mv <rundir>/.claude/skills/devcontainers /tmp/gate-e/parked/<runid>` before
  the run, moved back after. The *directory* moves, not the file. Every run is a fresh
  session in a fresh working directory, so no skill body can persist from a prior turn.

## Deviations from the brief's suggested set

The brief's ten candidates were kept in substance. Changes, and why:

1. **Task 1** signals prebuild use **in the prompt** ("We build this repo with GitHub
   Codespaces prebuilds") rather than through a fixture file. Prebuild configuration lives in
   GitHub repository settings, not in the tree; fabricating a plausible-looking workflow file
   would have introduced an artefact a model could reasonably disbelieve. `DC-LIFE-001` has an
   explicit scope clause requiring prebuild use to be established, so establishing it in the
   prompt is the honest fixture.
2. **Task 6** vendors a local Feature (`./features/appdeps`) carrying a real `dependsOn` edge,
   because `dependsOn` is rare in registry Features and the question is meaningless without a
   visible dependency edge.
3. **Task 9** ("set up Claude Code") is left as an AUTHOR-mode task even though
   `references/spec-facts.md` does not exist yet and `DC-CLAUDE-001` lives in `rules.md`, which
   AUTHOR mode is not told to load. That is the state under test. If the skill cannot reach its
   own Claude Code rule from AUTHOR mode, that is a finding, not a reason to change the task.
4. **Tasks 2 and 8** are kept exactly as the brief specifies. They are the over-flagging
   controls and they are load-bearing.

## Grading scale

- **CORRECT** — hits the labelled substance, and does not attach a confident wrong claim to it.
- **PARTIAL** — reaches part of the labelled substance, or reaches it while also asserting
  something wrong or demanding an unnecessary change.
- **WRONG** — misses the labelled substance, or asserts the opposite.
- **CONFIDENTLY WRONG** — a sub-flag on WRONG (and occasionally on PARTIAL): the answer states
  a falsehood as fact rather than merely failing to mention the right thing. Tracked separately
  because it is worse than a miss.

**Firing** is recorded separately from correctness. A run "fired" if the transcript shows the
`devcontainers` skill being invoked or its `SKILL.md`/`references/rules.md` being read. Saying
something correct about dev containers without opening the skill is *not* firing.

---

## T01 — expensive setup in `postCreateCommand`, repo uses prebuilds

**Fixture** `t01/.devcontainer/devcontainer.json`

```jsonc
"postCreateCommand": "npm ci && pip install -r requirements-dev.txt && npm run build",
```

with no `onCreateCommand` and no `updateContentCommand`.

**Prompt** — "We build this repo with GitHub Codespaces prebuilds. Review
.devcontainer/devcontainer.json and tell me whether the setup work is in the right lifecycle
hooks."

**Label.** `postCreateCommand` is **not** run when a Codespaces prebuild is created — the
prebuild performs setup up to and including `onCreateCommand` and `updateContentCommand` only.
So every second of `npm ci` and `pip install` here is paid on each codespace creation and
none of it is baked into the prebuild image. The cacheable work should move to
`onCreateCommand` (or `updateContentCommand`, which cloud services periodically re-run to
refresh a prebuild); only work needing the assigned user's own credentials stays in
`postCreateCommand`.

- **CORRECT** — says prebuilds do not run `postCreateCommand`, and recommends moving the
  install work to `onCreateCommand` and/or `updateContentCommand`.
- **PARTIAL** — recommends `onCreateCommand`/`updateContentCommand` on generic grounds
  ("it's more appropriate there") without the prebuild mechanism, or gets the mechanism right
  but recommends no change.
- **WRONG** — says the current arrangement is correct for prebuilds, or that
  `postCreateCommand` is included in a prebuild.

## T02 — `${localEnv:}` reference vs. a committed literal — OVER-FLAGGING CONTROL

**Fixture** `t02/.devcontainer/devcontainer.json`

```jsonc
"remoteEnv": {
  "GITHUB_TOKEN": "${localEnv:GITHUB_TOKEN}",
  "STRIPE_API_KEY": "sk_test_51PfakeFAKEfake0000abcdefghijklmnopqrstuvwxyz",
  "APP_ENV": "development"
}
```

**Prompt** — "Review .devcontainer/devcontainer.json for security problems before I push it."

**Label.** Exactly one finding: the **literal** `STRIPE_API_KEY`. A committed literal in
`remoteEnv` is a secret in version control, and the reference CLI additionally writes
`remoteEnv` into the `devcontainer.metadata` image label by default, so anyone who can pull
the image can read it. The `${localEnv:GITHUB_TOKEN}` entry is **the documented correct
form** and must not be reported as something to change — indirecting through `${localEnv:}`
is the fix the spec-side guidance itself prescribes. A neutral remark that the *reference*
(not the value) is still recorded in the metadata label is accurate and is not a finding.

- **CORRECT** — flags `STRIPE_API_KEY`; leaves `GITHUB_TOKEN` alone or mentions it only as
  correct/neutral.
- **PARTIAL** — flags `STRIPE_API_KEY` but also tells the user to change, remove or "avoid"
  the `${localEnv:GITHUB_TOKEN}` entry.
- **WRONG** — does not flag the literal, or flags only the `localEnv` entry.

## T03 — `"waitFor": "postAttachCommand"`

**Fixture** `t03/.devcontainer/devcontainer.json` — `"waitFor": "postAttachCommand"` alongside
a real `postAttachCommand`.

**Prompt** — "Review .devcontainer/devcontainer.json and tell me if anything in it is invalid."

**Label.** `postAttachCommand` is not a legal `waitFor` value. The enum is exactly
`initializeCommand`, `onCreateCommand`, `updateContentCommand`, `postCreateCommand`,
`postStartCommand`, defaulting to `updateContentCommand`. It is the one people reach for
because it is a real lifecycle hook and the only one missing from the enum, and nothing in a
normal workflow catches it: the reference CLI parses and merges the config without validating
it against the JSON Schema.

- **CORRECT** — identifies `waitFor: "postAttachCommand"` as an invalid enum value and names
  the legal set (or at least says `postAttachCommand` is not among them).
- **PARTIAL** — questions the value ("this may not be supported", "I'd double-check this")
  without stating it is invalid.
- **WRONG** — does not mention it, or affirms it as valid.

## T04 — `nvm use` works in the terminal, fails in `postCreateCommand`

**Fixture** `t04/.devcontainer/devcontainer.json` — `"userEnvProbe": "none"` and
`"postCreateCommand": "nvm use && npm ci"`.

**Prompt** — "`nvm use` works fine when I open a terminal in the dev container, but during
postCreateCommand it fails with 'nvm: command not found'. Why?"

**Label.** `userEnvProbe` decides which shell startup files contribute to the environment
lifecycle commands run in. `"none"` means no startup file is read at all, so the `nvm` shell
function that `~/.bashrc` (or `/usr/local/share/nvm/nvm.sh`) defines is invisible to
`postCreateCommand` even though an interactive terminal in the same container finds it. Fix:
delete the explicit `userEnvProbe` (the default is `loginInteractiveShell`, which reads all
four files), or source `nvm.sh` explicitly in the command.

- **CORRECT** — names `userEnvProbe: "none"` as the cause.
- **PARTIAL** — correctly explains that `postCreateCommand` runs in a non-interactive,
  non-login shell that does not source `~/.bashrc`, and prescribes sourcing `nvm.sh`, but
  never identifies the `userEnvProbe` property as the setting responsible.
- **WRONG** — attributes it to something else (image lacks nvm, wrong user, PATH ordering)
  without the shell-startup mechanism.

## T05 — named volume for `node_modules`, no `chown`

**Fixture** `t05/.devcontainer/devcontainer.json` — a `type=volume` mount at
`${containerWorkspaceFolder}/node_modules`, `remoteUser: node`, `postCreateCommand: "npm ci"`
with no ownership fix.

**Prompt** — "Review .devcontainer/devcontainer.json. Anything in there that will bite us at
runtime?"

**Label.** A named volume mounted into the container comes up **root-owned**. With a non-root
`remoteUser` the first write into `node_modules` — the `npm ci` in `postCreateCommand` — fails
with a permission error. The documented fix is an explicit `chown` of that directory as part of
`postCreateCommand`, e.g. `sudo chown node node_modules && npm ci`. It surfaces at first write,
not at build, which is why it is missed.

- **CORRECT** — says the volume is root-owned and a `chown` (to the `remoteUser`) is needed.
- **PARTIAL** — flags a permissions risk around the volume without naming root ownership or
  the `chown` fix.
- **WRONG** — does not raise the volume ownership issue.

## T06 — `overrideFeatureInstallOrder` against a `dependsOn` edge

**Fixture** `t06/` — local Feature `./features/appdeps` whose `devcontainer-feature.json`
declares `dependsOn: { "ghcr.io/devcontainers/features/node:1": {...} }`, while
`devcontainer.json` lists `overrideFeatureInstallOrder: ["./features/appdeps",
"ghcr.io/devcontainers/features/node", ...]`.

**Prompt** — "In .devcontainer/devcontainer.json I set overrideFeatureInstallOrder so that
./features/appdeps installs before the node feature. Will that work?"

**Label.** No. `overrideFeatureInstallOrder` must not influence the dependency relationship
defined by the dependency graph; it is evaluated only at the round-based sorting step, where it
assigns a `roundPriority` to matching nodes. Priority reorders **within** a round; it can never
pull a Feature into an earlier round than its dependencies. `appdeps` depends on `node`, so
`node` installs first regardless, and the override silently does not happen. If the ordering is
a real requirement it belongs in `dependsOn`/`installsAfter`, which is where it already is —
correctly — so the override entry should be removed rather than fought.

- **CORRECT** — says it will not work and explains that the override cannot violate the
  dependency graph / only breaks ties within a round.
- **PARTIAL** — says it will not work, or that node installs first, with a wrong or absent
  mechanism; or says "it depends, check with the CLI" without committing.
- **WRONG** — says yes, it will work.
- **CONFIDENTLY WRONG** if it asserts the override wins over `dependsOn`.

## T07 — deprecated top-level `extensions` / `settings` / `appPort`

**Fixture** `t07/.devcontainer/devcontainer.json` — top-level `extensions`, top-level
`settings`, and `appPort: [8888]`.

**Prompt** — "Review .devcontainer/devcontainer.json - is anything in it out of date?"

**Label.** Top-level `extensions` and `settings` are deprecated in favour of
`customizations.vscode.extensions` and `customizations.vscode.settings`. `appPort` is
superseded by `forwardPorts` in most cases (keep it only when the port must be *published* on
all interfaces rather than forwarded). These are deprecations, not breakage — the old keys
still work — so the right register is modernisation, not a defect report.

- **CORRECT** — flags top-level `extensions` **and** `settings` and gives the
  `customizations.vscode.*` destination. Mentioning `appPort`/`forwardPorts` is a bonus, not
  required.
- **PARTIAL** — flags only one of the two, or says "move to customizations" without naming
  the `vscode` namespace.
- **WRONG** — reports nothing out of date.

## T08 — a correct, idiomatic config — FALSE-POSITIVE CONTROL

**Fixture** `t08/.devcontainer/devcontainer.json` — image-based, one registry Feature,
`forwardPorts`, `onCreateCommand: "npm ci"`, `postCreateCommand: "npm run db:seed"`,
`remoteUser: "node"`, extensions and settings correctly under `customizations.vscode`.

**Prompt** — "Review .devcontainer/devcontainer.json and report any problems."

**Label.** There is nothing to fix. Cacheable install work is already in `onCreateCommand`; the
seed step legitimately belongs in `postCreateCommand`; there is no `waitFor`, no `remoteEnv`, no
volume mount, no deprecated key, no Feature ordering to resolve, and the customizations are in
the modern namespace. `updateRemoteUserUID` is unset and therefore defaults to true on Linux —
that is the desired behaviour for a local dev container and is at most an informational note,
never a defect.

- **CORRECT** — concludes the config is fine / reports no problems. Explicitly-labelled
  informational or optional notes ("you could add X", "no change needed") do not disqualify.
- **PARTIAL** — reports no real defect but presses one dubious change as something the user
  should do.
- **WRONG** — reports one or more confident defects requiring change.

This task cannot produce lift. Its only job is to detect harm.

## T09 — "set up Claude Code in this dev container"

**Fixture** `t09/.devcontainer/devcontainer.json` — a plain config with **no** `remoteUser`,
no `mounts`, no `containerEnv`.

**Prompt** — "Set up Claude Code in this dev container so I can run it here and stay signed in
across rebuilds."

**Label.** Three things. (1) Set a **non-root `remoteUser`** — the CLI refuses
`--dangerously-skip-permissions` when launched as root, and the fixture currently has none, so
the container runs as root. (2) Persistent auth needs **both halves**: a volume mounted at
`~/.claude` **and** a `containerEnv` entry setting `CLAUDE_CONFIG_DIR` to that same path.
Mounting the volume alone does not keep you signed in, because the OAuth account file sits
outside `~/.claude`; a volume with no matching environment variable is the common
half-configuration and is the specific thing this task is looking for. (3) Install the CLI
(a `npm i -g @anthropic-ai/claude-code` in a lifecycle hook, or an equivalent Feature) —
necessary but not scored, since any answer will include it.

- **CORRECT** — non-root `remoteUser` **and** both halves of the auth persistence (mount +
  `CLAUDE_CONFIG_DIR`).
- **PARTIAL** — the mount without `CLAUDE_CONFIG_DIR` (or vice versa), or both halves while
  leaving the container running as root.
- **WRONG** — installs the CLI with no persistence story, or mounts the host's `~/.claude`
  directly from the host filesystem as the only mechanism.

## T10 — `postCreateCommand` in object form

**Fixture** `t10/.devcontainer/devcontainer.json`

```jsonc
"postCreateCommand": {
  "install": "npm ci",
  "migrate": "npm run db:migrate",
  "hooks": "npx husky install"
}
```

with a README noting that `db:migrate` and `husky install` both need `node_modules` present.

**Prompt** — "Review the postCreateCommand in .devcontainer/devcontainer.json. Will those three
entries run in the order I listed them?"

**Label.** No. Each entry in the **object** form runs **in parallel** during that lifecycle
step; the keys are names, not a sequence. `migrate` and `hooks` will race `install` and will
usually fail because `node_modules` is not there yet. Every command must exit successfully for
the stage to succeed, so one racing entry fails the whole stage. Fix: put the dependent work in
one string joined with `&&`, or in one script, and reserve the object form for genuinely
independent work.

- **CORRECT** — says the entries run in parallel/concurrently and that the ordering assumption
  will not hold.
- **PARTIAL** — recognises the object form as legal but says entries run sequentially in key
  order, or hedges without committing.
- **WRONG** — misreads the object as a single shell string / invalid syntax, or affirms
  ordered execution.
- **CONFIDENTLY WRONG** if it states the entries run in the listed order.
