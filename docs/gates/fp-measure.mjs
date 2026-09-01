// docs/gates/fp-measure.mjs — run: node docs/gates/fp-measure.mjs docs/gates/fp-corpus
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// JSONC: devcontainer.json permits comments and trailing commas.
// WARNING: this stripper is deliberately crude and is ACCEPTABLE ONLY HERE, in a
// measurement harness that reports its own unparseable count. It will mangle a `//`
// inside a string literal. Count `unparseable` and eyeball a sample of failures — if
// the rate exceeds ~2%, the corpus is being silently biased toward simple configs.
// DO NOT reuse this in the Phase 2 checker. See the JSONC note in Task 12.
const parse = s => JSON.parse(
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/,(\s*[}\]])/g, '$1')
)
const flat = c => Array.isArray(c) ? c.join(' ') : typeof c === 'object' && c ? Object.values(c).flat().join(' ') : String(c ?? '')

const HEURISTICS = {
  'DC-LIFE-001': d => /\b(npm (ci|i|install)|yarn|pnpm|pip install|bundle install|go mod download|cargo build|mvn|gradle)\b/
    .test(flat(d.postCreateCommand)),
  'DC-SEC-001': d => Object.entries({ ...(d.remoteEnv || {}), ...(d.containerEnv || {}) })
    .some(([k, v]) => /TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL/i.test(k) && !/^\$\{localEnv:/.test(String(v))),
  'DC-PERF-001': d => (d.mounts || []).some(m => /type=volume/.test(typeof m === 'string' ? m : JSON.stringify(m)))
    && !/chown/.test(flat(d.postCreateCommand)),
  'DC-FEAT-PIN': d => Object.keys(d.features || {}).some(f => !/[:@]/.test(f) || /:latest$/.test(f)),
}

const counts = {}, total = { parsed: 0, failed: 0 }
for (const f of readdirSync(process.argv[2])) {
  let d
  try { d = parse(readFileSync(join(process.argv[2], f), 'utf8')); total.parsed++ }
  catch { total.failed++; continue }
  for (const [id, fn] of Object.entries(HEURISTICS)) {
    try { if (fn(d)) (counts[id] ??= []).push(f) } catch {}
  }
}
console.log(`parsed=${total.parsed} unparseable=${total.failed}`)
for (const [id, hits] of Object.entries(counts))
  console.log(`${id}\t${hits.length}\t${(hits.length / total.parsed * 100).toFixed(1)}%\t${hits.slice(0, 5).join(', ')}`)
