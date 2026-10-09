#!/usr/bin/env node
// Install the a11y-doctor skill into a project (or globally) for Claude Code,
// Cursor and GitHub Copilot.
//
//   node install.mjs <project-dir> [--with-rules] [--with-ci] [--link] [--force]
//   node install.mjs --global [--link]
//
// `.claude/skills/` is read by Claude Code, Cursor and GitHub Copilot (VS Code,
// CLI and cloud agent), so a single install covers all three.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, appendFileSync, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skillSrc = join(here, 'a11y-doctor');

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
if (flag('--help') || flag('-h')) {
  console.log(`Usage:
  node install.mjs <project-dir> [options]   install into <project-dir>/.claude/skills/a11y-doctor
  node install.mjs --global [--link]         install into ~/.claude/skills/a11y-doctor (all your projects)

Options:
  --with-rules   also add always-on rules: .cursor/rules/a11y.mdc and .github/instructions/a11y.instructions.md
  --with-ci      also add .github/workflows/a11y-doctor.yml (PR gate on new serious issues)
  --link         symlink instead of copy (for developing the skill)
  --force        overwrite existing rules/CI files`);
  process.exit(0);
}

const global = flag('--global');
const target = global ? homedir() : resolve(args.find((a) => !a.startsWith('--')) ?? process.cwd());
if (!existsSync(target)) {
  console.error(`Target directory does not exist: ${target}`);
  process.exit(1);
}

const dest = join(target, '.claude', 'skills', 'a11y-doctor');
mkdirSync(dirname(dest), { recursive: true });
if (existsSync(dest) || isSymlink(dest)) rmSync(dest, { recursive: true, force: true });
if (flag('--link')) {
  symlinkSync(skillSrc, dest, process.platform === 'win32' ? 'junction' : 'dir');
  console.log(`✔ Linked  ${dest} → ${skillSrc}`);
} else {
  cpSync(skillSrc, dest, { recursive: true });
  console.log(`✔ Copied  skill → ${dest}`);
}

if (!global) {
  const copyAsset = (from, to, transform = (t) => t) => {
    const out = join(target, to);
    if (existsSync(out) && !flag('--force')) {
      console.log(`• Skipped ${to} (exists — use --force to overwrite)`);
      return;
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, transform(readFileSync(join(skillSrc, 'assets', from), 'utf8')));
    console.log(`✔ Added   ${to}`);
  };
  // Match the CI workflow to the project's package manager
  const forPackageManager = (yml) => {
    if (existsSync(join(target, 'pnpm-lock.yaml'))) {
      return yml
        .replace('      - uses: actions/setup-node@v5', '      - uses: pnpm/action-setup@v4\n\n      - uses: actions/setup-node@v5')
        .replace('cache: npm', 'cache: pnpm')
        .replace('- run: npm ci', '- run: pnpm install --frozen-lockfile');
    }
    if (existsSync(join(target, 'yarn.lock'))) {
      return yml.replace('cache: npm', 'cache: yarn').replace('- run: npm ci', '- run: yarn install --frozen-lockfile');
    }
    return yml;
  };
  if (flag('--with-rules')) {
    copyAsset('agent-rules/cursor-a11y.mdc', '.cursor/rules/a11y.mdc');
    copyAsset('agent-rules/copilot-a11y.instructions.md', '.github/instructions/a11y.instructions.md');
  }
  if (flag('--with-ci')) copyAsset('ci/a11y-doctor.yml', '.github/workflows/a11y-doctor.yml', forPackageManager);

  const gitignore = join(target, '.gitignore');
  const line = '.a11y-doctor/report*';
  const current = existsSync(gitignore) ? readFileSync(gitignore, 'utf8') : '';
  if (!current.split('\n').includes(line)) {
    appendFileSync(gitignore, `${current && !current.endsWith('\n') ? '\n' : ''}# a11y-doctor reports (keep baseline.json committed)\n${line}\n`);
    console.log('✔ Updated .gitignore');
  }
}

const scripts = global ? '~/.claude/skills/a11y-doctor/scripts' : '.claude/skills/a11y-doctor/scripts';
console.log(`
Ready for Claude Code, Cursor and GitHub Copilot.
  Ask your agent:  "audit the accessibility of src/components/Checkout"   (or /a11y-doctor)
  Or run from the project root:  node ${scripts}/audit.mjs --changed`);

function isSymlink(p) {
  try { return lstatSync(p).isSymbolicLink(); } catch { return false; }
}
