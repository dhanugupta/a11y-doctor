import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

export const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', '.output', '.angular',
  '.svelte-kit', 'coverage', '.turbo', '.cache', '.vercel', 'storybook-static', 'vendor',
  'Pods', '.gradle', '.idea', '.vscode', '.a11y-doctor', 'DerivedData', '.expo', 'tmp',
]);

export const SCANNABLE_EXT = new Set([
  '.jsx', '.tsx', '.js', '.ts', '.mjs', '.html', '.htm', '.vue', '.svelte',
  '.css', '.scss', '.sass', '.less', '.xml',
]);

const MAX_FILE_BYTES = 512 * 1024;

export function toPosix(p) {
  return p.split(sep).join('/');
}

export function isScannable(file) {
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
  if (!SCANNABLE_EXT.has(ext)) return false;
  if (/\.(test|spec|stories|story|d)\.[jt]sx?$/.test(file) || /\.min\.(js|css)$/.test(file)) return false;
  // Android XML: only layouts
  if (ext === '.xml') return /\/res\/layout[^/]*\//.test(toPosix(file));
  return true;
}

export function walk(root, start = root, out = []) {
  let entries;
  try { entries = readdirSync(start, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.storybook' && e.isDirectory()) continue;
    const full = join(start, e.name);
    if (e.isDirectory()) {
      if (IGNORED_DIRS.has(e.name)) continue;
      walk(root, full, out);
    } else if (e.isFile() && isScannable(full)) {
      try { if (statSync(full).size <= MAX_FILE_BYTES) out.push(toPosix(relative(root, full))); } catch { /* unreadable */ }
    }
  }
  return out;
}

export function readText(path) {
  try { return readFileSync(path, 'utf8'); } catch { return null; }
}

export function readJson(path) {
  const t = readText(path);
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return null; }
}

// Resolve a package the way the *project* would (its node_modules), not this skill.
export function resolveFromProject(root, request) {
  try {
    const req = createRequire(join(root, 'package.json'));
    return req.resolve(request);
  } catch {
    return null;
  }
}

export function packageVersion(root, name) {
  try {
    const req = createRequire(join(root, 'package.json'));
    const pkgPath = req.resolve(`${name}/package.json`);
    return readJson(pkgPath)?.version ?? null;
  } catch {
    // Some packages don't export package.json; walk up from the entry point.
    const entry = resolveFromProject(root, name);
    if (!entry) return null;
    let dir = dirname(entry);
    while (dir !== dirname(dir)) {
      const pkg = readJson(join(dir, 'package.json'));
      if (pkg?.name === name) return pkg.version;
      dir = dirname(dir);
    }
    return null;
  }
}

export function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function gitRoot(cwd) {
  return git(cwd, ['rev-parse', '--show-toplevel']);
}

export function findUp(start, names) {
  let dir = start;
  while (true) {
    for (const n of names) if (existsSync(join(dir, n))) return join(dir, n);
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
