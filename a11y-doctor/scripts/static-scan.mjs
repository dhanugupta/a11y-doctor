// Static scan: zero-dependency heuristics on every file, plus the project's own
// ESLint a11y plugins when they're installed (jsx-a11y, @angular-eslint/template,
// vuejs-accessibility, react-native-a11y). The project's ESLint config is NOT
// used — we build a config with only a11y rules so results are consistent.

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readText, resolveFromProject, packageVersion } from './lib/project.mjs';
import { scanSource } from './lib/heuristics.mjs';
import { makeFinding, canonicalRule } from './lib/findings.mjs';
import { classifyLintRule, ANGULAR_A11Y_RULES } from './lib/rules-map.mjs';

// In a monorepo, files under a React Native workspace get native rules and the
// rest get web rules.
export function rnFileMatcher(stack) {
  const dirs = stack.rnDirs ?? (stack.frameworks?.reactNative ? [''] : []);
  return (file) => dirs.some((d) => d === '' || file === d || file.startsWith(`${d}/`));
}

export async function staticScan(root, files, stack, { eslint = true } = {}) {
  const findings = [];
  const notes = [];
  const isRn = rnFileMatcher(stack);
  const suppressions = [];

  for (const file of files) {
    const source = readText(join(root, file));
    if (source == null) continue;
    try {
      const result = scanSource(file, source, { reactNative: isRn(file) });
      findings.push(...result);
      suppressions.push(...(result.suppressions ?? []));
    } catch (err) {
      notes.push(`Heuristics failed on ${file}: ${err.message}`);
    }
  }

  if (eslint) {
    try {
      const lint = await runEslint(root, files, stack, notes);
      const key = (file, line, canon) => `${file}:${line}:${canon}`;
      const suppressed = new Set(suppressions.flatMap((s) => s.rules.map((r) => key(s.file, s.line, r))));
      let dropped = 0;
      for (const f of lint) {
        if (suppressed.has(key(f.file, f.line, canonicalRule(f.rule)))) { dropped++; continue; }
        findings.push(f);
      }
      if (dropped) notes.push(`${dropped} lint finding(s) suppressed as known false positives (stopPropagation-only handlers, modal backdrops, content passed via {...props}).`);
    } catch (err) {
      notes.push(`ESLint a11y pass failed: ${firstLine(err)} — heuristics only.`);
    }
  }
  return { findings, notes };
}

async function loadFromProject(root, name) {
  const p = resolveFromProject(root, name);
  if (!p) return null;
  const m = await import(pathToFileURL(p).href);
  return m.default ?? m;
}

function rulesFrom(plugin, ...configNames) {
  for (const name of configNames) {
    const c = plugin.flatConfigs?.[name] ?? plugin.configs?.[name];
    if (!c) continue;
    if (Array.isArray(c)) {
      const merged = {};
      for (const part of c) Object.assign(merged, part.rules);
      if (Object.keys(merged).length) return merged;
    } else if (c.rules) {
      return c.rules;
    }
  }
  return null;
}

