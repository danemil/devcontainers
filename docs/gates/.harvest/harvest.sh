#!/usr/bin/env bash
# Gate D corpus harvest — phase 1 of 2 (see fetch.sh for phase 2).
#
# GitHub code search caps at 1000 results per query, so we SHARD by file size
# (bytes) and take one 100-result page per shard, sorted by index recency (not
# stars) to reduce popularity bias. Records repo, path and BLOB SHA so fetch.sh
# can retrieve exactly the bytes that were indexed.
#
# Outputs, all next to this script:
#   hits.tsv       every row returned, in shard order (may contain duplicates)
#   hits.uniq.tsv  sorted, deduplicated — this is the committed artefact
#   harvest.log    per-shard row counts and final totals
#   harvest.err    stderr from every gh call
#
# Deliberately NOT `set -e`: a failed shard is retried, then recorded as 0 rows.
set -u

OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUERY='filename:devcontainer.json path:.devcontainer'
PER_PAGE=100
RETRIES=3
RETRY_SLEEP=25   # seconds; code search is rate-limited hard
SHARD_SLEEP=7    # seconds between shards, for the same reason

# Byte-size ranges. Narrow where the distribution is dense, wide in the tail.
SHARDS=(
 0..99 100..129 130..159 160..189 190..219 220..249 250..279 280..309
 310..339 340..369 370..399 400..429 430..459 460..489 490..519 520..549
 550..599 600..649 650..699 700..749 750..799 800..849 850..899 900..999
 1000..1099 1100..1199 1200..1299 1300..1399 1400..1499 1500..1699
 1700..1899 1900..2099 2100..2399 2400..2699 2700..2999 3000..3499
 3500..3999 4000..4999 5000..6999 7000..9999 10000..19999 20000..100000
)

# Print "repo<TAB>path<TAB>blob-sha" for one shard; stdout row count is the caller's signal.
search_shard() {
  local size_range=$1
  gh api -X GET search/code \
    -f q="$QUERY size:$size_range" -f per_page="$PER_PAGE" -f sort=indexed -f order=desc \
    --jq '.items[] | [.repository.full_name, .path, .sha] | @tsv' \
    2>>"$OUT/harvest.err"
}

: > "$OUT/hits.tsv"
for shard in "${SHARDS[@]}"; do
  rows=0
  for (( attempt = 1; attempt <= RETRIES; attempt++ )); do
    rows=$(search_shard "$shard" | tee -a "$OUT/hits.tsv" | wc -l)
    [ "$rows" -gt 0 ] && break
    sleep "$RETRY_SLEEP"
  done
  echo "shard $shard -> $rows" >> "$OUT/harvest.log"
  sleep "$SHARD_SLEEP"
done

sort -u "$OUT/hits.tsv" > "$OUT/hits.uniq.tsv"
wc -l "$OUT/hits.tsv" "$OUT/hits.uniq.tsv" >> "$OUT/harvest.log"
echo DONE >> "$OUT/harvest.log"
