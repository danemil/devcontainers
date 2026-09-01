# Gate D — false-positive rate of the four flagship heuristics on real configs (Task 5)

**STATUS: STARTED, DEFERRED before completion — Gate D now runs only if Gate E shows lift.**

Re-sequenced by the repository owner mid-run. The expensive half (hand-adjudicating 20+
hits per heuristic, plus a 20-config recall sample per heuristic) was **not started**. This
file is a resumable stub, not a result.

**No false-positive rate, no recall figure and no Phase 2 decision is stated here, because
none was measured.** An unfinished gate that reports a rate is exactly the
"a silently small corpus reads as a clean result" failure the brief warns about.

## How far it got

| Step | State |
| --- | --- |
| 1. Harvest — search phase (rate-limited, ~8 min) | **DONE** — 4,176 hits / 4,165 unique blobs / 4,064 unique repos, list on disk |
| 1b. Harvest — content fetch | **FAILED SILENTLY** (bug found and diagnosed below); `docs/gates/fp-corpus/` is **empty** |
| 2. Harness `docs/gates/fp-measure.mjs` | **DONE** — written verbatim from the brief, including the warning comment above the crude JSONC stripper |
| 3. Run harness + hand-adjudicate | **NOT RUN.** No `parsed`/`unparseable` counts, no per-heuristic hit counts, no adjudications exist |
| 4. Verdict | **NOT REACHED** |

## What exists on disk now

| Path | Contents | Committed? |
| --- | --- | --- |
| `docs/gates/fp-measure.mjs` | The harness, verbatim from the brief | yes |
| `docs/gates/fp-corpus/` | **empty** — 0 files (fetch bug) | no, gitignored |
| `docs/gates/.harvest/hits.uniq.tsv` | 4,176 rows: `repo <TAB> path <TAB> blob-sha` | **yes — force-added past the ignore rule** |
| `docs/gates/.harvest/blobs.tsv` | 4,165 rows, deduped to one repo/path per unique blob sha | **no** — ignored, and *derived*; see the resume recipe |
| `docs/gates/.harvest/harvest.sh` | The shard script | **yes — force-added** |
| `docs/gates/.harvest/fetch.sh` | The content-fetch script (the one carrying the `IFS` bug) | **yes — force-added** |
| `docs/gates/.harvest/harvest.log`, `fetch.log`, `hits.tsv`, `manifest.tsv` | Per-shard yield log, fetch log, pre-dedup hits, empty manifest | no, gitignored |
| `.gitignore` | gained `docs/gates/fp-corpus/` and `docs/gates/.harvest/` | yes |

> **Preservation — done, not pending.** `docs/gates/.harvest/` holds the *expensive* artifact:
> the 4,176-row hit list cost 42 code-search calls against a **10 requests/minute** limit, about
> 8 minutes of wall clock. `.gitignore` still excludes the directory, but `hits.uniq.tsv`,
> `harvest.sh` and `fetch.sh` were **force-added past that rule on purpose** (`git add -f`), so
> those eight minutes now survive a `git clean -fdx` and a fresh clone does not have to buy them
> again. Given that list, the resumed run needs **no code search at all** — only the content
> fetch. **The one thing a fresh clone does not get is `blobs.tsv`**, which is derived rather
> than harvested — see the resume recipe.

## Corpus harvest method — exact and reproducible

The brief's `--paginate` recipe cannot produce a corpus larger than 1,000: the GitHub code
search API hard-caps every *query* at 1,000 results regardless of pagination. A larger corpus
therefore requires **query sharding**. This run sharded on `size:` (file size in bytes),
which partitions the result set disjointly — no cross-shard duplicates were observed
(4,176 raw hits, 4,176 unique after `sort -u`).

Base query and observed universe:

```bash
gh api -X GET search/code -f q='filename:devcontainer.json path:.devcontainer' \
  -f per_page=1 --jq '.total_count'
# 194816
```

Per shard, one 100-result page, `sort=indexed&order=desc` (index recency) rather than the
default best-match, to reduce the star-popularity bias that best-match introduces — the gate
needs ordinary working configs, not the 100 most-starred repos:

```bash
gh api -X GET search/code \
  -f q='filename:devcontainer.json path:.devcontainer size:<LO>..<HI>' \
  -f per_page=100 -f sort=indexed -f order=desc \
  --jq '.items[] | [.repository.full_name, .path, .sha] | @tsv'
```

