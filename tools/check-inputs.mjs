#!/usr/bin/env node
// check-inputs.mjs — check 7 of the corpus checks.
//
// Run from the repo root:  node tools/check-inputs.mjs, or via tools/check-skill.sh,
// which invokes it as its check 7 and is the single entry point for all of them.
// Exit 0 when every rule passes, 1 on any failure.
//
// What it enforces
// ----------------
// Every `### DC-` rule in references/rules.md carries an `- **Inputs:**` line, and that line
// names the image metadata label **iff** at least one devcontainer.json property it reads is
// absent from SKILL.md's not-label-storable list.
//
// The not-label-storable list is PARSED AT RUNTIME from the sentence beginning
// `Not label-storable:` under "My changes aren't taking effect" in SKILL.md. It is never
// copied here and its length is never hard-coded: label-immunity is read off that positive
// attestation and off nothing else. If that sentence moves or is reworded, this check fails
// loudly rather than silently checking against a stale copy. The same goes for the rule
// count printed at the end — it is counted, never written.
//
// Known limitation — the Detect-vs-Inputs comparison is ADVISORY ONLY
// ------------------------------------------------------------------
// `Detect` prose mentions properties it does not read: DC-SEC-001 quotes the spec's list of
// what the label records (`mounts`, `onCreateCommand`, `remoteUser`, `userEnvProbe`),
// DC-LIFE-002 names `postAttachCommand` as the illegal value people reach for, and
// DC-FEAT-003 mentions `remoteUser` only to describe the symptom a Feature author sees.
// None of those is an input of its rule. A backticked identifier is therefore not evidence
// that the rule reads that property, so this comparison prints `warning` lines and never
// fails the run. The two rules with teeth are the label iff-rule and the missing-Inputs rule.
//
// Backtick convention this relies on: inside an `Inputs` line, backticks are reserved for
// devcontainer.json property names and for filenames outside the config. Environment
// variables, Feature-metadata keys and workflow inputs are written unbackticked there, so
// the property extraction below stays sound.

import { readFileSync } from 'node:fs';

const SKILL = '.claude/skills/devcontainers/SKILL.md';
const RULES = '.claude/skills/devcontainers/references/rules.md';

const die = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };

// --- the thirteen-item list, parsed from SKILL.md ---------------------------------------

function parseNotLabelStorable(text) {
  const marker = 'Not label-storable:';
  const at = text.indexOf(marker);
  if (at === -1) {
    die(`the sentence beginning "${marker}" was not found in ${SKILL} — ` +
        'label-immunity has no source, so nothing can be checked');
  }
  // Walk forward to the first sentence-ending "." that is OUTSIDE a backtick span
  // (`build.*` carries a dot of its own).
  let i = at + marker.length;
  let inTick = false;
  let end = -1;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === '`') { inTick = !inTick; continue; }
    if (c === '.' && !inTick) { end = i; break; }
  }
  if (end === -1) die(`the "${marker}" sentence in ${SKILL} is unterminated`);
  const sentence = text.slice(at + marker.length, end);
  const items = [...sentence.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
  if (items.length === 0) die(`the "${marker}" sentence in ${SKILL} names no properties`);
  return items;
}

// --- property grammar --------------------------------------------------------------------

const IDENT = /^[A-Za-z_][A-Za-z0-9_.]*$/;

// A backticked token counts as a devcontainer.json property name when it is a bare
// identifier (dots allowed). That grammar already excludes anything containing "/", "${",
// a space, an "=" or a "--" flag; ".sh" and ".json" filenames are dropped explicitly.
function toProp(tok) {
  if (!IDENT.test(tok)) return null;
  if (tok.endsWith('.sh') || tok.endsWith('.json')) return null;
  return tok.startsWith('build.') ? 'build.*' : tok;
}

function props(line) {
  const seen = [];
  for (const m of line.matchAll(/`([^`\n]+)`/g)) {
    const p = toProp(m[1]);
    if (p && !seen.includes(p)) seen.push(p);
  }
  return seen;
}

// --- rules.md ----------------------------------------------------------------------------

// Same semantics as check 2's awk fence-strip: rules.md documents its own rule template
// inside a fenced block, and without the strip the template counts as a fourteenth field row.
function stripFences(text) {
  let inFence = false;
  return text.split('\n').filter((l) => {
    if (l.startsWith('```')) { inFence = !inFence; return false; }
    return !inFence;
  });
}

function parseRules(lines) {
  const rules = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith('### DC-')) {
      const id = (line.match(/^### (DC-[A-Z]+-\d+)/) || [])[1];
      if (!id) die(`unparseable rule heading: ${line.slice(0, 60)}`);
      cur = { id, inputs: null, detect: null };
      rules.push(cur);
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('- **Inputs:**')) cur.inputs = line;
    else if (line.startsWith('- **Detect:**')) cur.detect = line;
  }
  return rules;
}

// --- run ---------------------------------------------------------------------------------

let skillText, rulesText;
try { skillText = readFileSync(SKILL, 'utf8'); } catch { die(`cannot read ${SKILL} — run from the repo root`); }
try { rulesText = readFileSync(RULES, 'utf8'); } catch { die(`cannot read ${RULES} — run from the repo root`); }

const notStorable = parseNotLabelStorable(skillText);
const rules = parseRules(stripFences(rulesText));
if (rules.length === 0) die(`no "### DC-" rules found in ${RULES}`);

for (const r of rules) {
  r.props = r.inputs ? props(r.inputs) : [];
  r.labelRequired = r.props.some((p) => !notStorable.includes(p));
  r.labelNamed = r.inputs ? r.inputs.includes('image metadata label') : false;
}

// A property is "known" when the list attests it, or when some rule's Inputs names it.
const known = new Set(notStorable);
for (const r of rules) for (const p of r.props) known.add(p);

const yn = (b) => (b ? 'yes' : 'no');
let failed = 0;

for (const r of rules) {
  const reasons = [];
  if (!r.inputs) reasons.push('no Inputs line');
  else if (r.labelRequired !== r.labelNamed) {
    reasons.push(r.labelRequired
      ? 'reads a property absent from the not-label-storable list but does not name the image metadata label'
      : 'every property it reads is on the not-label-storable list, yet it names the image metadata label');
  }
  const ok = reasons.length === 0;
  if (!ok) failed++;

  console.log(
    `${r.id.padEnd(14)} props=[${r.props.join(', ')}]  ` +
    `label-required=${yn(r.labelRequired)}  label-named=${yn(r.labelNamed)}  ${ok ? 'OK' : 'FAIL'}`
  );
  for (const why of reasons) console.log(`${''.padEnd(14)} ${why}`);

  // Advisory only — see the header. Restricted to properties the corpus already knows about,
  // because unrestricted it reports every backticked word in the Detect prose.
  if (r.inputs && r.detect) {
    const missing = props(r.detect).filter((p) => !r.props.includes(p) && known.has(p));
    if (missing.length) {
      console.log(`${''.padEnd(14)} warning  in Detect but not Inputs (advisory): ${missing.join(', ')}`);
    }
  }
}

console.log(`${rules.length} rules checked`);
if (failed) {
  console.log(`${failed} FAILED`);
  process.exit(1);
}
process.exit(0);
