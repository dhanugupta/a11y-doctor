#!/usr/bin/env node
// Measures the static engine against fixture apps. Fixtures mark each seeded
// violation with an `expect: <rule> [rule…]` comment on the line above it; any
// finding without a marker is a false positive.
//
//   node evals/run-evals.mjs [--verbose]

import { readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { audit } from '../a11y-doctor/scripts/audit.mjs';
import { walk } from '../a11y-doctor/scripts/lib/project.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, 'fixtures');
const verbose = process.argv.includes('--verbose');

function expectedFor(root, files) {
  const expected = new Set();
  for (const file of files) {
    const lines = readFileSync(join(root, file), 'utf8').split('\n');
    lines.forEach((text, i) => {
      const m = /expect:\s*([\w\s-]+?)\s*(?:\*\/|-->|$)/.exec(text);
      if (!m) return;
      let target = i + 1;
      while (target < lines.length && (/^\s*$/.test(lines[target]) || /expect:/.test(lines[target]))) target++;
      for (const rule of m[1].trim().split(/\s+/)) expected.add(`${file}:${target + 1}:${rule}`);
    });
  }
  return expected;
}

let totalExpected = 0;
let totalHit = 0;
let totalFp = 0;
const out = mkdtempSync(join(tmpdir(), 'a11y-doctor-evals-'));

try {
  for (const name of readdirSync(fixturesDir).sort()) {
    const root = join(fixturesDir, name);
    const report = await audit({ root, paths: [], urls: [], eslint: false, keyboard: false, baseline: false, out: join(out, name) });
    const files = [...new Set([...report.findings.map((f) => f.file), ...walk(root)])];
    const expected = expectedFor(root, files);
    const actual = new Set(report.findings.map((f) => `${f.file}:${f.line}:${f.rule.replace(/^heuristic\//, '')}`));
    const missed = [...expected].filter((e) => !actual.has(e));
    const fps = [...actual].filter((a) => !expected.has(a));
    totalExpected += expected.size;
    totalHit += expected.size - missed.length;
    totalFp += fps.length;
    console.log(`${missed.length || fps.length ? '✖' : '✔'} ${name.padEnd(18)} expected ${String(expected.size).padStart(2)}  found ${String(expected.size - missed.length).padStart(2)}  false+ ${fps.length}`);
    if (missed.length || verbose) missed.forEach((m) => console.log(`    missed   ${m}`));
    if (fps.length || verbose) fps.forEach((f) => console.log(`    false+   ${f}`));
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

const recall = totalExpected ? (100 * totalHit) / totalExpected : 100;
console.log(`\nrecall ${recall.toFixed(1)}% (${totalHit}/${totalExpected}), false positives ${totalFp}`);
process.exit(totalHit === totalExpected && totalFp === 0 ? 0 : 1);

