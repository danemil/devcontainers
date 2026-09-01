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
//   as careful as the prose they stand in for (DC-SEC-001 below is the clearest
//   case: the corpus rule judges the VALUE, this proxy still keys on the NAME).
//   Read `proxyFor` before quoting a number as a property of the rule.
// - Not a spec-grade JSONC parser. It strips comments and trailing commas
//   without interpreting anything else, and reports its own parse-failure count.
//   Watch `unparseable`: if it climbs past ~2% the corpus is being silently
//   biased toward simple configs. DO NOT reuse the stripper in a checker.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const USAGE = 'usage: node docs/gates/fp-measure.mjs <corpus-dir>';
const SAMPLE_SIZE = 5; // how many hit filenames to print per heuristic

// ---------------------------------------------------------------- JSONC ----

/**
 * Remove `//` and `/* *\/` comments, leaving string literals untouched.
 * A comment marker inside a string (e.g. a URL) is data, not a comment.
 */
function stripComments(text) {
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

const SECRET_SHAPED_KEY = /TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL/i;
const LOCAL_ENV_SUBSTITUTION = /^\$\{localEnv:/;
const INSTALL_COMMAND = /\b(npm (ci|i|install)|yarn|pnpm|pip install|bundle install|go mod download|cargo build|mvn|gradle)\b/;

const mountAsString = (m) => (typeof m === 'string' ? m : JSON.stringify(m));

/**
 * Each heuristic: an output id, the corpus rule it approximates (or null for a
 * candidate rule that is not in the corpus), and a predicate over the parsed
 * config. Predicates may throw on odd shapes; the runner counts that as "did
 * not fire".
 */
const HEURISTICS = [
  {
    id: 'DC-LIFE-001',
    proxyFor: 'DC-LIFE-001',
    test: (d) => INSTALL_COMMAND.test(flattenCommand(d.postCreateCommand)),
  },
  {
    id: 'DC-SEC-001',
    proxyFor: 'DC-SEC-001 (name-keyed proxy; the corpus rule is value-keyed)',
    test: (d) =>
      Object.entries({ ...(d.remoteEnv || {}), ...(d.containerEnv || {}) })
        .some(([k, v]) => SECRET_SHAPED_KEY.test(k) && !LOCAL_ENV_SUBSTITUTION.test(String(v))),
  },
  {
    id: 'DC-PERF-001',
    proxyFor: 'DC-PERF-001 (ignores the non-root-user precondition)',
    test: (d) =>
      (d.mounts || []).some((m) => /type=volume/.test(mountAsString(m)))
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

  for (const file of readdirSync(corpusDir)) {
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

process.exit(main(process.argv));
