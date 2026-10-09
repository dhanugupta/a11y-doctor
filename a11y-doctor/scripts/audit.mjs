#!/usr/bin/env node
// a11y-doctor audit: one command for the Audit → Prioritize → Fix → Verify loop.
// Run it, fix findings, run it again — it reports what was fixed, what's new and
// what remains. See `node audit.mjs --help`.

import { mkdirSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStack } from './detect-stack.mjs';
import { staticScan } from './static-scan.mjs';
import { runtimeScan } from './axe-scan.mjs';
import { changedFiles, expandPaths } from './lib/scope.mjs';
import { walk, readJson, gitRoot } from './lib/project.mjs';
import {
  dedupe, assignFingerprints, sortFindings, countBySeverity, atLeast, SEVERITIES,
} from './lib/findings.mjs';
import { manualCriteria } from './lib/wcag.mjs';
import { renderMarkdown, renderSummary } from './lib/report.mjs';
import { renderSrScript } from './lib/sr-preview.mjs';

const HELP = `Usage: node audit.mjs [paths...] [options]

Scope (default: whole project)
  paths...               files or directories to audit (e.g. src/components/Button)
  --changed              only files changed vs the base branch (+ uncommitted/untracked)
  --base <ref>           base for --changed (default: origin/main, main, origin/master, …)
  --root <dir>           project root (default: current directory)

Runtime (needs playwright + @axe-core/playwright in the project)
  --url <url>            scan a running page with axe + keyboard walk (repeatable)
  --storybook <url>      scan every story of a running Storybook
  --no-keyboard          skip the automated Tab walk
  --max-pages <n>        cap runtime pages (default 50)

Static
  --no-eslint            heuristics only (skip the project's ESLint a11y plugins)

Baseline / CI
  --baseline <file>      known-issues file (default .a11y-doctor/baseline.json, if present)
  --no-baseline          ignore the baseline
  --update-baseline      record current findings as known issues
  --fail-on <severity>   exit 1 if open findings at/above: critical|serious|moderate|minor

Output
  --out <dir>            report directory (default .a11y-doctor)
  --json                 print the JSON report to stdout
  --top <n>              rules shown in the console summary (default 15)
  --rule <id>            console: list every location of one rule (e.g. axe/image-alt)
  --list-files           print the files in scope and exit
`;

function parseArgs(argv) {
  const opts = { paths: [], urls: [], eslint: true, keyboard: true, baseline: undefined, top: 15, maxPages: 50 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v == null) throw new Error(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case '-h': case '--help': opts.help = true; break;
      case '--changed': opts.changed = true; break;
      case '--base': opts.base = next(); break;
      case '--root': opts.root = next(); break;
      case '--url': opts.urls.push(next()); break;
      case '--storybook': opts.storybook = next(); break;
      case '--no-keyboard': opts.keyboard = false; break;
      case '--max-pages': opts.maxPages = Number(next()); break;
      case '--no-eslint': opts.eslint = false; break;
      case '--baseline': opts.baseline = next(); break;
      case '--no-baseline': opts.baseline = false; break;
      case '--update-baseline': opts.updateBaseline = true; break;
      case '--fail-on': opts.failOn = next(); break;
      case '--out': opts.out = next(); break;
      case '--json': opts.json = true; break;
      case '--top': opts.top = Number(next()); break;
      case '--rule': opts.rule = next(); break;
      case '--list-files': opts.listFiles = true; break;
      default:
        if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
        opts.paths.push(a);
    }
  }
  if (opts.failOn && opts.failOn !== 'none' && !SEVERITIES.includes(opts.failOn)) {
    throw new Error(`--fail-on must be one of ${SEVERITIES.join(', ')}, none`);
  }
  return opts;
}

