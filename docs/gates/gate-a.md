# Gate A — installer fidelity

**Question:** Do `npx skills add`, `gh skill install`, and `copilot skill add` preserve
subdirectories and the executable bit? If any flattens the tree, every design with `bin/` or
`references/` breaks on its own advertised install channel.

**Method:** Empirically probed. Built a probe skill
(`skills/probe-devc/{SKILL.md, references/deep.md, bin/probe.mjs (chmod +x)}`), pushed it to a
scratch GitHub repo (`danemil/probe-skill-gatea`, created private), and ran each installer's real
`--help` output first (the brief's guessed command names were wrong for two of the three — see
below), then ran each installer against the repo and inspected the result: file presence,
`stat`/direct-exec of `bin/probe.mjs`, and a byte diff of the installed `SKILL.md` against the
source.

## Corrected invocations (brief's guesses were wrong)

| Brief guessed | Actual command that exists |
|---|---|
| `npx skills add <you>/probe-skill` | Correct as guessed: `npx skills add danemil/probe-skill-gatea -g -a claude-code -y` |
| `gh skill install <you>/probe-skill` | Needs an explicit skill name to actually install (bare repo just lists matches non-interactively): `gh skill install danemil/probe-skill-gatea probe-devc --agent claude-code --scope user` |
| `copilot skill add <you>/probe-skill` | **Does not exist.** `copilot skill add` takes only a local file, local directory, or an HTTPS URL to a single `SKILL.md` — there is no GitHub-repo-ref form at all. Tested both real forms: `copilot skill add /path/to/skills/probe-devc` (directory) and `copilot skill add /path/to/skills/probe-devc/SKILL.md` (file). |

## Results per installer

### `npx skills add` (via `skills` npm CLI) — target: `~/.claude/skills/probe-devc`

- (a) `references/deep.md` exists: **PASS** — content intact (`MARKER-DEEP-FILE-SURVIVED`)
- (b) `bin/probe.mjs` exists: **PASS**
- (c) executable bit preserved: **PASS** — `-rwxr-xr-x`, `node bin/probe.mjs` and direct exec both ran
- (d) frontmatter injection: **PASS (none)** — `diff` against source `SKILL.md` was byte-identical

### `gh skill install` — target: `~/.claude/skills/probe-devc` (`--agent claude-code --scope user`)

- (a) `references/deep.md` exists: **PASS** — content intact, and the CLI itself prints a tree
  showing `bin/` and `references/` on install
- (b) `bin/probe.mjs` exists: **PASS** (content intact)
- (c) executable bit preserved: **FAIL** — file landed `-rw-r--r--` (644, source was 755).
  Confirmed empirically: direct exec (`~/.claude/skills/probe-devc/bin/probe.mjs`) returned
  `permission denied` (exit 126); it only ran when invoked as `node bin/probe.mjs`.
- (d) frontmatter injection: **CONFIRMED, exactly as the brief warned.** `gh skill install`
  injects a nested `metadata:` block into the SKILL.md frontmatter:
  ```yaml
  metadata:
      github-path: skills/probe-devc
      github-ref: refs/heads/main
      github-repo: https://github.com/danemil/probe-skill-gatea
      github-tree-sha: a592c038e4f6fb975b2b738ac0a588e2721e0ed0
  ```
  Verbatim diff (source → installed):
  ```
  2d1
  < name: probe-devc
  4a4,9
  > metadata:
  >     github-path: skills/probe-devc
  >     github-ref: refs/heads/main
  >     github-repo: https://github.com/danemil/probe-skill-gatea
  >     github-tree-sha: a592c038e4f6fb975b2b738ac0a588e2721e0ed0
  > name: probe-devc
  ```
  Four keys added under one nested `metadata:` frontmatter key (not four top-level keys), plus key
  reordering (`name` moved after `metadata`).

### `copilot skill add` — no repo-ref install path exists; both real forms tested

**Form 1 — directory source** (`copilot skill add <local-clone>/skills/probe-devc`): this is a
**pointer registration**, not a copy. It writes the literal path into
`~/.copilot/settings.json` → `"skillDirectories": ["<path>"]` and reads the skill from that
location at use time. No files are copied anywhere, so:
- (a)/(b)/(c): trivially "preserved" — nothing was copied, the original clone (with git's own
  correct exec bit) is read in place. This is not a meaningful PASS for a `<you>/probe-skill`
  repo-ref install channel, because **no such channel exists** for `copilot skill add` — it only
  ever points at something already on the local disk.
- (d) frontmatter: unmodified (byte-identical, since nothing is copied).

**Form 2 — single-file source** (`copilot skill add <local-clone>/skills/probe-devc/SKILL.md`):
this is the only form that actually copies into `~/.copilot/skills/<name>/SKILL.md`.
- (a) `references/deep.md` exists: **FAIL** — not copied at all, only `SKILL.md` landed
- (b) `bin/probe.mjs` exists: **FAIL** — not copied at all
- (c) executable bit: **N/A** — no file to check, `bin/` doesn't exist post-install
- (d) frontmatter injection: **PASS (none)** — byte-identical to source

