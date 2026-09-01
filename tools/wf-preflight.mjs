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
// KNOWN LIMITATION of check 2: the scanner does not recognise regex literals, so a
// quote or backtick inside /.../ can desynchronise it. Check 1 is unaffected.
//
// Exit 0 = clean, 1 = parse failure, 2 = usage.
import fs from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const EXIT = { CLEAN: 0, PARSE_FAILURE: 1, USAGE: 2 };

// The identifiers the Workflow runtime injects into a script's scope. A script that
// references anything else at top level still parses, so this list only needs to
// cover names the parser would otherwise reject as illegal `await` targets etc.
const RUNTIME_GLOBALS = ['agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow'];

const PARSE_FAILURE_ADVICE = [
  'Most likely cause: a markdown backtick in prose inside a `...` prompt,',
  'which closed the string early. The parser names the word AFTER it, not',
  'the backtick, and shows only the first of possibly several sites.',
  '',
  'Fix by construction - put prose in double-quoted lines:',
  '  prompt: [',
  '    "5. The `customizations` namespace, esp. `customizations.vscode`.",',
  '    "Slash commands use ${input:...} and !`bash` execution.",',
  '  ].join("\\n")',
  '',
  'Backticks, ${...} and apostrophes are all inert there - no escaping at all.',
];

const CONVENTION_ADVICE = [
  'These parse today but are one markdown backtick away from breaking,',
  'and any ${...} in them interpolates instead of reaching the agent:',
  '',
];

/**
 * Compile the script the way the Workflow runtime does: `export const meta`
 * demoted to a plain const, body wrapped in an async IIFE so top-level `await`
 * is legal. Returns the parser's message, or null when the script parses.
 */
function parseError(src) {
  const body = src.replace(/^export const meta =/m, 'const meta =');
  try {
    new Function(...RUNTIME_GLOBALS, `return (async()=>{${body}})()`);
    return null;
  } catch (e) {
    return e.message;
  }
}

/**
 * Walk the source with a small lexer that tracks comments, quoted strings and
 * template literals (including `${...}` nesting), and return every template
 * literal whose body spans more than one line, as { line, lines }.
 *
 * Only reliable once parseError() has returned null: on a script that does not
 * parse, lexer state is unknowable and the result would be noise.
 */
function findMultilineTemplates(src) {
  const found = [];
  const MODE = { CODE: 'code', DQ: '"', SQ: "'", TEMPLATE: 'tpl' };
  let i = 0;
  let mode = MODE.CODE;
  let interpolationDepth = 0; // how many `${` we are inside; >0 means `}` returns to TEMPLATE
  const templateStarts = [];  // offsets of every template literal currently open, innermost last

  const lineOf = (offset) => src.slice(0, offset).split('\n').length;

  while (i < src.length) {
    const c = src[i];
    const pair = src.slice(i, i + 2);

    if (mode === MODE.CODE) {
      if (pair === '//') {
        const eol = src.indexOf('\n', i);
        if (eol < 0) break;
        i = eol;
        continue;
      }
      if (pair === '/*') {
        const end = src.indexOf('*/', i);
        if (end < 0) break;
        i = end + 2;
        continue;
      }
      if (c === MODE.DQ || c === MODE.SQ) { mode = c; i++; continue; }
      if (c === '`') { mode = MODE.TEMPLATE; templateStarts.push(i); i++; continue; }
      if (c === '}' && interpolationDepth > 0) { interpolationDepth--; mode = MODE.TEMPLATE; i++; continue; }
      i++;
      continue;
    }

    if (mode === MODE.DQ || mode === MODE.SQ) {
      if (c === '\\') { i += 2; continue; }
      if (c === mode) mode = MODE.CODE;
      i++;
      continue;
    }

    // mode === MODE.TEMPLATE
    if (c === '\\') { i += 2; continue; }
    if (pair === '${') { interpolationDepth++; mode = MODE.CODE; i += 2; continue; }
    if (c === '`') {
      const body = src.slice(templateStarts.pop(), i);
      if (body.includes('\n')) {
        found.push({ line: lineOf(i - body.length), lines: body.split('\n').length });
      }
      mode = MODE.CODE;
      i++;
      continue;
    }
    i++;
  }
  return found;
}

function main(argv) {
  const file = argv[2];
  if (!file) {
    console.error('usage: wf-preflight.mjs <script.js>');
    return EXIT.USAGE;
  }
  const src = fs.readFileSync(file, 'utf8');

  const err = parseError(src);
  if (err) {
    console.log(`PARSE: FAIL - ${err}\n`);
    console.log(PARSE_FAILURE_ADVICE.join('\n'));
    return EXIT.PARSE_FAILURE;
  }

  console.log('PARSE: ok');
  const multiline = findMultilineTemplates(src);
  if (multiline.length === 0) {
    console.log('CONVENTION: ok - no multi-line template literals.');
    return EXIT.CLEAN;
  }

  console.log(`\nCONVENTION: ${multiline.length} multi-line template literal(s) holding prose.`);
  console.log(CONVENTION_ADVICE.join('\n'));
  for (const m of multiline) console.log(`  ${file}:${m.line}  (${m.lines} lines)`);
  console.log('\nPrefer:  prompt: [ "line one", "line two with `code` and ${vars}" ].join("\\n")');
  return EXIT.CLEAN;
}

export { parseError, findMultilineTemplates };

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(main(process.argv));
