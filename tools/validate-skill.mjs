#!/usr/bin/env node
// Validate a skill against the Agent Skills spec (agentskills.io/specification),
// restricted to the portable frontmatter fields so it loads in Claude Code,
// Cursor and GitHub Copilot alike. Also checks that referenced files exist.
//
//   node tools/validate-skill.mjs a11y-doctor

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? 'a11y-doctor');
const errors = [];
const warnings = [];

const skillPath = join(dir, 'SKILL.md');
if (!existsSync(skillPath)) {
  console.error(`✖ ${skillPath} not found`);
  process.exit(1);
}
const text = readFileSync(skillPath, 'utf8');
const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
if (!fm) errors.push('SKILL.md must start with YAML frontmatter delimited by ---');

// Minimal YAML reader for top-level scalars and one nested map (metadata)
const meta = {};
let current = null;
for (const line of (fm?.[1] ?? '').split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  const top = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
  if (top) {
    current = top[1];
    const raw = top[2].trim();
    if (raw && !/^["'|>]/.test(raw) && (/:\s/.test(raw) || /\s#/.test(raw) || /^[*&!%@`]/.test(raw))) {
      errors.push(`"${current}" contains YAML-special characters (": ", " #", or a leading */&/!): quote the value`);
    }
    meta[current] = top[2] === '' ? {} : unquote(top[2]);
    continue;
  }
  const nested = /^\s+([\w-]+):\s*(.*)$/.exec(line);
  if (nested && current && typeof meta[current] === 'object') meta[current][nested[1]] = unquote(nested[2]);
  else errors.push(`Unsupported frontmatter line: "${line}"`);
}

const PORTABLE = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
for (const key of Object.keys(meta)) {
  if (!PORTABLE.has(key)) errors.push(`Frontmatter key "${key}" is not in the Agent Skills spec — it breaks portability (claude.ai upload rejects it).`);
}

const name = meta.name;
if (!name) errors.push('name is required');
else {
  if (name.length > 64) errors.push('name must be ≤ 64 characters');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errors.push('name must be lowercase letters, digits and single hyphens, not starting/ending with a hyphen');
  if (name !== basename(dir)) errors.push(`name "${name}" must match the directory name "${basename(dir)}"`);
}

const desc = meta.description;
if (!desc) errors.push('description is required');
else if (desc.length > 1024) errors.push(`description is ${desc.length} chars (max 1024)`);
else if (desc.length < 100) warnings.push('description is short — include what the skill does and when to use it, with trigger keywords');

if (meta.compatibility && meta.compatibility.length > 500) errors.push(`compatibility is ${meta.compatibility.length} chars (max 500)`);
if (meta.metadata && typeof meta.metadata !== 'object') errors.push('metadata must be a map of string keys to string values');

const lines = text.split('\n').length;
if (lines > 500) errors.push(`SKILL.md has ${lines} lines (keep under 500; move detail to references/)`);
const approxTokens = Math.round(text.length / 4);
if (approxTokens > 5000) warnings.push(`SKILL.md is ~${approxTokens} tokens (recommended < 5000)`);

// Referenced files must exist; reference files should be linked from SKILL.md
const referenced = new Set([...text.matchAll(/`((?:references|assets|scripts)\/[\w./-]+)`/g)].map((m) => m[1]));
for (const ref of referenced) {
  if (!existsSync(join(dir, ref))) errors.push(`SKILL.md references missing file: ${ref}`);
}
const refDir = join(dir, 'references');
if (existsSync(refDir)) {
  for (const f of readdirSync(refDir)) {
    if (!text.includes(`references/${f}`)) warnings.push(`references/${f} is not linked from SKILL.md (agents won't know to load it)`);
  }
}
// Nested reference chains (spec: keep references one level deep)
for (const ref of referenced) {
  if (ref.startsWith('references/') && ref.split('/').length > 2) warnings.push(`${ref} is nested more than one level deep`);
}

for (const w of warnings) console.log(`⚠ ${w}`);
for (const e of errors) console.log(`✖ ${e}`);
if (errors.length) process.exit(1);
const tok = (chars) => Math.round(chars / 4);
const idleTokens = tok(`${name}: ${desc}`.length);
const bodyTokens = tok(text.length - (fm?.[0].length ?? 0));
let refChars = 0;
if (existsSync(refDir)) for (const f of readdirSync(refDir)) refChars += readFileSync(join(refDir, f), 'utf8').length;
console.log(`✔ ${basename(dir)} is a valid, portable Agent Skill (${lines} lines, description ${desc.length}/1024 chars, ${referenced.size} referenced files)`);
console.log(`  Context cost (≈4 chars/token): idle ≈${idleTokens} tokens (name + description, every session) · SKILL.md body ≈${bodyTokens} · all references ≈${tok(refChars)} (loaded selectively)`);

function unquote(v) {
  const s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}