## CONSEQUENCE

`npx skills add` is the only one of the three that installs a subdirectory tree from a GitHub repo
ref with full fidelity (subdirs, exec bit, and a byte-identical `SKILL.md`) — it is the safe
reference implementation for Phase 2's `bin/` design.

`gh skill install` preserves `references/` depth but **strips the executable bit on every
installed file** and **always writes a nested `metadata:` block into SKILL.md frontmatter**
(`github-path`, `github-ref`, `github-repo`, `github-tree-sha`). Any design that ships a `bin/`
script meant to be run directly (`./bin/probe.mjs`) is **not installable-and-runnable** through
this channel without a post-install `chmod +x` the project cannot control. And a strict
CI gate that requires SKILL.md frontmatter to contain exactly four specific keys **will fail**
against a `gh skill install`-installed copy, because this installer unconditionally adds a fifth
top-level key (`metadata:`, itself holding 4 sub-keys) that the source file never had. Any
"validate installed frontmatter is exactly {these 4 keys}" gate must either special-case/ignore
`metadata:` or accept the file only pre-install.

`copilot skill add` has **no GitHub-repo-ref install path at all** — the brief's assumed command
(`copilot skill add <you>/probe-skill`) does not exist and never will resolve a `owner/repo`
argument; that argument type simply isn't accepted. The only two real forms are (1) register an
already-local directory by path (no copy, so fidelity is moot — nothing is materialized from the
repo), or (2) copy a single `SKILL.md` file, which **drops `references/` and `bin/` entirely**.
Consequence: for a project that wants "install my SKILL.md by pointing Copilot at my GitHub repo,"
there is currently no such installer on this CLI — depth must either live entirely inside one
`SKILL.md` file, or the project must document "clone the repo, then `copilot skill add
<clone>/skills/<name>`" as a two-step, non-repo-ref workaround. Either way, **Phase 2's `bin/` is
not installable-and-runnable through any of the three advertised channels without extra steps**:
`npx skills add` is clean; `gh skill install` needs a documented `chmod +x` recovery step;
`copilot skill add` cannot fetch a repo at all.

## Provenance issue (Step 3, gh skill install)

Confirmed exactly as the brief anticipated: `gh skill install` (and, per its `--help`, `gh skill
update` on refresh) injects source-repo / ref / tree-SHA into SKILL.md frontmatter, under a single
nested `metadata:` key holding 4 sub-keys. A CI gate that checks "frontmatter has exactly these 4
keys, no others" **will fail** on a `gh skill install`-installed copy of any skill, including one
this project publishes, the moment someone installs it via `gh skill install` and re-validates the
installed copy rather than the source file.

## Environment notes / limitations

- All three installers were run against a **private** probe repo (`danemil/probe-skill-gatea`);
  none required making it public — both `npx skills add` and `gh skill install` reached it fine
  via the authenticated `gh`/git credential helper, so the private-repo fallback-to-public
  contingency in the task's controller ruling was not needed.
- **Cleanup gap:** the probe GitHub repo could not be deleted — `gh repo delete
  danemil/probe-skill-gatea --yes` returned `HTTP 403: Must have admin rights to Repository ...
  needs the "delete_repo" scope`. The authenticated token's scopes (admin:org, gist, repo, user,
  workflow) do not include `delete_repo`. Widening the token's scope was out of scope for this
  gate (a deliberate account-level auth change, not a probe action), so it was not done
  unilaterally. **`danemil/probe-skill-gatea` still exists on GitHub, private, containing only the
  inert marker files described above** — needs manual deletion (`gh auth refresh -h github.com -s
  delete_repo` then `gh repo delete danemil/probe-skill-gatea --yes`, or delete via the GitHub UI).
- All local probe artifacts were fully cleaned up: `~/.claude/skills/probe-devc`,
  `~/.agents/skills/probe-devc` (never actually populated — see npx result below),
  `~/.copilot/skills/probe-devc`, and the `skillDirectories` registration in
  `~/.copilot/settings.json` were all removed and verified absent by a final sweep. No
  pre-existing skill directory was touched.
- One incidental finding: `npx skills add ... -a claude-code` printed an install-summary line
  claiming a copy to `~/.agents/skills/probe-devc`, but the file actually landed only in
  `~/.claude/skills/probe-devc` — `~/.agents/skills/probe-devc` was never created. Not required by
  this gate's question, noted for awareness only.

## Addendum — does Copilot accept an author-written metadata: block?

**Question.** Gate A above answered a different question — that `gh skill install` *injects* its
own nested `metadata:` block on install. It did not test whether GitHub Copilot CLI *accepts* an
author-written `metadata:` block in a project-scoped `SKILL.md` it discovers directly (no
`gh skill install` involved). This addendum tests that directly.

**Method.** In a throwaway git repo `/tmp/gate-a-metadata` (deleted after this probe; never
touched `/Users/emildan/work/devcontainers`), two project-scoped skills were created side by side:

- `.claude/skills/meta-canary/SKILL.md` — frontmatter with exactly the four keys the project
  intends to ship (`name`, `description`, `license`, `metadata:` with `corpus_version` and
  `spec_verified` sub-keys). Body reports marker `OSPREY-5150`.
- `.claude/skills/plain-canary/SKILL.md` — identical shape but with only `name`, `description`,
  `license` (no `metadata:` block). Body reports marker `OSPREY-5151`.

Tool versions: `copilot` = GitHub Copilot CLI 1.0.82 (updated from 1.0.81 automatically between
task setup and this run); `claude` on PATH as second control.

**Commands, verbatim output, exit codes.**

1. `copilot skill list` (from `/tmp/gate-a-metadata`):
   - Exit code: `0`
   - stdout (relevant excerpt):
     ```
     Project skills:
       meta-canary - Use when the user says the exact phrase "run the metadata canary". Reports a marker string.
       plain-canary - Use when the user says the exact phrase "run the plain canary". Reports a marker string.
     ```
   - stderr:
     ```
     ✖ The following skills failed to load:
       • /Users/emildan/.agents/skills/react-components/SKILL.md: Skill name must start with an ASCII letter or number and contain only ASCII letters (a-z, A-Z), numbers, hyphens, underscores, dots, and spaces
     ```
     This stderr line is about an unrelated, pre-existing personal skill (`react-components`,
     naming-convention failure) picked up from `~/.agents/skills` because Copilot CLI's discovery
     is not confined to the working directory — it is **not** about either canary and **not**
     about `metadata:`. Both canaries listed cleanly, side by side, with identical formatting and
     no annotation distinguishing them.
   - `copilot skill list --json`, filtered to the two canary entries — both come back structurally
     identical (only `name`/`description`/`source`/`path`/`enabled`; the JSON listing does not
     echo back frontmatter extras like `metadata`, so its absence in the JSON is not itself
     evidence of anything — it's just not part of that view):
     ```json
     {
       "name": "meta-canary",
       "description": "Use when the user says the exact phrase \"run the metadata canary\". Reports a marker string.",
       "source": "project",
       "path": "/private/tmp/gate-a-metadata/.claude/skills/meta-canary",
       "enabled": true
     }
     {
       "name": "plain-canary",
       "description": "Use when the user says the exact phrase \"run the plain canary\". Reports a marker string.",
       "source": "project",
       "path": "/private/tmp/gate-a-metadata/.claude/skills/plain-canary",
       "enabled": true
     }
     ```
   - `copilot skill --help` / `copilot skill add --help` / `copilot skill list --help` were checked
     for a validate/info subcommand: **none exists**. Only `add`, `list`, `remove`. So there is no
     cheaper validation path than actually listing/running the skill.

2. `copilot -p 'run the metadata canary' -s`:
   - Exit code: `0`
   - stdout:
     ```
     OSPREY-5150
     ```
   - stderr: empty.
   - Fired and returned its marker with no warning on any stream.

3. `copilot -p 'run the plain canary' -s` (control):
   - Exit code: `0`
   - stdout:
     ```
     OSPREY-5151
     ```
   - stderr: empty.
   - Fired and returned its marker with no warning on any stream — behaviour indistinguishable
     from the `metadata:`-bearing skill above.

4. Second control, `claude -p 'run the metadata canary'`:
   - Exit code: `0`
   - stdout:
     ```
     OSPREY-5150

     Metadata canary marker reported. Nothing is needed from you.
     ```
   - stderr: empty.
   - Confirms the skill file itself (frontmatter included) is well-formed and triggers correctly
     under Claude Code too, ruling out a malformed-file explanation for the Copilot result.

**Interpretation.** Per the binding rules: meta-canary was listed, fired, returned its exact
marker, and produced no warning/error/complaint on stdout or stderr in any of the above — matching
plain-canary's behavior byte-for-byte apart from the marker itself. The one stderr line observed
anywhere in this probe is unrelated (a different, pre-existing skill's naming violation), not a
metadata complaint, and is quoted above in full rather than summarized.

**VERDICT: ACCEPTED**

**Consequence for the project:** the shipped frontmatter stays four keys (`name`, `description`,
`license`, `metadata`). No fallback to moving `corpus_version` into the body as a plain line is
needed.

**Cleanup.** `/tmp/gate-a-metadata` was a throwaway git repo, deleted after this probe. No skill
was ever installed via `copilot skill add`, so `~/.copilot/skills` was never touched by this probe
(verified empty before and after). `~/.claude/skills` was checked and contains no `meta-canary` /
`plain-canary` contamination. No entries were added to `~/.copilot/settings.json`. No command was
run inside `/Users/emildan/work/devcontainers`, and no skill directory was created inside that
repo.
