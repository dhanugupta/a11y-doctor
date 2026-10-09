import { statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { git, walk, isScannable, toPosix } from './project.mjs';

const DEFAULT_BASES = ['origin/main', 'main', 'origin/master', 'master', 'origin/develop', 'develop'];

export function defaultBase(root) {
  for (const b of DEFAULT_BASES) {
    if (git(root, ['rev-parse', '--verify', '--quiet', `${b}^{commit}`])) return b;
  }
  return null;
}

/**
 * Files changed on this branch vs `base` (committed, staged, unstaged and
 * untracked), relative to root and filtered to scannable UI files.
 */
export function changedFiles(root, base) {
  const out = new Set();
  const add = (txt) => (txt ?? '').split('\n').map((s) => s.trim()).filter(Boolean).forEach((f) => out.add(f));
  const hasHead = !!git(root, ['rev-parse', '--verify', '--quiet', 'HEAD']);
  const ref = base ?? defaultBase(root);
  if (hasHead && ref) {
    const mergeBase = git(root, ['merge-base', ref, 'HEAD']) ?? ref;
    add(git(root, ['diff', '--name-only', '--relative', '--diff-filter=ACMR', mergeBase]));
  } else if (hasHead) {
    add(git(root, ['diff', '--name-only', '--relative', '--diff-filter=ACMR', 'HEAD']));
  }
  add(git(root, ['diff', '--name-only', '--relative', '--diff-filter=ACMR', '--cached']));
  add(git(root, ['ls-files', '--others', '--exclude-standard']));
  return { base: hasHead ? ref : null, files: [...out].filter((f) => isScannable(f) && exists(join(root, f))).sort() };
}

function exists(p) {
  try { return statSync(p).isFile(); } catch { return false; }
}

// Expand user-supplied paths (files or directories) to scannable files.
export function expandPaths(root, paths) {
  const out = new Set();
  for (const p of paths) {
    const abs = resolve(root, p);
    let st;
    try { st = statSync(abs); } catch { continue; }
    if (st.isDirectory()) walk(root, abs).forEach((f) => out.add(f));
    else if (isScannable(abs)) out.add(toPosix(relative(root, abs)));
  }
  return [...out].sort();
}
