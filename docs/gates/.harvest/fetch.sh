#!/usr/bin/env bash
# Fetch each unique blob ONCE (dedupe by blob SHA -> identical template copies collapse).
# Uses the git blobs API so the bytes are exactly what code search indexed => reproducible.
set -u
H=/Users/emildan/work/devcontainers/docs/gates/.harvest
C=/Users/emildan/work/devcontainers/docs/gates/fp-corpus
mkdir -p "$C"
# one representative repo/path per unique blob sha
awk -F'\t' '!seen[$3]++' "$H/hits.uniq.tsv" > "$H/blobs.tsv"
wc -l < "$H/blobs.tsv" > "$H/blobs.count"
: > "$H/manifest.tsv"
fetch_one() {
  IFS=$'\t' read -r repo path sha <<< "$1"
  slug="$(echo "${repo}~${path}" | tr '/' '_')"
  f="$C/$slug"
  if [ ! -s "$f" ]; then
    gh api "repos/$repo/git/blobs/$sha" --jq '.content' 2>/dev/null | tr -d '\n' | base64 -d > "$f" 2>/dev/null
  fi
  if [ -s "$f" ]; then printf '%s\t%s\t%s\t%s\n' "$slug" "$repo" "$path" "$sha"; else rm -f "$f"; fi
}
export -f fetch_one; export C
cat "$H/blobs.tsv" | xargs -P 10 -I{} bash -c 'fetch_one "$@"' _ {} >> "$H/manifest.tsv"
wc -l "$H/manifest.tsv" >> "$H/fetch.log"
echo FETCHDONE >> "$H/fetch.log"
