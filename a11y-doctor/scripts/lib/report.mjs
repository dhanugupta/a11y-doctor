import { SEVERITIES } from './findings.mjs';
import { WCAG22 } from './wcag.mjs';

const ICON = { critical: '🔴', serious: '🟠', moderate: '🟡', minor: '⚪' };

function where(f) {
  if (f.line != null) return `${f.file}:${f.line}${f.column ? `:${f.column}` : ''}`;
  return `${f.file} → \`${f.target}\``;
}

// One entry per rule: the agent fixes a rule's instances as one batch, so the
// message, WCAG reference and fix are printed once, followed by compact locations.
export function groupByRule(findings) {
  const groups = new Map();
  for (const f of findings) {
    if (!groups.has(f.rule)) groups.set(f.rule, []);
    groups.get(f.rule).push(f);
  }
  return [...groups.values()];
}

function groupMessage(items) {
  const msgs = [...new Set(items.map((f) => f.message))];
  if (msgs.length === 1) return msgs[0];
  // axe messages are "<help>. <node-specific summary>": keep the shared help sentence
  const first = msgs[0].split(/(?<=\.)\s/)[0];
  return msgs.every((m) => m.startsWith(first)) ? first : msgs[0];
}

// "src/a.tsx:12:3, 40:7" / "https://x → img.logo · a.more"
function compactLocations(items, limit = Infinity) {
  const byFile = new Map();
  for (const f of items) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f.line != null ? `${f.line}${f.column ? `:${f.column}` : ''}` : f.target);
  }
  const parts = [];
  let shown = 0;
  for (const [file, locs] of byFile) {
    if (shown >= limit) break;
    const take = locs.slice(0, Math.max(1, limit - shown));
    shown += take.length;
    const static_ = items.find((f) => f.file === file)?.line != null;
    parts.push(static_ ? `${file}:${take.join(', ')}` : `${file} → ${take.map((t) => `\`${t}\``).join(' · ')}`);
  }
  const rest = items.length - shown;
  return { text: parts.join(' | '), rest: rest > 0 ? rest : 0 };
}

function wcagList(f) {
  return f.wcag.length ? f.wcag.map((sc) => `${sc} ${WCAG22[sc]?.name ?? ''}`.trim()).join('; ') : '—';
}

export function renderMarkdown(report) {
  const out = [];
  const { counts, delta, scope } = report;
  out.push('# A11y Doctor report');
  out.push('');
  out.push(`Generated ${report.generatedAt} · WCAG 2.2 Level A + AA · scope: ${scope.mode}${scope.base ? ` (base ${scope.base})` : ''} · ${scope.files} files${scope.urls ? ` · ${scope.urls} pages` : ''}`);
  out.push('');
  out.push('| Severity | Open | ' + (delta ? 'Fixed since last run | New since last run |' : ''));
  out.push('|---|---|' + (delta ? '---|---|' : ''));
  for (const s of SEVERITIES) {
    out.push(`| ${ICON[s]} ${s} | ${counts[s]} |` + (delta ? ` ${delta.fixedBySeverity[s] ?? 0} | ${delta.newBySeverity[s] ?? 0} |` : ''));
  }
  if (report.baselined) out.push(`\n${report.baselined} known issue(s) suppressed by baseline (\`${report.baselineFile}\`).`);
  const tools = Object.entries(report.stack?.tools ?? {});
  if (tools.length) out.push(`\nTool versions: ${tools.map(([k, v]) => `${k}@${v}`).join(', ')}`);
  out.push('');

  if (!report.findings.length) {
    out.push('✅ No automated findings in scope. Automated checks cover only part of WCAG — complete the manual checks below.');
  }
  for (const s of SEVERITIES) {
    const items = report.findings.filter((f) => f.severity === s);
    if (!items.length) continue;
    out.push(`## ${ICON[s]} ${s[0].toUpperCase()}${s.slice(1)} (${items.length})`);
    for (const group of groupByRule(items)) {
      const f = group[0];
      out.push('');
      out.push(`### ${f.rule} ×${group.length} · WCAG ${wcagList(f)}`);
      out.push(groupMessage(group));
      if (f.fix) out.push(`Fix: ${f.fix}`);
      out.push('');
      for (const g of group) {
        const snip = g.snippet ? ` \`${g.snippet.replace(/`/g, "'").replace(/\s+/g, ' ').slice(0, 80)}\`` : '';
        const own = group.length > 1 && g.message !== groupMessage(group) && g.source !== 'axe' ? ` (${g.message})` : '';
        out.push(`- [ ] ${where(g)}${snip}${own}`);
      }
    }
    out.push('');
  }

  if (report.needsReview?.length) {
    out.push(`## 🔍 Needs human review (${report.needsReview.length})`);
    out.push('');
    const byRule = new Map();
    for (const r of report.needsReview) {
      if (!byRule.has(r.rule)) byRule.set(r.rule, []);
      byRule.get(r.rule).push(r);
    }
    for (const [rule, rs] of byRule) {
      const msgs = [...new Set(rs.map((r) => r.message))];
      if (msgs.length === 1) {
        out.push(`- [ ] **${rule}** ×${rs.length}: ${msgs[0]} — ${rs.slice(0, 20).map((r) => `\`${r.target}\``).join(' · ')}${rs.length > 20 ? ` (+${rs.length - 20})` : ''}`);
      } else {
        for (const r of rs.slice(0, 20)) out.push(`- [ ] **${rule}** ${r.target === 'page' ? '' : `\`${r.target}\` `}${r.message}`);
        if (rs.length > 20) out.push(`- … ${rs.length - 20} more ${rule}`);
      }
    }
    out.push('');
  }

  const tabPages = Object.entries(report.tabOrders ?? {});
  if (tabPages.length) {
    out.push('## ⌨️ Observed Tab order and expected announcements');
    out.push('');
    out.push('Check that the order matches the visual reading order (2.4.3) and that each stop has a name, role and state. A full VoiceOver/NVDA script with these as expected values is in `sr-script.md`.');
    for (const [url, order] of tabPages) {
      const spoken = report.srPreviews?.[url]?.tabStops;
      out.push('');
      out.push(`**${url}**`);
      out.push('');
      order.forEach((label, i) => out.push(`${i + 1}. ${spoken?.[i] ?? label}`));
    }
    out.push('');
  }
  const previews = Object.entries(report.srPreviews ?? {});
  if (previews.length) {
    out.push('## 🔊 Screen reader preview (headings and landmarks)');
    for (const [url, p] of previews) {
      out.push('');
      out.push(`**${url}**: ${p.counts.headings} headings, ${p.counts.links} links, ${p.counts.buttons} buttons`);
      out.push('');
      out.push(`- Landmarks: ${p.landmarks.map((l) => l.role + (l.name ? ` "${l.name}"` : '')).join(', ') || '⚠ none'}`);
      out.push(`- Headings: ${p.headings.map((h) => `h${h.level ?? '?'} "${h.name}"`).join(' → ') || '⚠ none'}`);
    }
    out.push('');
  }

  if (report.testingGaps?.length) {
    out.push('## 🧪 Testing coverage gaps');
    out.push('');
    for (const g of report.testingGaps) out.push(`- [ ] **${g.id}** (${g.severity}) ${g.message} → ${g.fix}`);
    out.push('');
  }

  out.push('## ✋ Manual checks (not reliably automatable)');
  out.push('');
  const principles = { 1: 'Perceivable', 2: 'Operable', 3: 'Understandable', 4: 'Robust' };
  for (const [n, label] of Object.entries(principles)) {
    const scs = report.manualChecks.filter((sc) => sc.startsWith(`${n}.`));
    if (scs.length) out.push(`- **${label}**: ${scs.map((sc) => `${sc} ${WCAG22[sc]?.name ?? ''}`.trim()).join(' · ')}`);
  }
  out.push('');
  out.push('See references/manual-verification.md (keyboard) and references/screen-readers.md (VoiceOver, NVDA, voice control) and references/assistive-tech.md (mobile, JAWS).');

  if (report.notes?.length) {
    out.push('');
    out.push('## Notes');
    out.push('');
    for (const n of report.notes) out.push(`- ${n}`);
  }
  return `${out.join('\n')}\n`;
}

export function renderSummary(report, { top = 15, rule, locations = 3 } = {}) {
  const { counts, delta } = report;
  const lines = [];
  const total = report.findings.length;
  const groups = groupByRule(report.findings);
  lines.push(`a11y-doctor: ${total} open finding(s) in ${groups.length} rule(s) — ${SEVERITIES.map((s) => `${counts[s]} ${s}`).join(', ')}${report.baselined ? ` (+${report.baselined} baselined)` : ''}`);
  if (delta) lines.push(`since last run: ${delta.fixed} fixed, ${delta.new} new, ${delta.remaining} remaining`);
  const shown = rule ? groups.filter((g) => g[0].rule === rule) : groups.slice(0, top);
  if (rule && !shown.length) lines.push(`  no open findings for rule ${rule}`);
  for (const group of shown) {
    const f = group[0];
    const loc = compactLocations(group, rule ? Infinity : locations);
    lines.push(`  ${ICON[f.severity]} ${f.severity.padEnd(8)} ${f.rule} ×${group.length}  [${f.wcag.join(', ') || '—'}]`);
    lines.push(`      ${groupMessage(group)}`);
    if (f.fix) lines.push(`      fix: ${f.fix}`);
    lines.push(`      at: ${loc.text}${loc.rest ? `  (+${loc.rest} more: --rule ${f.rule})` : ''}`);
  }
  if (!rule && groups.length > top) lines.push(`  … ${groups.length - top} more rule(s) in the report`);
  if (report.needsReview?.length) lines.push(`${report.needsReview.length} item(s) need human review (see report).`);
  for (const n of report.notes ?? []) lines.push(`note: ${n}`);
  return lines.join('\n');
}
