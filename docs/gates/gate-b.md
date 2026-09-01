# Gate B — does Copilot resolve `references/*.md` from `.claude/skills/`? (Task 3)

Probed empirically in a throwaway repo (`/tmp/gate-b-probe`, `git init`'d, deleted after
the run) — kept out of this repo per controller ruling so Tasks 2/4 aren't disturbed and
Gate E's later corpus isn't contaminated by a stray probe skill.

Environment: GitHub Copilot CLI 1.0.81 (`copilot`, on PATH); Claude Code (`claude`, on
PATH). Both run non-interactively via `-p`.

## Probe

```bash
mkdir -p .claude/skills/probe-refs/references
cat > .claude/skills/probe-refs/SKILL.md <<'EOF'
---
name: probe-refs
description: Use when the user says the exact phrase "run the reference canary". Reads a bundled reference file and reports a marker string.
license: MIT
---
When invoked, read `references/canary.md` in this skill directory and report the marker
string it contains, verbatim. If you cannot read that file, say exactly:
"CANARY UNREACHABLE".
EOF
echo 'MARKER: PELICAN-7731' > .claude/skills/probe-refs/references/canary.md
```

Two separate things are measured — kept apart below:
- **DISCOVERY**: did the host find/select `probe-refs` from `.claude/skills/` at all?
- **RESOLUTION**: given it fired, could it read `references/canary.md` and report
  `PELICAN-7731`?

## Results

### Copilot CLI — DISCOVERY: PASS, RESOLUTION: PASS

`copilot --help` documents that `--add-dir <directory>` loads "its `.github/skills` and
`.github/agents` as trusted configuration" — that phrasing names only `.github/skills`
and had it been the only discovery path, that would already be a bad sign. But
`copilot skill --help` documents the *actual* full discovery list, and it already
includes `.claude/skills/` natively:

```
Skills are discovered from several sources:
  Project   .github/skills/, .agents/skills/, or .claude/skills/
  Personal  ~/.copilot/skills/ or ~/.agents/skills/
  Plugin    Installed plugins that bundle skills
  Custom    Directories added with `copilot skill add <directory>`
```

Confirmed empirically — `copilot skill list` run from the probe repo's root listed the
skill under "Project skills":

```
Project skills:
  probe-refs - Use when the user says the exact phrase "run the reference canary". Reads a bundled reference file and reports a marker string.
```

Four separate invocations all fired the skill and returned the correct marker verbatim,
with exit code 0 every time:

```
$ copilot -p 'run the reference canary' --allow-all-tools -s
MARKER: PELICAN-7731

$ copilot -p 'run the reference canary' -s          # brief's literal flags, no --allow-all-tools
MARKER: PELICAN-7731

$ copilot -p 'What does the probe-refs skill report as its marker?' -s
The probe-refs skill reports the marker: **PELICAN-7731**

$ copilot -p 'Use the probe-refs skill and tell me the canary marker.' -s
The canary marker is: **PELICAN-7731**
```

Firing rate: 4/4 phrasings fired the skill, including two that did not use the SKILL.md
description's exact trigger phrase — Copilot's skill-selection is not brittle to exact
wording in this small sample.

Permissions: **no explicit `--allow-tool`/`--allow-all-tools` flag was required.** `-s`
alone (`-p 'run the reference canary' -s`) succeeded non-interactively with exit 0. That
is the **observation**. The *explanation* — that reading a file inside the working
directory is auto-approved under the CLI's default manual permission mode
(`defaultPermissionMode: "manual"` auto-approves read-only requests) — is **read out of
`copilot help config`, not observed**. Keep the two apart: what this gate establishes is
"no approval flag was needed here", not "the CLI auto-approves working-directory reads".
Worth recording either way, since the brief expected an approval flag might be needed.

### Claude Code — CONTROL — DISCOVERY: PASS, RESOLUTION: PASS

```
$ claude -p 'run the reference canary'
Marker string from `references/canary.md`:

MARKER: PELICAN-7731

Nothing is needed from you.
```

Control behaves as expected — confirms the probe skill itself is sound, so the Copilot
PASS above is not an artifact of a broken probe.

### VS Code Copilot Chat agent mode — NOT RUN

No VS Code automation tool was available in this environment, so this arm could not be
executed. Recorded as NOT RUN, not inferred from the CLI result, per the binding
constraint ("an honest UNKNOWN beats an inferred PASS"). What a human would need to do to
close this out:
1. Open the probe repo (or this repo, once `.claude/skills/probe-refs/` exists) as a VS
   Code workspace with GitHub Copilot Chat installed.
