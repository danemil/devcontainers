#!/usr/bin/env node
// Gate D false-positive measurement harness.
//   node docs/gates/fp-measure.mjs docs/gates/fp-corpus
//
// Reads every file in the corpus directory as JSONC, applies a fixed set of
// cheap heuristics, and prints how often each fires. It exists to put a number
// on "how noisy would this rule be on real configs", nothing more.
//
// WHAT THIS IS NOT
// - Not the audit checker. The heuristics are proxies for the corpus rules'
//   `Detect` steps, hand-simplified to regexes; they are neither as broad nor
//   as careful as the prose they stand in for. Their semantics are pinned to
//   corpus 0.3.0 by fp-measure.test.mjs; when a Detect changes, change the
//   test first.
//   Read `proxyFor` before quoting a number as a property of the rule.
// - Not a spec-grade JSONC parser. It strips comments and trailing commas
//   without interpreting anything else, and reports its own parse-failure count.
//   Watch `unparseable`: if it climbs past ~2% the corpus is being silently
//   biased toward simple configs. DO NOT reuse the stripper in a checker.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const USAGE = 'usage: node docs/gates/fp-measure.mjs <corpus-dir>';
const SAMPLE_SIZE = 5; // how many hit filenames to print per heuristic

// ---------------------------------------------------------------- JSONC ----

/**
 * Remove `//` and `/* *\/` comments, leaving string literals untouched.
 * A comment marker inside a string (e.g. a URL) is data, not a comment.
 */
function stripComments(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // UTF-8 BOM
  let out = '';
  let i = 0;
  let inString = false;
  while (i < text.length) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === '\\') { out += text[i + 1] ?? ''; i += 2; continue; }
      if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') { inString = true; out += c; i++; continue; }
    if (text.startsWith('//', i)) {
      const eol = text.indexOf('\n', i);
      i = eol < 0 ? text.length : eol; // keep the newline itself
      continue;
    }
    if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Remove a comma that is followed only by whitespace and then `}` or `]`. */
function stripTrailingCommas(text) {
  let out = '';
  let i = 0;
  let inString = false;
  while (i < text.length) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === '\\') { out += text[i + 1] ?? ''; i += 2; continue; }
      if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') { inString = true; out += c; i++; continue; }
    if (c === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (text[j] === '}' || text[j] === ']') { i++; continue; } // drop the comma
    }
    out += c;
    i++;
  }
  return out;
}

const parseJsonc = (text) => JSON.parse(stripTrailingCommas(stripComments(text)));

// ----------------------------------------------------------- heuristics ----

/**
 * A lifecycle command is `string | string[] | { [name]: string | string[] }`
 * (DC-LIFE-003). Flatten every form to one searchable string.
 */
function flattenCommand(command) {
  if (Array.isArray(command)) return command.join(' ');
  if (command && typeof command === 'object') return Object.values(command).flat().join(' ');
  return String(command ?? '');
}

// Corpus 0.3.0 DC-LIFE-001 Detect: the cacheable, expensive setup commands.
const INSTALL_COMMAND = /\b(npm (ci|install)|yarn install|pnpm install|pip install|poetry install|bundle install|go mod download|cargo fetch|apt-get install|make|gradle|mvn)\b/;

// A lifecycle hook is "trivial" for DC-LIFE-001 when absent or empty. The
// corpus leaves "trivial" to judgement; this is the proxy's reading of it.
const isTrivialHook = (command) => flattenCommand(command).trim() === '';