export async function audit(opts) {
  const root = resolve(opts.root ?? process.cwd());
  const outDir = opts.out ? (isAbsolute(opts.out) ? opts.out : join(root, opts.out)) : join(root, '.a11y-doctor');
  const stack = detectStack(root);
  const notes = [];

  // 1. Scope
  let files;
  let mode = 'project';
  let base = null;
  if (opts.changed) {
    const changed = changedFiles(root, opts.base);
    base = changed.base;
    files = changed.files;
    mode = 'changed';
    if (opts.paths.length) {
      const within = new Set(expandPaths(root, opts.paths));
      files = files.filter((f) => within.has(f));
    }
    if (!gitRoot(root)) notes.push('Not a git repository — --changed found nothing.');
  } else if (opts.paths.length) {
    files = expandPaths(root, opts.paths);
    mode = 'paths';
  } else {
    files = walk(root);
  }
  if (opts.listFiles) return { files };

  // 2. Scan
  const stat = await staticScan(root, files, stack, { eslint: opts.eslint });
  notes.push(...stat.notes);
  let findings = stat.findings;
  let needsReview = [];
  let tabOrders = {};
  let srPreviews = {};
  if (opts.urls.length || opts.storybook) {
    const rt = await runtimeScan(root, { urls: opts.urls, storybook: opts.storybook, keyboard: opts.keyboard, maxPages: opts.maxPages });
    findings.push(...rt.findings);
    needsReview = rt.needsReview;
    tabOrders = rt.tabOrders;
    srPreviews = rt.srPreviews ?? {};
    notes.push(...rt.notes);
  }
  findings = sortFindings(assignFingerprints(dedupe(findings)));

  // 3. Baseline
  const baselineFile = opts.baseline === false ? null : resolve(root, opts.baseline ?? '.a11y-doctor/baseline.json');
  let baselined = 0;
  if (opts.updateBaseline && baselineFile) {
    const partial = mode !== 'project';
    const prev = partial ? readJson(baselineFile)?.findings ?? [] : [];
    const scanned = new Set(files);
    const kept = prev.filter((b) => !scanned.has(b.file));
    const entries = [...kept, ...findings.map((f) => ({ fingerprint: f.fingerprint, rule: f.rule, file: f.file, line: f.line, severity: f.severity }))];
    mkdirSync(resolve(baselineFile, '..'), { recursive: true });
    writeFileSync(baselineFile, `${JSON.stringify({ version: 1, updated: new Date().toISOString(), findings: entries }, null, 2)}\n`);
    notes.push(`Baseline updated: ${entries.length} known issue(s) in ${baselineFile.slice(root.length + 1)}.`);
  }
  if (baselineFile && existsSync(baselineFile)) {
    const known = new Set((readJson(baselineFile)?.findings ?? []).map((b) => b.fingerprint));
    const before = findings.length;
    findings = findings.filter((f) => !known.has(f.fingerprint));
    baselined = before - findings.length;
  }

  // 4. Delta vs previous run (the fix loop)
  const reportJson = join(outDir, 'report.json');
  const prev = readJson(reportJson);
  let delta = null;
  if (prev?.findings) {
    const inScope = new Set([...files, ...opts.urls]);
    const prevInScope = prev.findings.filter((f) => inScope.has(f.file) || (f.file ?? '').startsWith('story:'));
    const now = new Set(findings.map((f) => f.fingerprint));
    const before = new Set(prevInScope.map((f) => f.fingerprint));
    const fixed = prevInScope.filter((f) => !now.has(f.fingerprint));
    const added = findings.filter((f) => !before.has(f.fingerprint));
    delta = {
      fixed: fixed.length,
      new: added.length,
      remaining: findings.length - added.length,
      fixedBySeverity: countBySeverity(fixed),
      newBySeverity: countBySeverity(added),
    };
  }

  const report = {
    tool: 'a11y-doctor',
    version: 1,
    generatedAt: new Date().toISOString(),
    root,
    scope: { mode, base, files: files.length, urls: opts.urls.length + (opts.storybook ? 1 : 0) || undefined },
    stack: { frameworks: stack.frameworks, native: stack.native, lint: stack.lint, tools: stack.tools, references: stack.references },
    testingGaps: stack.testingGaps,
    counts: countBySeverity(findings),
    baselined,
    baselineFile: baselineFile && existsSync(baselineFile) ? baselineFile.slice(root.length + 1) : undefined,
    delta,
    findings,
    needsReview,
    tabOrders,
    srPreviews,
    manualChecks: manualCriteria(),
    notes,
  };

  mkdirSync(outDir, { recursive: true });
  if (existsSync(reportJson)) renameSync(reportJson, join(outDir, 'report.prev.json'));
  writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(outDir, 'report.md'), renderMarkdown(report));
  if (Object.keys(srPreviews).length) writeFileSync(join(outDir, 'sr-script.md'), renderSrScript(srPreviews));
  report.outDir = outDir;
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    console.error(HELP);
    process.exit(2);
  }
  if (opts.help) {
    console.log(HELP);
    process.exit(0);
  }
  try {
    const report = await audit(opts);
    if (opts.listFiles) {
      console.log(report.files.join('\n'));
      process.exit(0);
    }
    if (opts.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(renderSummary(report, { top: opts.top, rule: opts.rule }));
      console.log(`\nReport: ${join(report.outDir, 'report.md')}`);
    }
    const failing = opts.failOn && opts.failOn !== 'none' ? report.findings.filter((f) => atLeast(f.severity, opts.failOn)) : [];
    if (failing.length) {
      console.error(`\n✖ ${failing.length} finding(s) at or above "${opts.failOn}".`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`a11y-doctor failed: ${err.stack ?? err.message}`);
    process.exit(2);
  }
}
