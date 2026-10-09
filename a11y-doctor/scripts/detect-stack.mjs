#!/usr/bin/env node
// Detect the project's front-end stack and a11y tooling, and recommend which
// skill references to load. Usage: node detect-stack.mjs [projectRoot] [--json]

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readText, packageVersion, resolveFromProject, IGNORED_DIRS, toPosix } from './lib/project.mjs';

// Every package.json up to 3 levels deep (monorepo workspaces), with its directory.
function collectPackageJsons(root, dir = root, depth = 0, out = []) {
  const pkg = readJson(join(dir, 'package.json'));
  if (pkg) out.push({ dir: toPosix(relative(root, dir)), pkg });
  if (depth >= 3) return out;
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory() || IGNORED_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    collectPackageJsons(root, join(dir, e.name), depth + 1, out);
  }
  return out;
}

function packageKind(pkg) {
  const d = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  if ('react-native' in d || 'expo' in d) return 'react-native';
  if ('@angular/core' in d) return 'angular';
  if ('vue' in d || 'nuxt' in d) return 'vue';
  if ('next' in d) return 'next';
  if ('react' in d) return 'react';
  if ('svelte' in d) return 'svelte';
  return null;
}

function packageManager(root) {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return 'bun';
  return 'npm';
}

function hasFileMatching(root, re, depth = 0) {
  if (depth > 3) return false;
  let entries = [];
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return false; }
  for (const e of entries) {
    if (re.test(e.name)) return true;
    if (e.isDirectory() && !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.') && hasFileMatching(join(root, e.name), re, depth + 1)) return true;
  }
  return false;
}

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$|\.cy\.[jt]sx?$|_test\.dart$|Tests?\.(swift|kt)$/;

function collectFiles(root, re, depth = 0, out = []) {
  if (depth > 8 || out.length > 3000) return out;
  let entries = [];
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORED_DIRS.has(e.name) || (e.name.startsWith('.') && e.name !== '.github')) continue;
      collectFiles(join(root, e.name), re, depth + 1, out);
    } else if (re.test(e.name)) {
      out.push(join(root, e.name));
    }
  }
  return out;
}

