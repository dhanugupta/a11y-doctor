#!/usr/bin/env node
// Package the skill as dist/a11y-doctor.zip (the zip contains the a11y-doctor/
// folder). Upload it in claude.ai → Settings → Capabilities → Skills, or attach
// it to a GitHub release for manual installs.
//
//   node tools/package-skill.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'a11y-doctor.zip');

// Never ship a skill that fails the spec check
execFileSync(process.execPath, [join(root, 'tools', 'validate-skill.mjs'), join(root, 'a11y-doctor')], { stdio: 'inherit' });

mkdirSync(dirname(out), { recursive: true });
if (existsSync(out)) rmSync(out);
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${join(root, 'a11y-doctor')}' -DestinationPath '${out}'`], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', '-X', '-q', out, 'a11y-doctor', '-x', '*.DS_Store'], { cwd: root, stdio: 'inherit' });
}
console.log(`✔ Packaged ${out} (${Math.round(statSync(out).size / 1024)} KB)`);