42 shards, `sleep 7` between calls to stay under the 10/min code-search limit
(`docs/gates/.harvest/harvest.sh` holds the exact list):

```
0..99 100..129 130..159 160..189 190..219 220..249 250..279 280..309 310..339
340..369 370..399 400..429 430..459 460..489 490..519 520..549 550..599 600..649
650..699 700..749 750..799 800..849 850..899 900..999 1000..1099 1100..1199
1200..1299 1300..1399 1400..1499 1500..1699 1700..1899 1900..2099 2100..2399
2400..2699 2700..2999 3000..3499 3500..3999 4000..4999 5000..6999 7000..9999
10000..19999 20000..100000
```

Every shard returned a full 100 except `20000..100000`, which returned 76 — i.e. the
size axis is exhausted at the top end and the corpus is not truncated there.

The `.sha` captured is the **blob** sha, so content is refetched byte-identically to what
search indexed, via `GET repos/{repo}/git/blobs/{sha}` (core limit, 5,000/hr — 4,165 unique
blobs fits in one hour's budget with room to spare). Deduping by blob sha before fetching is
what keeps it under the limit; identical template copies collapse.

## Corpus-composition facts observed (free, from the search step)

- Universe: `total_count` **194,816** for `filename:devcontainer.json path:.devcontainer`.
- Sub-ranges measured directly: `size:100..500` → 32,896; `size:500..1000` → 42,240. The mass
  of real devcontainer.json files sits between roughly 100 B and 1 KB, which is why the shard
  plan is fine-grained there and coarse above 3 KB.
- 4,165 unique blobs across 4,064 unique repos — near 1:1, so the corpus is **not** dominated
  by one repo contributing many configs. A handful of repos (e.g. `bblanchon/ArduinoJson`)
  ship several per-toolchain configs under `.devcontainer/<name>/devcontainer.json`.
- Because sharding is by size and one page is taken per shard, the corpus is **deliberately
  flat across the size spectrum**, not proportional to it. That over-samples large, complex
  configs relative to the wild. That is the right bias for an FP measurement (complex configs
  are where heuristics misread) but it must be stated when the numbers are finally reported —
  the hit *percentages* are not population estimates.

## Blocking bug found in the content fetch — fix before resuming

`docs/gates/.harvest/fetch.sh` wrote **zero** files and consumed only a handful of API calls.
Cause, confirmed by isolating it:

**BSD/macOS `xargs -I{}` does not preserve tabs in the replacement string.** The TSV line
arrives at the child as whitespace-separated, so

```bash
fetch_one() { IFS=$'\t' read -r repo path sha <<< "$1"; ... }
... | xargs -P 10 -I{} bash -c 'fetch_one "$@"' _ {}
```

put the *entire line* into `$repo` and left `$path` and `$sha` empty. `gh api` was then called
on a malformed URL, and because the script had `2>/dev/null` on that call, every failure was
silent — the script reported `FETCHDONE` on an empty corpus.

Two independent lessons for the resumed run:

1. **The fix is one character**: drop `IFS=$'\t'` and let default IFS split on whitespace
   (neither repo, path, nor a sha ever contains a space). Verified separately that the blob
   API call itself works and returns correct base64 content.
2. **Never `2>/dev/null` the fetch.** Add a non-zero-file assertion — e.g. fail loudly if
   `ls fp-corpus | wc -l` is less than 90% of `wc -l < blobs.tsv`. A silent empty corpus is
   the same failure mode the gate exists to prevent, one level down.

Also note: an unrelated `export -f` trap sits next to this one. My interactive shell is
**zsh**, where `export -f` exports the function *text as a variable* rather than a function,
so any `bash -c` child gets `command not found`. Inside `fetch.sh` (a `#!/usr/bin/env bash`
script) this is not the cause — but any attempt to debug the pipeline by pasting it into the
interactive shell will hit it and mislead.

## Rate limits actually observed

| Endpoint | Limit | Observed |
| --- | --- | --- |
| `search/code` | **10 / minute** | 42 calls, `sleep 7` between, zero 403s, `harvest.err` empty |
| core (`repos/.../git/blobs`) | 5,000 / hour | untouched — 4,165 needed, ~4,990 were available |

Token scopes present (`repo`, `admin:org`, `workflow`, `gist`, `user`, `delete_repo`) were
more than sufficient; no scope fallback to cloning `devcontainers/{images,templates,features}`
was needed. The brief's fallback path can be ignored on this machine.

## Adjudications completed

**None.** Zero configs were opened or classified. Sample size: **0 of a target 20 per
heuristic (TP/FP) plus 20 per heuristic (recall).**

## Carried forward for the resumed run

Recorded here so the analysis design does not have to be re-derived. **These are stated
intentions, not findings — nothing below has been measured.**

- The plan's rule table (`docs/superpowers/plans/2026-08-31-devcontainer-agent-package.md`,
  lines 488–494) gives the semantics each adjudication must be judged against:
  `DC-LIFE-001` (ERROR) is about prebuild bakeability; `DC-SEC-001` (ERROR) is about
  `remoteEnv` landing in the `devcontainer.metadata` image label; `DC-PERF-001` (WARN) is
  about named volumes coming up root-owned.