// These rules assess whether the
// project *tests* accessibility, not the app itself.
function auditTestCoverage(root, { frameworks, testing, lint, has }) {
  const isUi = frameworks.react || frameworks.angular || frameworks.vue || frameworks.svelte || frameworks.reactNative;
  if (!isUi) return [];
  const gaps = [];
  const tests = collectFiles(root, TEST_FILE);
  const text = tests.slice(0, 1500).map((f) => readText(f) ?? '').join('\n');
  const count = (re) => (text.match(re) ?? []).length;

  const axeTests = count(/jest-axe|vitest-axe|@axe-core\/playwright|cypress-axe|AxeBuilder|axe\.run|checkA11y|toHaveNoViolations/g);
  if (!axeTests) gaps.push({ id: 'A11Y-TST-001', severity: 'critical', message: 'No automated accessibility tests (no axe in any test file).', fix: 'Add component and page axe tests: assets/test-templates/.' });
  if (!(lint.jsxA11y || lint.angularTemplate || lint.vueA11y || lint.reactNativeA11y)) gaps.push({ id: 'A11Y-TST-002', severity: 'serious', message: 'No accessibility lint plugin installed.', fix: 'Add the framework a11y ESLint plugin: assets/lint-configs/.' });
  const keyboardTests = count(/\.tab\(|keyboard\.press\(\s*['"](Tab|Enter|Escape|Space|Arrow\w+)|keyboard\(\s*['"]\{(Tab|Enter|Escape|Space|Arrow\w+)|sendKeys|KeyEvent|pressKey|fireEvent\.keyDown/g);
  if (tests.length && !keyboardTests) gaps.push({ id: 'A11Y-TST-003', severity: 'serious', message: 'No keyboard interaction tests (Tab/Enter/Escape/arrow keys) found.', fix: 'Test focus order, activation and focus return: see the keyboard test in jest-axe.test.tsx / playwright-axe.spec.ts.' });
  const byRole = count(/getByRole|findByRole|queryByRole|getByLabelText|getByRole\(|role=/g);
  const byTestId = count(/getByTestId|findByTestId|data-testid|data-cy/g);
  if (tests.length && byTestId > 0 && byRole === 0) gaps.push({ id: 'A11Y-TST-004', severity: 'moderate', message: `Tests query by test id (${byTestId}×) but never by role/label, so accessible names are never asserted.`, fix: 'Prefer getByRole(…, { name }) / getByLabelText; a failing query means assistive tech cannot find it either.' });
  const srPlan = collectFiles(root, /(screen[-_ ]?reader|sr-script|a11y[-_]?test|accessibility[-_]?test).*\.md$/i).length || has('@guidepup/guidepup') || has('@guidepup/playwright');
  if (!srPlan) gaps.push({ id: 'A11Y-TST-005', severity: 'moderate', message: 'No screen reader test plan or expected announcements documented.', fix: 'Run audit.mjs --url to generate .a11y-doctor/sr-script.md and keep a copy per key flow; consider Guidepup for critical flows.' });
  const workflows = collectFiles(join(root, '.github'), /\.ya?ml$/).map((f) => readText(f) ?? '').join('\n') + (readText(join(root, '.gitlab-ci.yml')) ?? '');
  if (!/a11y|axe|pa11y|accessib|lighthouse/i.test(workflows)) gaps.push({ id: 'A11Y-TST-006', severity: 'moderate', message: 'No accessibility check in CI.', fix: 'Add assets/ci/a11y-doctor.yml (PR gate on new serious issues).' });
  if (testing.storybook && !testing.storybookA11y) gaps.push({ id: 'A11Y-TST-007', severity: 'minor', message: 'Storybook without @storybook/addon-a11y.', fix: 'Add the addon and set parameters.a11y.test = "error".' });
  if (!existsSync(join(root, '.a11y-doctor', 'baseline.json'))) gaps.push({ id: 'A11Y-TST-008', severity: 'minor', message: 'No a11y-doctor baseline, so CI cannot tell new issues from legacy ones.', fix: 'Run audit.mjs --update-baseline and commit .a11y-doctor/baseline.json.' });
  return gaps;
}

export function detectStack(rootArg = process.cwd()) {
  const root = resolve(rootArg);
  const found = collectPackageJsons(root);
  const pkgs = found.map((f) => f.pkg);
  const deps = {};
  for (const p of pkgs) Object.assign(deps, p.dependencies, p.devDependencies, p.peerDependencies);
  // Per-package frameworks, so a monorepo with a web app and a React Native app
  // gets web rules for one and native rules for the other.
  const workspaces = found
    .map((f) => ({ dir: f.dir, name: f.pkg.name ?? (f.dir || '.'), kind: packageKind(f.pkg) }))
    .filter((w) => w.kind);
  const rnDirs = workspaces.filter((w) => w.kind === 'react-native').map((w) => w.dir);
  const hasWebReact = workspaces.some((w) => w.kind === 'react' || w.kind === 'next');
  const pm = packageManager(root);
  const isWorkspaceRoot = pm === 'pnpm' ? existsSync(join(root, 'pnpm-workspace.yaml')) : !!readJson(join(root, 'package.json'))?.workspaces;
  const has = (name) => name in deps;
  const hasPrefix = (prefix) => Object.keys(deps).some((d) => d.startsWith(prefix));

  const frameworks = {
    react: has('react'),
    next: has('next'),
    angular: has('@angular/core'),
    vue: has('vue'),
    nuxt: has('nuxt'),
    svelte: has('svelte'),
    reactNative: has('react-native'),
    expo: has('expo'),
  };
  const native = {
    flutter: /\bflutter\s*:/.test(readText(join(root, 'pubspec.yaml')) ?? ''),
    android: existsSync(join(root, 'android')) || hasFileMatching(root, /^AndroidManifest\.xml$/),
    ios: existsSync(join(root, 'ios')) || hasFileMatching(root, /\.(xcodeproj|xcworkspace)$|^Package\.swift$/),
  };
  const ui = {
    mui: hasPrefix('@mui/'),
    radix: hasPrefix('@radix-ui/'),
    reactAria: has('react-aria') || has('react-aria-components'),
    headlessui: hasPrefix('@headlessui/'),
    chakra: hasPrefix('@chakra-ui/'),
    shadcn: existsSync(join(root, 'components.json')),
    angularMaterial: has('@angular/material'),
    angularCdk: has('@angular/cdk'),
    primeng: has('primeng'),
    vuetify: has('vuetify'),
  };
  const testing = {
    jest: has('jest'),
    vitest: has('vitest'),
    karma: has('karma'),
    playwright: has('@playwright/test') || has('playwright'),
    cypress: has('cypress'),
    testingLibrary: hasPrefix('@testing-library/'),
    jestAxe: has('jest-axe') || has('vitest-axe'),
    axeCore: has('axe-core'),
    axePlaywright: has('@axe-core/playwright'),
    cypressAxe: has('cypress-axe'),
    storybook: hasPrefix('@storybook/') || has('storybook'),
    storybookA11y: has('@storybook/addon-a11y'),
  };
  const eslintVersion = packageVersion(root, 'eslint');
  const lint = {
    eslint: eslintVersion,
    flatConfig: ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts'].some((f) => existsSync(join(root, f))),
    jsxA11y: !!resolveFromProject(root, 'eslint-plugin-jsx-a11y'),
    angularTemplate: !!resolveFromProject(root, '@angular-eslint/eslint-plugin-template'),
    vueA11y: !!resolveFromProject(root, 'eslint-plugin-vuejs-accessibility'),
    reactNativeA11y: !!resolveFromProject(root, 'eslint-plugin-react-native-a11y'),
    typescriptParser: !!(resolveFromProject(root, '@typescript-eslint/parser') || resolveFromProject(root, 'typescript-eslint')),
  };

  const tools = {};
  for (const name of ['axe-core', '@axe-core/playwright', 'playwright', '@playwright/test', 'eslint', 'eslint-plugin-jsx-a11y',
    '@angular-eslint/eslint-plugin-template', 'eslint-plugin-vuejs-accessibility', 'eslint-plugin-react-native-a11y',
    'jest-axe', 'vitest-axe', 'cypress-axe', 'pa11y', '@guidepup/guidepup']) {
    const v = packageVersion(root, name);
    if (v) tools[name] = v;
  }

  const references = ['references/wcag22-checklist.md'];
  if (hasWebReact || (frameworks.react && !frameworks.reactNative)) references.push('references/react.md');
  if (frameworks.reactNative) references.push('references/native-react-native.md');
  if (frameworks.angular) references.push('references/angular.md');
  if (frameworks.vue) references.push('references/vue.md');
  if (native.ios && !frameworks.reactNative) references.push('references/native-ios.md');
  if (native.android && !frameworks.reactNative) references.push('references/native-android.md');
  if (native.flutter) references.push('references/native-flutter.md');

  const recommendations = [];
  const devInstall = (pkgsToAdd, workspace) => {
    const list = pkgsToAdd.join(' ');
    const target = workspace && workspace.dir ? workspace : null;
    if (pm === 'pnpm') return target ? `pnpm --filter ${target.name} add -D ${list}` : `pnpm add -D${isWorkspaceRoot ? ' -w' : ''} ${list}`;
    if (pm === 'yarn') return target ? `yarn workspace ${target.name} add -D ${list}` : `yarn add -D ${list}`;
    if (pm === 'bun') return `bun add -d ${list}`;
    return target ? `npm i -D ${list} -w ${target.dir}` : `npm i -D ${list}`;
  };
  const rnWorkspace = workspaces.find((w) => w.kind === 'react-native');
  if ((hasWebReact || (frameworks.react && !frameworks.reactNative)) && !lint.jsxA11y) recommendations.push(`Add lint rules: ${devInstall(['eslint-plugin-jsx-a11y'])} (see assets/lint-configs/react.eslint.config.mjs)`);
  if (frameworks.angular && !lint.angularTemplate) recommendations.push('Add lint rules: ng add @angular-eslint/schematics (then enable templateAccessibility, see assets/lint-configs/angular.eslint.config.mjs)');
  if (frameworks.vue && !lint.vueA11y) recommendations.push(`Add lint rules: ${devInstall(['eslint-plugin-vuejs-accessibility'])} (see assets/lint-configs/vue.eslint.config.mjs)`);
  if (frameworks.reactNative && !lint.reactNativeA11y && !(rnWorkspace && resolveFromProject(join(root, rnWorkspace.dir), 'eslint-plugin-react-native-a11y'))) {
    recommendations.push(`Add lint rules: ${devInstall(['eslint-plugin-react-native-a11y'], rnWorkspace)}`);
  }
  if (!testing.axePlaywright && !testing.jestAxe && !testing.cypressAxe && (frameworks.react || frameworks.angular || frameworks.vue)) {
    recommendations.push('Add automated regression tests with axe (see assets/test-templates/)');
  }
  if (testing.storybook && !testing.storybookA11y) recommendations.push(`Enable Storybook a11y panel: ${devInstall(['@storybook/addon-a11y'])}`);
  if (!testing.axePlaywright) recommendations.push(`Runtime scan (axe-scan.mjs) needs: ${devInstall(['@axe-core/playwright', ...(testing.playwright ? [] : ['playwright'])])} && ${pm === 'npm' ? 'npx' : `${pm} exec`} playwright install chromium`);

  const testingGaps = auditTestCoverage(root, { frameworks, testing, lint, has });

  return { root, packageManager: pm, workspaces, rnDirs, frameworks, native, ui, testing, lint, tools, references, recommendations, testingGaps };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const root = args.find((a) => !a.startsWith('--')) ?? process.cwd();
  const stack = detectStack(root);
  if (args.includes('--json')) {
    console.log(JSON.stringify(stack, null, 2));
  } else {
    const on = (o) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => (v === true ? k : `${k}@${v}`)).join(', ') || '—';
    console.log(`Project:     ${stack.root}`);
    console.log(`Frameworks:  ${on(stack.frameworks)}`);
    if (stack.workspaces.length > 1) {
      console.log(`Workspaces:  ${stack.workspaces.map((w) => `${w.dir || '.'} (${w.kind})`).join(', ')}`);
    }
    console.log(`Native:      ${on(stack.native)}`);
    console.log(`UI libs:     ${on(stack.ui)}`);
    console.log(`Testing:     ${on(stack.testing)}`);
    console.log(`Lint:        ${on(stack.lint)}`);
    console.log('\nLoad these references:');
    for (const r of stack.references) console.log(`  - ${r}`);
    if (Object.keys(stack.tools).length) {
      console.log(`Tool versions: ${Object.entries(stack.tools).map(([k, v]) => `${k}@${v}`).join(', ')}`);
    }
    if (stack.testingGaps.length) {
      console.log('\nTesting coverage gaps:');
      for (const g of stack.testingGaps) console.log(`  ${g.id} [${g.severity}] ${g.message}\n      → ${g.fix}`);
    }
    if (stack.recommendations.length) {
      console.log('\nTooling recommendations (ask before installing):');
      for (const r of stack.recommendations) console.log(`  - ${r}`);
    }
  }
}
