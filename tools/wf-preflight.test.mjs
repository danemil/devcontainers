// node --test tools/wf-preflight.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseError, findMultilineTemplates } from './wf-preflight.mjs';

const BROKEN = [
  "export const meta = { name: 'x', description: 'y' }",
  "const r = await agent(`Review the `customizations` namespace.`, { label: 'a' })",
  'return r',
].join('\n');

const NESTED = [
  "export const meta = { name: 'x', description: 'y' }",
  '// a comment with a ` backtick and "quote"',
  'const p = `line one',
  "line two ${'inner ' + `nested",
  'tpl`} end`',
  'const s = "double \\" quoted"; const t = \'single \\\' quoted\'',
  'const q = `single line ${1}`',
  'return await agent(p, { label: `l:${t}` })',
].join('\n');

const CLEAN = [
  "export const meta = { name: 'x', description: 'y' }",
  '/* block ` comment */',
  'const p = ["line one with `code`", "line two ${vars}"].join("\\n")',
  'return await agent(p, { label: `l` })',
].join('\n');

test('parseError: a markdown backtick inside a template prompt is a parse failure', () => {
  const err = parseError(BROKEN);
  assert.ok(err, 'expected a message');
  // The exact V8 wording is deliberately not asserted here: it varies by
  // Node version and by where the unterminated string happens to sit (e.g.
  // "Unexpected identifier" vs "missing ) after argument list"). The
  // contract is only that a non-parsing script yields a non-empty message.
  assert.equal(typeof err, 'string');
});

test('parseError: export const meta and top-level await are accepted', () => {
  assert.equal(parseError(NESTED), null);
  assert.equal(parseError(CLEAN), null);
});

test('findMultilineTemplates: reports the outer literal at its own line, and the nested one', () => {
  const found = findMultilineTemplates(NESTED).sort((a, b) => a.line - b.line);
  assert.deepEqual(found, [{ line: 3, lines: 3 }, { line: 4, lines: 2 }]);
});

test('findMultilineTemplates: single-line templates, strings and comments are ignored', () => {
  assert.deepEqual(findMultilineTemplates(CLEAN), []);
});

test('findMultilineTemplates: an unterminated block comment does not loop', () => {
  assert.deepEqual(findMultilineTemplates('const a = 1 /* never closed'), []);
});
