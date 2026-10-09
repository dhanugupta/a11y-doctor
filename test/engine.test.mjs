import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkup, innerContentKind } from '../a11y-doctor/scripts/lib/tag-parser.mjs';
import { scanSource } from '../a11y-doctor/scripts/lib/heuristics.mjs';
import { assignFingerprints, dedupe, makeFinding, atLeast } from '../a11y-doctor/scripts/lib/findings.mjs';
import { scFromAxeTag } from '../a11y-doctor/scripts/lib/wcag.mjs';
import { classifyLintRule } from '../a11y-doctor/scripts/lib/rules-map.mjs';

const rules = (file, src) => scanSource(file, src).map((f) => f.rule.replace('heuristic/', ''));

test('parser ignores TS generics, comparisons, comments and strings', () => {
  const src = `
    const a = useState<string>('');
    const b = x<y && y > z;
    const f = <T,>(v: T) => v;
    // <div onClick={go}>
    const s = "<img src=x>";
    return <div className="ok" />;`;
  const els = parseMarkup(src, { mode: 'jsx' });
  assert.deepEqual(els.map((e) => e.rawName), ['div']);
});

test('parser normalizes events and bindings across frameworks', () => {
  const [jsx] = parseMarkup('<button onClick={go} aria-label="Close" tabIndex={0} />', { mode: 'jsx' });
  assert.ok(jsx.events.has('click'));
  assert.equal(jsx.attrs['aria-label'].value, 'Close');
  assert.equal(jsx.attrs.tabindex.dynamic, false);

  const [ng] = parseMarkup('<div (click)="go()" (keydown.enter)="go()" [attr.aria-label]="label"></div>', { mode: 'html' });
  assert.ok(ng.events.has('click') && ng.events.has('keydown'));
  assert.equal(ng.attrs['aria-label'].dynamic, true);

  const [vue] = parseMarkup('<img :alt="a" @click.prevent="x" v-bind="rest">', { mode: 'vue' });
  assert.ok(vue.events.has('click'));
  assert.ok(vue.hasSpread);
  assert.equal(vue.attrs.alt.dynamic, true);
});

test('inner content: text, icon-only, dynamic', () => {
  const kind = (src, mode = 'jsx') => {
    const els = parseMarkup(src, { mode });
    return innerContentKind(src, els, 0, mode);
  };
  assert.equal(kind('<button>Save</button>'), 'text');
  assert.equal(kind('<button><SaveIcon /></button>'), 'empty');
  assert.equal(kind('<button>{label}</button>'), 'unknown');
  assert.equal(kind('<button><Trans id="x" /></button>'), 'unknown');
  assert.equal(kind('<button><mat-icon>close</mat-icon></button>', 'html'), 'empty');
  assert.equal(kind('<button><span>Close</span><svg><path/></svg></button>'), 'text');
  assert.equal(kind('<a href="/"><img src="l.png" alt="Home" /></a>'), 'text');
});

test('heuristics stay quiet on accessible code', () => {
  const src = `export const C = () => (
    <form>
      <label htmlFor="e">Email</label><input id="e" type="email" />
      <button type="submit">Send</button>
      <div role="button" tabIndex={0} onClick={go} onKeyDown={key}>Go</div>
      <img src="a.png" alt="" />
      <Comp {...props} onClick={go} />
    </form>
  );`;
  assert.deepEqual(rules('C.tsx', src), []);
});

test('heuristics catch core failures', () => {
  assert.deepEqual(rules('a.tsx', 'const x = <img src="a.png" />;'), ['img-alt']);
  assert.deepEqual(rules('a.html', '<span (click)="go()">x</span>'), ['click-without-keyboard']);
  assert.deepEqual(rules('a.html', '<button><i class="fa fa-close"></i></button>'), ['control-name']);
  assert.deepEqual(rules('a.html', '<meta name="viewport" content="user-scalable=no">'), ['viewport-zoom']);
  assert.deepEqual(rules('a.css', 'button:focus{outline:none}'), ['focus-outline-removed']);
  assert.deepEqual(rules('a.css', 'button:focus{outline:none; box-shadow: 0 0 0 2px blue}'), []);
});

