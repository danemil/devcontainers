// node --test docs/gates/fp-measure.test.mjs
// Encodes the Detect semantics of corpus 0.3.0 for the three rule-backed
// heuristics, plus the DC-FEAT-PIN candidate. When rules.md changes a Detect,
// change the matching test here first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseJsonc, HEURISTICS, measure } from './fp-measure.mjs';

const fires = Object.fromEntries(HEURISTICS.map((h) => [h.id, h.test]));

test('parseJsonc: comments and trailing commas go, // inside strings stays', () => {
  const src = `{
    // line comment
    "name": "a//b and http://x", /* block */
    "list": [1, 2,],
  }`;
  assert.deepEqual(parseJsonc(src), { name: 'a//b and http://x', list: [1, 2] });
});

// ---- DC-LIFE-001: expensive install in postCreateCommand while onCreate/updateContent are absent or trivial
test('DC-LIFE-001 fires: npm ci in postCreateCommand, no onCreateCommand', () => {
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: 'npm ci && echo ok' }), true);
});
test('DC-LIFE-001 fires on the object form', () => {
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: { deps: ['poetry', 'install'], other: 'echo' } }), true);
});
test('DC-LIFE-001 fires on apt-get install and make (corpus list, not the old regex)', () => {
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: 'sudo apt-get install -y jq' }), true);
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: 'make' }), true);
});
test('DC-LIFE-001 silent when onCreateCommand already carries real work', () => {
  assert.equal(fires['DC-LIFE-001']({ onCreateCommand: 'npm ci', postCreateCommand: 'npm ci' }), false);
});
test('DC-LIFE-001 silent when updateContentCommand carries real work', () => {
  assert.equal(fires['DC-LIFE-001']({ updateContentCommand: ['npm', 'ci'], postCreateCommand: 'npm ci' }), false);
});
test('DC-LIFE-001 silent with no install at all', () => {
  assert.equal(fires['DC-LIFE-001']({ postCreateCommand: 'echo hello' }), false);
});

// ---- DC-SEC-001: the VALUE decides, never the key
test('DC-SEC-001 silent on ${localEnv:} under a secret-shaped key (the Gate E harm case)', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { GITHUB_TOKEN: '${localEnv:GITHUB_TOKEN}' } }), false);
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { API_KEY: '${localEnv:API_KEY:default}' } }), false);
  assert.equal(fires['DC-SEC-001']({ containerEnv: { PASSWORD: '${containerEnv:PW}' } }), false);
});
test('DC-SEC-001 fires on a recognisable credential prefix under ANY key', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { FOO: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789' } }), true);
  assert.equal(fires['DC-SEC-001']({ containerEnv: { X: 'AKIAIOSFODNN7EXAMPLE' } }), true);
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { DB: 'postgres://user:s3cret@host/db' } }), true);
});
test('DC-SEC-001 fires on a low-entropy literal under a secret-shaped key', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { PASSWORD: 'hunter2' } }), true);
});
test('DC-SEC-001 silent on obvious placeholders under a secret-shaped key', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { API_KEY: 'changeme' } }), false);
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { API_KEY: '<your-key-here>' } }), false);
});
test('DC-SEC-001 silent on a plain literal under a non-secret key', () => {
  assert.equal(fires['DC-SEC-001']({ remoteEnv: { NODE_ENV: 'production', PORT: '3000' } }), false);
});
test('DC-SEC-001 also reads build.args with the same value test', () => {
  assert.equal(fires['DC-SEC-001']({ build: { args: { NPM_TOKEN: 'npm_abcdefghijklmnopqrstuvwxyz012345' } } }), true);
  assert.equal(fires['DC-SEC-001']({ build: { args: { NPM_TOKEN: '${localEnv:NPM_TOKEN}' } } }), false);
});

// ---- DC-PERF-001: volume mount + non-root user + no chown
const volumeMount = 'source=x-node_modules,target=/w/node_modules,type=volume';
test('DC-PERF-001 fires: volume mount, non-root remoteUser, no chown', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: [volumeMount], remoteUser: 'vscode', postCreateCommand: 'npm ci' }), true);
});
test('DC-PERF-001 fires on the object mount form and on workspaceMount', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: [{ source: 'v', target: '/w', type: 'volume' }], containerUser: 'node' }), true);
  assert.equal(fires['DC-PERF-001']({ workspaceMount: 'source=ws,target=/w,type=volume', remoteUser: 'vscode' }), true);
});
test('DC-PERF-001 silent when the container runs as root (no user set, or root)', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: [volumeMount] }), false);
  assert.equal(fires['DC-PERF-001']({ mounts: [volumeMount], remoteUser: 'root' }), false);
});
test('DC-PERF-001 silent when postCreateCommand chowns', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: [volumeMount], remoteUser: 'vscode', postCreateCommand: { fix: 'sudo chown -R vscode /w/node_modules' } }), false);
});
test('DC-PERF-001 silent on a bind mount', () => {
  assert.equal(fires['DC-PERF-001']({ mounts: ['source=/h,target=/w,type=bind'], remoteUser: 'vscode' }), false);
});

// ---- DC-FEAT-PIN: candidate, not a corpus rule
test('DC-FEAT-PIN is a candidate (proxyFor null) and flags unpinned or :latest features', () => {
  const h = HEURISTICS.find((x) => x.id === 'DC-FEAT-PIN');
  assert.equal(h.proxyFor, null);
  assert.equal(h.test({ features: { 'ghcr.io/devcontainers/features/node:1': {} } }), false);
  assert.equal(h.test({ features: { 'ghcr.io/devcontainers/features/node': {} } }), true);
  assert.equal(h.test({ features: { 'ghcr.io/devcontainers/features/node:latest': {} } }), true);
});

// ---- measure(): counts and unparseable
test('measure counts parsed, unparseable and per-heuristic hits', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fp-'));
  try {
    writeFileSync(join(dir, 'a.json'), '{ "postCreateCommand": "npm ci", }');
    writeFileSync(join(dir, 'b.json'), '{ not json');
    writeFileSync(join(dir, 'c.json'), '{ "postCreateCommand": "echo" }');
    const { hits, totals } = measure(dir);
    assert.deepEqual(totals, { parsed: 2, failed: 1 });
    assert.deepEqual(hits['DC-LIFE-001'], ['a.json']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
