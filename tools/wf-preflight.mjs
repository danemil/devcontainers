#!/usr/bin/env node
// Preflight for Workflow tool scripts.   node tools/wf-preflight.mjs <script.js>
//
// WHY THIS EXISTS
// A markdown backtick in prose inside a backtick-delimited agent prompt silently
// CLOSES the template literal. The parser then blames the next word --
// "Unexpected identifier 'customizations'" -- and never mentions backticks. It
// reports only the FIRST such site, so fixing is whack-a-mole across round trips.
//
// Detecting stray backticks directly is UNDECIDABLE: `str`.length and a markdown
// span before a period lex identically. So this tool does not guess. It checks the
// two things that ARE decidable:
//   1. Does the script parse, in the async context the runtime uses?
//   2. Does any prompt use a MULTI-LINE template literal? Those are prose, and
//      prose belongs in double-quoted lines joined with \n -- where backticks and
//      ${...} are both inert and survive verbatim.
//
// Exit 0 = clean, 1 = parse failure, 2 = usage.
import fs from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: wf-preflight.mjs <script.js>'); process.exit(2) }
const src = fs.readFileSync(file, 'utf8');

const parseErr = (() => {
  try {
    new Function('agent','parallel','pipeline','phase','log','args','budget','workflow',
      'return (async()=>{' + src.replace(/^export const meta =/m, 'const meta =') + '})()');
    return null;
  } catch (e) { return e.message }
})();

if (parseErr) {
  console.log(`PARSE: FAIL - ${parseErr}\n`);
  console.log('Most likely cause: a markdown backtick in prose inside a `...` prompt,');
  console.log('which closed the string early. The parser names the word AFTER it, not');
  console.log('the backtick, and shows only the first of possibly several sites.\n');
  console.log('Fix by construction - put prose in double-quoted lines:');
  console.log('  prompt: [');
  console.log('    "5. The `customizations` namespace, esp. `customizations.vscode`.",');
  console.log('    "Slash commands use ${input:...} and !`bash` execution.",');
  console.log('  ].join("\\n")');
  console.log('\nBackticks, ${...} and apostrophes are all inert there - no escaping at all.');
  process.exit(1);
}

// Script parses, so lexer state is sound and this walk is reliable.
const multiline = [];
let i = 0, mode = 'code', depth = 0, start = -1;
while (i < src.length) {
  const c = src[i], c2 = src.slice(i, i + 2);
  if (mode === 'code') {
    if (c2 === '//') { const n = src.indexOf('\n', i); if (n < 0) break; i = n; continue }
    if (c2 === '/*') { i = src.indexOf('*/', i) + 2; continue }
    if (c === '"' || c === "'") { mode = c; i++; continue }
    if (c === '`') { mode = 'tpl'; start = i; i++; continue }
    if (c === '}' && depth > 0) { depth--; mode = 'tpl'; i++; continue }
    i++; continue;
  }
  if (mode === '"' || mode === "'") {
    if (c === '\\') { i += 2; continue }
    if (c === mode) mode = 'code';
    i++; continue;
  }
  if (c === '\\') { i += 2; continue }
  if (c2 === '${') { depth++; mode = 'code'; i += 2; continue }
  if (c === '`') {
    const body = src.slice(start, i);
    if (body.includes('\n')) multiline.push({ line: src.slice(0, start).split('\n').length, lines: body.split('\n').length });
    mode = 'code'; i++; continue;
  }
  i++;
}

console.log('PARSE: ok');
if (!multiline.length) { console.log('CONVENTION: ok - no multi-line template literals.'); process.exit(0) }
console.log(`\nCONVENTION: ${multiline.length} multi-line template literal(s) holding prose.`);
console.log('These parse today but are one markdown backtick away from breaking,');
console.log('and any ${...} in them interpolates instead of reaching the agent:\n');
for (const m of multiline) console.log(`  ${file}:${m.line}  (${m.lines} lines)`);
console.log('\nPrefer:  prompt: [ "line one", "line two with `code` and ${vars}" ].join("\\n")');