- **`DC-FEAT-PIN` has no corresponding rule in the plan's twelve-rule corpus.** The plan's
  `DC-FEAT-001/002/003` are about `overrideFeatureInstallOrder` vs `dependsOn`, feature
  dependency resolution and idempotency, and the `_REMOTE_USER` family respectively — none is
  about version pinning. `DC-FEAT-PIN` must therefore be measured as a *candidate* for a
  possible Phase 2 check, and **its FP rate cannot demote a rule that does not exist.** Do not
  silently map it onto `DC-FEAT-001/002/003`.
- `DC-LIFE-001`'s judgement call (the brief flags it): it fires on configs that are correct
  because the project never uses prebuilds. A config-internal discriminator is available and
  should be used rather than a guess — whether `image` points at a custom prebuilt registry
  image (prebuild in play → a genuine defect) versus a stock `mcr.microsoft.com/devcontainers/*`
  image or a local `build.dockerfile` (no prebuild layer to bake into → `postCreateCommand` is
  the only sensible place). Report both a strict rate and a regex-misfire-only rate so the
  demotion decision is auditable.
- A known `DC-PERF-001` blind spot to check during the recall sample: the harness tests
  `/type=volume/` against `JSON.stringify(m)` for object-form mounts, which serialise as
  `"type":"volume"` — **object-form volume mounts cannot match** and are guaranteed recall
  misses. Same for volumes declared via `runArgs: ["-v", "name:/path"]`.
- Whether Docker's "empty named volume inherits the image's content and ownership on first
  use" behaviour makes many `DC-PERF-001` hits false positives is the central adjudication
  question for that heuristic, and is currently **unmeasured speculation**.

## Resume recipe (shortest path)

1. Fix `IFS` in `docs/gates/.harvest/fetch.sh`, drop the `2>/dev/null`, add the count assertion.
2. Run it against `docs/gates/.harvest/blobs.tsv` — **no code search needed**, the hit list is
   already on disk. **`blobs.tsv` is not committed**, only `hits.uniq.tsv` is, so in a fresh
   clone it does not exist yet: it is the 4,176-row hit list deduplicated on the **blob-sha
   column** down to one representative `repo/path` per unique sha (4,165 rows). `fetch.sh`
   already re-derives it as its first step —
   `awk -F'\t' '!seen[$3]++' hits.uniq.tsv > blobs.tsv` — so running `fetch.sh` needs nothing
   extra; derive it that way by hand only if the fetch is driven some other way. The dedup is
   cheap and needs no API call. ~4,165 blob fetches, well inside the 5,000/hr core limit.
3. `node docs/gates/fp-measure.mjs docs/gates/fp-corpus`; record `parsed`/`unparseable`. If
   `unparseable` exceeds ~2% of the corpus, stop and say so loudly — the crude regex JSONC
   stripper would be silently biasing the corpus toward simple configs.
4. Then, and only then, the hand-adjudication: ≥20 hits per heuristic (TP/FP, repo+path
   recorded for every one) and 20 non-flagged configs per heuristic for recall.

---

## 2026-09-02 — heuristics realigned to corpus `0.3.0`

The harness was written verbatim from the brief before Gate E ran. Gate E round 3 changed
`DC-SEC-001`'s `Detect` from name-keyed to value-keyed; the harness had not followed. All
three rule-backed heuristics now mirror the `0.3.0` `Detect` text and are pinned by
`docs/gates/fp-measure.test.mjs` (`node --test docs/gates/fp-measure.test.mjs`).
`DC-FEAT-PIN` is unchanged and is still a candidate, not a rule. **No numbers were produced;
the corpus is still empty.** When Gate D runs, run it against this version of the harness
or later, never the one the brief specified.