// Corpus 0.3.0 DC-SEC-001 Detect. Order matters and mirrors the rule:
//   1. substitution reference  -> never a finding, whatever the key
//   2. recognisable credential -> finding, whatever the key
//   3. secret-shaped key       -> finding unless an obvious placeholder
//   4. anything else           -> not a finding
const SUBSTITUTION = /^\$\{(localEnv|containerEnv):/;
const CREDENTIAL_LITERAL = /^(sk_|ghp_|github_pat_|AKIA|xoxb-|glpat-)|-----BEGIN [A-Z ]*PRIVATE KEY|:\/\/[^/@\s]+:[^@\s]+@/;
const SECRET_SHAPED_KEY = /TOKEN|SECRET|KEY|PASSWORD|PASSWD|CREDENTIAL|_PAT\b/i;
const PLACEHOLDER = /^(changeme|change-me|replace-me|xxx+|todo|<[^>]*>|\$\{?[A-Z_]+\}?)$/i;

function isCredentialEntry([key, rawValue]) {
  const value = String(rawValue ?? '');
  if (SUBSTITUTION.test(value)) return false;
  if (CREDENTIAL_LITERAL.test(value)) return true;
  if (SECRET_SHAPED_KEY.test(key)) return value !== '' && !PLACEHOLDER.test(value);
  return false;
}

const envEntries = (d) => [
  ...Object.entries(d.remoteEnv || {}),
  ...Object.entries(d.containerEnv || {}),
  ...Object.entries((d.build && d.build.args) || {}),
];

// Corpus 0.3.0 DC-PERF-001 Detect: a volume mount, a non-root user, no chown.
const mountAsString = (m) => (typeof m === 'string' ? m : JSON.stringify(m));
const isVolume = (m) => /type=volume|"type":"volume"/.test(mountAsString(m));
const hasVolumeMount = (d) => (d.mounts || []).some(isVolume) || (d.workspaceMount != null && isVolume(d.workspaceMount));
const runsAsNonRoot = (d) => [d.remoteUser, d.containerUser].some((u) => typeof u === 'string' && u !== '' && u !== 'root');

/**
 * Each heuristic: an output id, the corpus rule it approximates (or null for a
 * candidate rule that is not in the corpus), and a predicate over the parsed
 * config. Predicates may throw on odd shapes; the runner counts that as "did
 * not fire". Semantics are pinned by fp-measure.test.mjs.
 */
const HEURISTICS = [
  {
    id: 'DC-LIFE-001',
    proxyFor: 'DC-LIFE-001 ("trivial" hook read as absent-or-empty)',
    test: (d) =>
      INSTALL_COMMAND.test(flattenCommand(d.postCreateCommand))
      && isTrivialHook(d.onCreateCommand)
      && isTrivialHook(d.updateContentCommand),
  },
  {
    id: 'DC-SEC-001',
    proxyFor: 'DC-SEC-001 (value-keyed; prefix list is the rule\'s own)',
    test: (d) => envEntries(d).some(isCredentialEntry),
  },
  {
    id: 'DC-PERF-001',
    proxyFor: 'DC-PERF-001',
    test: (d) =>
      hasVolumeMount(d)
      && runsAsNonRoot(d)
      && !/chown/.test(flattenCommand(d.postCreateCommand)),
  },
  {
    id: 'DC-FEAT-PIN',
    proxyFor: null, // candidate rule; not a corpus ID (see docs/gates/gate-d.md)
    test: (d) => Object.keys(d.features || {}).some((f) => !/[:@]/.test(f) || /:latest$/.test(f)),
  },
];

// --------------------------------------------------------------- runner ----

function measure(corpusDir) {
  const hits = Object.fromEntries(HEURISTICS.map((h) => [h.id, []]));
  const totals = { parsed: 0, failed: 0 };

  for (const file of readdirSync(corpusDir).filter((f) => f.endsWith('.json'))) {
    let config;
    try {
      config = parseJsonc(readFileSync(join(corpusDir, file), 'utf8'));
      totals.parsed++;
    } catch {
      totals.failed++;
      continue;
    }
    for (const h of HEURISTICS) {
      let fired = false;
      try { fired = Boolean(h.test(config)); } catch { /* odd shape: counts as no hit */ }
      if (fired) hits[h.id].push(file);
    }
  }
  return { hits, totals };
}

function report({ hits, totals }) {
  console.log(`parsed=${totals.parsed} unparseable=${totals.failed}`);
  for (const [id, files] of Object.entries(hits)) {
    if (files.length === 0) continue;
    const pct = ((files.length / totals.parsed) * 100).toFixed(1);
    console.log(`${id}\t${files.length}\t${pct}%\t${files.slice(0, SAMPLE_SIZE).join(', ')}`);
  }
}

function main(argv) {
  const corpusDir = argv[2];
  if (!corpusDir) { console.error(USAGE); return 2; }
  report(measure(corpusDir));
  return 0;
}

export { parseJsonc, HEURISTICS, measure };

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(main(process.argv));