2. Open Copilot Chat, switch to Agent mode.
3. Type exactly: `run the reference canary`
4. Record whether the reply contains `PELICAN-7731` verbatim or the literal string
   `CANARY UNREACHABLE`, and whether the skill was shown as invoked/attributed in the
   chat UI.

Given the CLI's `copilot skill --help` documents `.claude/skills/` as a first-class,
non-CLI-specific "Project" discovery source (not gated behind a CLI-only flag), and given
VS Code Copilot Chat shares the same underlying skill-discovery mechanism family as the
CLI in GitHub's current docs, a PASS in VS Code is the reasonable prior — but this is a
documented expectation, not an observation, and must not be reported as PASS until a
human actually runs it.

### Escape hatch (Step 3) — NOT NEEDED

Step 3 only applies "if Copilot CLI fails." It did not fail — native resolution of
`.claude/skills/.../references/*.md` worked on the first try with no extra
configuration. Checked anyway for completeness:
- `copilot help config` lists no config key equivalent to VS Code's
  `chat.agentSkillsLocations` (no skills-directory setting appears in the full config
  key list).
- `copilot help environment` has no skills-location environment variable.
- The closest lever is `copilot skill add <directory>` / `copilot skill add --project`,
  which *materializes* (copies) a skill into `~/.copilot/skills/` or
  `.github/skills/` respectively — that's a copy/install mechanism, not a
  "point at an extra directory to read from" mechanism, and it was not needed here.
- `--add-dir <directory>` grants trusted access to an extra directory's
  `.github/skills`/`.github/agents`, again not needed since `.claude/skills/` in the
  working directory root is already a native discovery path.

No escape hatch was invoked because the primary path already passed.

## CONSEQUENCE

**Gate B: PASS on Copilot CLI (discovery and resolution) and PASS on Claude Code
(control). VS Code Copilot Chat agent mode: NOT RUN — needs a human with a GUI.**

Because the Copilot CLI arm passed cleanly and unassisted (no escape hatch, no special
permission flag, 4/4 phrasings fired correctly), the design does **not** need to fall
back to the FAIL consequence. Level-3 progressive disclosure via `references/*.md` is
reachable from `.claude/skills/` on Copilot CLI exactly as it is on Claude Code. The
twelve cited rules can stay in `references/` rather than moving into the SKILL.md body;
the ~380-line SKILL.md budget contraction and the spec-facts.md-to-URL-list demotion are
**not triggered**.

**RESIDUAL — the probe cannot distinguish skill-relative resolution from ordinary
working-directory file reading.** The skill lived at `.claude/skills/probe-refs/` *inside
the CLI's working directory*, so an agent that simply read a path under its own CWD
produces an identical PASS to one that resolved `references/canary.md` relative to a skill
root. For the design as planned — the skill checked into the repo, project-scoped — the two
are operationally the same thing and the PASS is directly usable. For a **personally
installed** copy (`~/.claude/skills`, `~/.copilot/skills` — i.e. what Gate A's installers
actually produce) the reference file sits *outside* the workspace, and neither the
resolution result nor the no-approval-flag result carries over. Gate A additionally
observed that `copilot skill add`'s only copying form does not land `references/` on disk
at all. Read "Level-3 progressive disclosure works from `.claude/skills/`" narrowly: it is
established for a project-scoped skill in the working directory, and is untested for an
installed copy.

**RESIDUAL — surface scope.** This is a Copilot CLI result. It says nothing about Copilot
*code review*, which was probed separately in `gate-c.md` / `gate-c-selection.md` and which
was only ever exercised from `.github/skills/`. Whether code review reads `.claude/skills/`
is untested on either gate.

One further residual risk before treating this as fully closed: the VS Code GUI arm is
unverified by direct observation. It shares the same GitHub-documented skill-discovery family as the
CLI, so a PASS there is likely, but "likely" is not "observed" — a human should run the
4-step VS Code check above before this gate is treated as unconditionally closed across
all three surfaces. Recommend closing Gate E only after either that VS Code check runs,
or the project explicitly decides Copilot CLI + Claude Code parity is sufficient
evidence and VS Code is out of scope for this design.

## Anomaly noted, not investigated further

Mid-probe, an unrelated system-reminder surfaced a previously-unseen personal skill,
`probe-devc` ("Installer fidelity probe. Do not use."), which was not created by this
task. A filesystem check confirmed it is a real file at
`/Users/emildan/.claude/skills/probe-devc`, not a prompt-injection artifact — most likely
a probe skill planted by the concurrently-running Task 2 (Gate A, installer fidelity) in
the shared personal skills directory. It was not invoked and is unrelated to Gate B's
verdict; flagging only so the controller can confirm Task 2 cleans it up.
