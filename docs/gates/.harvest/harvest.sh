#!/usr/bin/env bash
# Gate D corpus harvest.
# GitHub code search caps at 1000 results/query, so we SHARD by file size (bytes)
# and take one 100-result page per shard, sorted by index recency (not stars) to
# reduce popularity bias. Records repo, path and BLOB SHA for reproducibility.
set -u
OUT=/Users/emildan/work/devcontainers/docs/gates/.harvest
Q='filename:devcontainer.json path:.devcontainer'
SHARDS=(
 0..99 100..129 130..159 160..189 190..219 220..249 250..279 280..309
 310..339 340..369 370..399 400..429 430..459 460..489 490..519 520..549
 550..599 600..649 650..699 700..749 750..799 800..849 850..899 900..999
 1000..1099 1100..1199 1200..1299 1300..1399 1400..1499 1500..1699
 1700..1899 1900..2099 2100..2399 2400..2699 2700..2999 3000..3499
 3500..3999 4000..4999 5000..6999 7000..9999 10000..19999 20000..100000
)
: > "$OUT/hits.tsv"
for s in "${SHARDS[@]}"; do
  for attempt in 1 2 3; do
    n=$(gh api -X GET search/code -f q="$Q size:$s" -f per_page=100 -f sort=indexed -f order=desc \
        --jq '.items[] | [.repository.full_name, .path, .sha] | @tsv' 2>>"$OUT/harvest.err" | tee -a "$OUT/hits.tsv" | wc -l)
    if [ "$n" -gt 0 ]; then break; fi
    sleep 25
  done
  echo "shard $s -> $n" >> "$OUT/harvest.log"
  sleep 7
done
sort -u "$OUT/hits.tsv" > "$OUT/hits.uniq.tsv"
wc -l "$OUT/hits.tsv" "$OUT/hits.uniq.tsv" >> "$OUT/harvest.log"
echo DONE >> "$OUT/harvest.log"
