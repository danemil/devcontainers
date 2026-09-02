#!/usr/bin/env bash
# Gate D corpus harvest — phase 2 of 2. Fetch each unique blob ONCE.
#
# Input:  hits.uniq.tsv (repo, path, blob-sha) next to this script.
# Output: ../fp-corpus/<repo~path with / -> _>   one file per unique blob sha
#         blobs.tsv      one representative (repo, path, sha) per unique sha — DERIVED,
#                        regenerated from hits.uniq.tsv on every run
#         manifest.tsv   slug, repo, path, sha for every blob actually fetched
#         fetch.log      row count and completion marker
#
# Dedupe is by blob SHA so identical template copies collapse to one file. The git
# blobs API returns exactly the bytes code search indexed, which keeps the corpus
# reproducible from the committed hit list alone.
#
# Deliberately NOT `set -e`: one unfetchable blob must not abort the other 4,000.
set -u

HARVEST="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORPUS="$(cd "$HARVEST/.." && pwd)/fp-corpus"
PARALLEL=10
mkdir -p "$CORPUS"

# One representative repo/path per unique blob sha.
awk -F'\t' '!seen[$3]++' "$HARVEST/hits.uniq.tsv" > "$HARVEST/blobs.tsv"
wc -l < "$HARVEST/blobs.tsv" > "$HARVEST/blobs.count"
: > "$HARVEST/manifest.tsv"

# Fetch one blob given a "repo<TAB>path<TAB>sha" line; print its manifest row on success.
# Runs in a child bash via xargs, hence the export below.
fetch_one() {
  local repo path sha slug file
  IFS=$'\t' read -r repo path sha <<< "$1"
  slug="$(printf '%s~%s' "$repo" "$path" | tr '/' '_')"
  file="$CORPUS/$slug"
  if [ ! -s "$file" ]; then
    gh api "repos/$repo/git/blobs/$sha" --jq '.content' 2>/dev/null \
      | tr -d '\n' | base64 -d > "$file" 2>/dev/null
  fi
  if [ -s "$file" ]; then
    printf '%s\t%s\t%s\t%s\n' "$slug" "$repo" "$path" "$sha"
  else
    rm -f "$file"
  fi
}
export -f fetch_one
export CORPUS

xargs -P "$PARALLEL" -I{} bash -c 'fetch_one "$@"' _ {} < "$HARVEST/blobs.tsv" >> "$HARVEST/manifest.tsv"

wc -l "$HARVEST/manifest.tsv" >> "$HARVEST/fetch.log"
echo FETCHDONE >> "$HARVEST/fetch.log"