test('fingerprints ignore line shifts but distinguish repeats', () => {
  const mk = (line) => makeFinding({ rule: 'r', source: 'heuristic', file: 'a.tsx', line, snippet: '<img src="a">', severity: 'critical' });
  const [a] = assignFingerprints([mk(1)]);
  const [b] = assignFingerprints([mk(40)]);
  assert.equal(a.fingerprint, b.fingerprint);
  const [c, d] = assignFingerprints([mk(1), mk(2)]);
  assert.notEqual(c.fingerprint, d.fingerprint);
});

test('dedupe merges equivalent rules from different tools', () => {
  const base = { source: 'x', file: 'a.tsx', line: 3, message: '' };
  const out = dedupe([
    makeFinding({ ...base, rule: 'heuristic/img-alt', severity: 'critical', wcag: ['1.1.1'] }),
    makeFinding({ ...base, rule: 'jsx-a11y/alt-text', severity: 'serious', wcag: ['1.1.1'] }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'critical');
});

test('axe tag → WCAG criterion', () => {
  assert.equal(scFromAxeTag('wcag111'), '1.1.1');
  assert.equal(scFromAxeTag('wcag1410'), '1.4.10');
  assert.equal(scFromAxeTag('wcag258'), '2.5.8');
  assert.equal(scFromAxeTag('wcag2aa'), null);
  assert.equal(scFromAxeTag('wcag146'), null); // AAA – out of scope
});

test('lint rule classification and severity threshold', () => {
  assert.deepEqual(classifyLintRule('jsx-a11y/alt-text').wcag, ['1.1.1']);
  assert.equal(classifyLintRule('@angular-eslint/template/label-has-associated-control').severity, 'critical');
  assert.ok(atLeast('critical', 'serious'));
  assert.ok(!atLeast('minor', 'serious'));
});

import { parseAriaSnapshot, announcement, buildPreview } from '../a11y-doctor/scripts/lib/sr-preview.mjs';

test('aria snapshot → screen reader announcements', () => {
  const nodes = parseAriaSnapshot([
    '- heading "Checkout" [level=1]',
    '- textbox "Email": a@b.co',
    '- checkbox "Save details" [checked]',
    '- button "Menu" [expanded]',
    '- button "Off" [disabled]',
    '- link "Say \\"hi\\""',
  ].join('\n'));
  assert.deepEqual(nodes.map(announcement), [
    '"Checkout", heading level 1',
    '"Email", textbox, value "a@b.co"',
    '"Save details", checkbox, checked',
    '"Menu", button, expanded',
    '"Off", button, dimmed/unavailable',
    '"Say "hi"", link',
  ]);
});

test('preview flags structural screen reader problems', () => {
  const p = buildPreview([
    '- banner:', '  - navigation:', '    - link "Home"',
    '- heading "Shop" [level=2]', '- heading "Deals" [level=4]',
    '- button', '- contentinfo:', '  - navigation:', '    - link "Terms"',
  ].join('\n'));
  const text = p.review.join('\n');
  assert.match(text, /No main landmark/);
  assert.match(text, /No level-1 heading/);
  assert.match(text, /skips from h2 to h4/);
  assert.match(text, /navigation landmarks share a name/);
  assert.match(text, /button has no accessible name/);
});

import { renderSummary } from '../a11y-doctor/scripts/lib/report.mjs';

test('console summary groups findings by rule and supports --rule', () => {
  const mk = (line) => makeFinding({ rule: 'heuristic/img-alt', source: 'heuristic', severity: 'critical', wcag: ['1.1.1'], file: 'a.tsx', line, message: '<img> has no alt attribute.', fix: 'Add alt.' });
  const report = { findings: [1, 2, 3, 4, 5].map(mk), counts: { critical: 5, serious: 0, moderate: 0, minor: 0 }, notes: [] };
  const grouped = renderSummary(report);
  assert.match(grouped, /5 open finding\(s\) in 1 rule\(s\)/);
  assert.equal(grouped.match(/has no alt attribute/g).length, 1);          // message printed once
  assert.match(grouped, /at: a\.tsx:1, 2, 3 +\(\+2 more: --rule heuristic\/img-alt\)/);
  const all = renderSummary(report, { rule: 'heuristic/img-alt' });
  assert.match(all, /at: a\.tsx:1, 2, 3, 4, 5$/m);
});