async function runEslint(root, files, stack, notes) {
  const eslintEntry = resolveFromProject(root, 'eslint');
  if (!eslintEntry) {
    notes.push('ESLint not installed in the project — static results come from built-in heuristics only.');
    return [];
  }
  const api = await import(pathToFileURL(eslintEntry).href);
  const mod = api.loadESLint ? api : (api.default ?? api);
  let ESLintClass;
  if (mod.loadESLint) ESLintClass = await mod.loadESLint({ useFlatConfig: true });
  else if (Number((packageVersion(root, 'eslint') ?? '0').split('.')[0]) >= 9) ESLintClass = mod.ESLint;
  if (!ESLintClass) {
    notes.push('ESLint < 8.57 detected — skipping lint pass (heuristics only).');
    return [];
  }

  let tsParser = null;
  try {
    tsParser = (await loadFromProject(root, '@typescript-eslint/parser'))
      ?? (await loadFromProject(root, 'typescript-eslint'))?.parser
      ?? null;
  } catch (err) {
    notes.push(`TypeScript ESLint parser failed to load (${firstLine(err)}) — .ts/.tsx files checked by heuristics only.`);
  }

  // Each plugin runs in its own ESLint instance so one broken parser/plugin
  // can't take the others down.
  const groups = [];
  const fw = stack.frameworks ?? {};
  const isRn = rnFileMatcher(stack);
  const hasWebReact = (stack.workspaces ?? []).some((w) => w.kind === 'react' || w.kind === 'next') || ((fw.react || fw.next) && !fw.reactNative);
  const jsxLike = files.filter((f) => /\.(jsx|tsx|js|mjs|ts)$/.test(f) && !/\.component\.ts$/.test(f));
  const jsxParseable = jsxLike.filter((f) => tsParser || !/\.tsx?$/.test(f));
  if (!tsParser && jsxLike.length > jsxParseable.length) notes.push('No usable TypeScript ESLint parser — .ts/.tsx files checked by heuristics only.');
  const jsxLanguage = {
    ...(tsParser ? { parser: tsParser } : {}),
    parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 'latest', sourceType: 'module' },
  };

  const tryLoad = async (name) => {
    try {
      return await loadFromProject(root, name);
    } catch (err) {
      notes.push(`${name} failed to load (${firstLine(err)}).`);
      return null;
    }
  };

  if (hasWebReact) {
    const plugin = await tryLoad('eslint-plugin-jsx-a11y');
    const rules = plugin && rulesFrom(plugin, 'recommended');
    if (rules) {
      groups.push({ label: 'jsx-a11y', files: jsxParseable.filter((f) => !isRn(f)), rules, configs: [{ files: ['**/*.{jsx,tsx,js,mjs,ts}'], plugins: { 'jsx-a11y': plugin }, languageOptions: jsxLanguage, rules }] });
    } else {
      notes.push('eslint-plugin-jsx-a11y not installed — React files checked by heuristics only.');
    }
  }

  if (fw.reactNative) {
    const plugin = await tryLoad('eslint-plugin-react-native-a11y');
    const rules = plugin && rulesFrom(plugin, 'all', 'basic');
    if (rules) {
      groups.push({ label: 'react-native-a11y', files: jsxParseable.filter(isRn), rules, configs: [{ files: ['**/*.{jsx,tsx,js,mjs,ts}'], plugins: { 'react-native-a11y': plugin }, languageOptions: jsxLanguage, rules }] });
    }
  }

  if (fw.angular) {
    const plugin = await tryLoad('@angular-eslint/eslint-plugin-template');
    const parser = await tryLoad('@angular-eslint/template-parser');
    if (plugin && parser) {
      const rules = Object.fromEntries(
        ANGULAR_A11Y_RULES.filter((r) => plugin.rules?.[r]).map((r) => [`@angular-eslint/template/${r}`, 'error']),
      );
      const ngPlugins = { '@angular-eslint/template': plugin };
      groups.push({ label: 'angular templates', files: files.filter((f) => f.endsWith('.html')), rules, configs: [{ files: ['**/*.html'], plugins: ngPlugins, languageOptions: { parser }, rules }] });
      const extract = plugin.processors?.['extract-inline-html'];
      if (extract && tsParser) {
        groups.push({
          label: 'angular inline templates',
          files: files.filter((f) => f.endsWith('.component.ts')),
          rules,
          configs: [
            { files: ['**/*.component.ts'], plugins: ngPlugins, languageOptions: { parser: tsParser }, processor: extract },
            { files: ['**/*.html'], plugins: ngPlugins, languageOptions: { parser }, rules },
          ],
        });
      }
    } else {
      notes.push('@angular-eslint template plugin/parser not installed — Angular templates checked by heuristics only.');
    }
  }

  if (fw.vue) {
    const plugin = await tryLoad('eslint-plugin-vuejs-accessibility');
    const parser = await tryLoad('vue-eslint-parser');
    const rules = plugin && parser && rulesFrom(plugin, 'flat/recommended', 'recommended');
    if (rules) {
      groups.push({
        label: 'vuejs-accessibility',
        files: files.filter((f) => f.endsWith('.vue')),
        rules,
        configs: [{
          files: ['**/*.vue'],
          plugins: { 'vuejs-accessibility': plugin },
          languageOptions: { parser, parserOptions: { parser: tsParser ?? undefined, ecmaVersion: 'latest', sourceType: 'module' } },
          rules,
        }],
      });
    } else {
      notes.push('eslint-plugin-vuejs-accessibility / vue-eslint-parser not installed — Vue files checked by heuristics only.');
    }
  }

  const findings = [];
  for (const group of groups) {
    if (!group.files.length) continue;
    try {
      findings.push(...await lintGroup(ESLintClass, root, group, notes));
    } catch (err) {
      notes.push(`ESLint (${group.label}) failed: ${firstLine(err)} — those files checked by heuristics only.`);
    }
  }
  return findings;
}

async function lintGroup(ESLintClass, root, group, notes) {
  const eslint = new ESLintClass({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: group.configs,
    errorOnUnmatchedPattern: false,
  });
  const ruleIds = new Set(Object.keys(group.rules));
  const findings = [];
  for (let i = 0; i < group.files.length; i += 200) {
    const results = await eslint.lintFiles(group.files.slice(i, i + 200));
    let meta = {};
    try { meta = eslint.getRulesMetaForResults(results); } catch { /* older ESLint */ }
    for (const r of results) {
      const file = r.filePath.startsWith(root) ? r.filePath.slice(root.length + 1).split('\\').join('/') : r.filePath;
      const lines = (r.source ?? readText(r.filePath) ?? '').split('\n');
      for (const m of r.messages) {
        if (m.fatal) { notes.push(`ESLint could not parse ${file}: ${m.message}`); continue; }
        if (!m.ruleId || !ruleIds.has(m.ruleId)) continue;
        const { wcag, severity } = classifyLintRule(m.ruleId);
        const url = meta[m.ruleId]?.docs?.url;
        findings.push(makeFinding({
          rule: m.ruleId,
          source: 'eslint',
          severity,
          wcag,
          file,
          line: m.line,
          column: m.column,
          message: m.message,
          fix: url ? `See ${url}` : undefined,
          snippet: lines[m.line - 1],
        }));
      }
    }
  }
  return findings;
}

function firstLine(err) {
  return String(err?.message ?? err).split('\n')[0];
}
