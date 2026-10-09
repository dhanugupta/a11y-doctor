#!/usr/bin/env node
// Install the a11y-doctor skill into a project (or globally) for Claude Code,
// Cursor and GitHub Copilot.
//
//   node install.mjs <project-dir> [--with-rules] [--with-ci] [--link] [--force]
//   node install.mjs --global [--link]
//
// `.claude/skills/` is read by Claude Code, Cursor and GitHub Copilot (VS Code,
// CLI and cloud agent), so a single install covers all three. OpenAI Codex reads
// `.agents/skills/` instead: use `--target agents` (or `both`).

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, appendFileSync, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skillSrc = join(here, 'a11y-doctor');

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const valueOf = (f) => {
  const eq = args.find((a) => a.startsWith(`${f}=`));
  if (eq) return eq.slice(f.length + 1);
  const i = args.indexOf(f);
  return i !== -1 ? args[i + 1] : undefined;
};
const VALUE_FLAGS = new Set(['--target']);
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.has(args[i - 1]));
if (flag('--help') || flag('-h')) {
  console.log(`Usage:
  node install.mjs <project-dir> [options]   install into <project-dir>/.claude/skills/a11y-doctor
  node install.mjs --global [--link]         install into ~/.claude/skills/a11y-doctor (all your projects)

Options:
  --with-rules   also add always-on rules: .cursor/rules/a11y.mdc and .github/instructions/a11y.instructions.md
  --with-ci      also add .github/workflows/a11y-doctor.yml (PR gate on new serious issues)
  --target <t>   where to install the skill:
                   claude (default)  .claude/skills  → Claude Code, Cursor, GitHub Copilot
                   agents            .agents/skills  → OpenAI Codex, Cursor, GitHub Copilot
                   both              both folders (Cursor/Copilot may then list the skill twice)
  --link         symlink instead of copy (for developing the skill)
  --force        overwrite existing rules/CI files`);
  process.exit(0);
}

const global = flag('--global');
const target = global ? homedir() : resolve(positional[0] ?? process.cwd());
if (!existsSync(target)) {
  console.error(`Target directory does not exist: ${target}`);
  process.exit(1);
}
const targetKind = valueOf('--target') ?? 'claude';
if (!['claude', 'agents', 'both'].includes(targetKind)) {
  console.error(`--target must be claude, agents or both (got "${targetKind}")`);
  process.exit(1);
}
const skillRoots = { claude: ['.claude'], agents: ['.agents'], both: ['.claude', '.agents'] }[targetKind];
const dests = skillRoots.map((r) => join(target, r, 'skills', 'a11y-doctor'));

for (const dest of dests) {
  mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest) || isSymlink(dest)) rmSync(dest, { recursive: true, force: true });
  if (flag('--link')) {
    symlinkSync(skillSrc, dest, process.platform === 'win32' ? 'junction' : 'dir');
    console.log(`✔ Linked  ${dest} → ${skillSrc}`);
  } else {
    cpSync(skillSrc, dest, { recursive: true });
    console.log(`✔ Copied  skill → ${dest}`);
  }
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

const firstRoot = skillRoots[0];
const scripts = global ? `~/${firstRoot}/skills/a11y-doctor/scripts` : `${firstRoot}/skills/a11y-doctor/scripts`;
const agentsFor = { claude: 'Claude Code, Cursor and GitHub Copilot', agents: 'OpenAI Codex, Cursor and GitHub Copilot', both: 'Claude Code, OpenAI Codex, Cursor and GitHub Copilot' }[targetKind];
console.log(`
Ready for ${agentsFor}.
  Ask your agent:  "audit the accessibility of src/components/Checkout"   (or /a11y-doctor)
  Or run from the project root:  node ${scripts}/audit.mjs --changed`);

function isSymlink(p) {
  try { return lstatSync(p).isSymbolicLink(); } catch { return false; }
}
