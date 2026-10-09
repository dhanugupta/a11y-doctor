import { createHash } from 'node:crypto';

// Same scale as axe-core "impact".
export const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'];

export function severityRank(sev) {
  const i = SEVERITIES.indexOf(sev);
  return i === -1 ? SEVERITIES.length : i;
}

export function atLeast(sev, threshold) {
  return severityRank(sev) <= severityRank(threshold);
}

/**
 * A finding is the single shape every scanner reports.
 * @typedef {object} Finding
 * @property {string} rule        e.g. "heuristic/img-alt", "jsx-a11y/alt-text", "axe/color-contrast"
 * @property {string} source      "heuristic" | "eslint" | "axe" | "keyboard"
 * @property {string} severity    one of SEVERITIES
 * @property {string[]} wcag      success criteria, e.g. ["1.1.1"]
 * @property {string} file        repo-relative path, or URL for runtime findings
 * @property {number} [line]
 * @property {number} [column]
 * @property {string} [target]    CSS selector for runtime findings
 * @property {string} message
 * @property {string} [fix]       suggested fix
 * @property {string} [snippet]   offending code / HTML
 * @property {string} [fingerprint]
 */
export function makeFinding(f) {
  return {
    rule: f.rule,
    source: f.source,
    severity: SEVERITIES.includes(f.severity) ? f.severity : 'moderate',
    wcag: f.wcag ?? [],
    file: f.file,
    line: f.line,
    column: f.column,
    target: f.target,
    message: f.message,
    fix: f.fix,
    snippet: f.snippet ? truncate(f.snippet.trim(), 240) : undefined,
  };
}

function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// Fingerprints must survive unrelated edits (line shifts), so they are built from
// the rule, the file and the normalized offending code — never the line number.
export function assignFingerprints(findings) {
  const seen = new Map();
  for (const f of findings) {
    const anchor = f.target ?? (f.snippet ?? '').replace(/\s+/g, ' ').trim();
    const base = `${f.rule}|${f.file}|${anchor}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    f.fingerprint = createHash('sha1').update(`${base}|${n}`).digest('hex').slice(0, 16);
  }
  return findings;
}

// Collapse the same problem reported by several tools at the same spot,
// keeping the most severe and merging WCAG references.
export function dedupe(findings) {
  const byKey = new Map();
  for (const f of findings) {
    const key = f.line != null
      ? `${f.file}:${f.line}:${canonicalRule(f.rule)}`
      : `${f.file}|${f.target}|${canonicalRule(f.rule)}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, f);
      continue;
    }
    const keep = severityRank(f.severity) < severityRank(prev.severity) ? f : prev;
    keep.wcag = [...new Set([...prev.wcag, ...f.wcag])];
    keep.alsoReportedBy = [...new Set([...(prev.alsoReportedBy ?? []), ...(f.alsoReportedBy ?? []), f === keep ? prev.rule : f.rule])];
    byKey.set(key, keep);
  }
  return [...byKey.values()];
}

// Map equivalent rules from different tools to one concept for de-duplication.
const EQUIVALENT = {
  'img-alt': ['jsx-a11y/alt-text', '@angular-eslint/template/alt-text', 'vuejs-accessibility/alt-text', 'heuristic/img-alt'],
  'control-name': ['jsx-a11y/control-has-associated-label', 'heuristic/control-name', 'jsx-a11y/anchor-has-content', 'vuejs-accessibility/anchor-has-content'],
  'form-label': ['jsx-a11y/label-has-associated-control', '@angular-eslint/template/label-has-associated-control', 'vuejs-accessibility/form-control-has-label', 'heuristic/form-label'],
  'click-keyboard': ['jsx-a11y/click-events-have-key-events', 'jsx-a11y/no-static-element-interactions', 'jsx-a11y/no-noninteractive-element-interactions', 'jsx-a11y/interactive-supports-focus', '@angular-eslint/template/click-events-have-key-events', '@angular-eslint/template/interactive-supports-focus', 'vuejs-accessibility/click-events-have-key-events', 'vuejs-accessibility/no-static-element-interactions', 'heuristic/click-without-keyboard', 'heuristic/interactive-role-not-focusable'],
  'tabindex': ['jsx-a11y/tabindex-no-positive', '@angular-eslint/template/no-positive-tabindex', 'vuejs-accessibility/tabindex-no-positive', 'heuristic/positive-tabindex'],
  'autofocus': ['jsx-a11y/no-autofocus', '@angular-eslint/template/no-autofocus', 'vuejs-accessibility/no-autofocus', 'heuristic/autofocus'],
  'aria-props': ['jsx-a11y/aria-props', '@angular-eslint/template/valid-aria', 'vuejs-accessibility/aria-props', 'heuristic/invalid-aria-attr'],
  'aria-role': ['jsx-a11y/aria-role', 'vuejs-accessibility/aria-role', 'heuristic/invalid-role'],
  'anchor-valid': ['jsx-a11y/anchor-is-valid', 'heuristic/anchor-as-button'],
  'heading-content': ['jsx-a11y/heading-has-content', 'vuejs-accessibility/heading-has-content', '@angular-eslint/template/elements-content'],
  'iframe-title': ['jsx-a11y/iframe-has-title', 'vuejs-accessibility/iframe-has-title', 'heuristic/iframe-title'],
  'html-lang': ['jsx-a11y/html-has-lang', 'heuristic/html-lang'],
  'media-captions': ['jsx-a11y/media-has-caption', 'vuejs-accessibility/media-has-caption', 'heuristic/media-captions'],
  'mouse-keyboard': ['jsx-a11y/mouse-events-have-key-events', '@angular-eslint/template/mouse-events-have-key-events', 'vuejs-accessibility/mouse-events-have-key-events', 'heuristic/mouse-only'],
};
const CANONICAL = new Map(Object.entries(EQUIVALENT).flatMap(([k, rules]) => rules.map((r) => [r, k])));
export function canonicalRule(rule) {
  return CANONICAL.get(rule) ?? rule;
}

export function sortFindings(findings) {
  return findings.sort((a, b) =>
    severityRank(a.severity) - severityRank(b.severity)
    || String(a.file).localeCompare(String(b.file))
    || (a.line ?? 0) - (b.line ?? 0));
}

export function countBySeverity(findings) {
  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  return counts;
}
