// Runtime scan with Playwright + axe-core (WCAG 2.2 A/AA tags) and an automated
// keyboard walk (Tab order, focus traps, focus visibility, focus obscured by
// sticky/fixed content). Target size (2.5.8) is left to axe's target-size rule,
// which understands the spacing exception. Uses the project's installed packages:
//   npm i -D playwright @axe-core/playwright && npx playwright install chromium

import { pathToFileURL } from 'node:url';
import { resolveFromProject } from './lib/project.mjs';
import { makeFinding } from './lib/findings.mjs';
import { AXE_WCAG22_AA_TAGS, scFromAxeTag } from './lib/wcag.mjs';
import { buildPreview, parseAriaSnapshot, announcement } from './lib/sr-preview.mjs';

// Page-level rules that are meaningless inside an isolated Storybook story.
const STORY_DISABLED_RULES = ['landmark-one-main', 'page-has-heading-one', 'region', 'document-title', 'html-has-lang', 'bypass'];

export async function runtimeScan(root, { urls = [], storybook, keyboard = true, maxPages = 50, maxTabs = 80, timeout = 30000 } = {}) {
  const notes = [];
  const findings = [];
  const needsReview = [];
  const tabOrders = {};
  const srPreviews = {};

  const pwPath = resolveFromProject(root, 'playwright') ?? resolveFromProject(root, '@playwright/test');
  const axePath = resolveFromProject(root, '@axe-core/playwright');
  if (!pwPath || !axePath) {
    notes.push('Runtime scan skipped: install playwright and @axe-core/playwright in the project (npm i -D playwright @axe-core/playwright && npx playwright install chromium).');
    return { findings, needsReview, tabOrders, srPreviews, notes };
  }
  const pw = await import(pathToFileURL(pwPath).href);
  const chromium = pw.chromium ?? pw.default?.chromium;
  const axeMod = await import(pathToFileURL(axePath).href);
  const AxeBuilder = axeMod.AxeBuilder ?? axeMod.default?.default ?? axeMod.default;

  const targets = urls.map((url) => ({ url, story: false }));
  if (storybook) targets.push(...await storybookTargets(storybook, notes));
  if (targets.length > maxPages) {
    notes.push(`Limiting runtime scan to ${maxPages} of ${targets.length} pages (use --max-pages).`);
    targets.length = maxPages;
  }

  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    notes.push(`Could not launch Chromium (${err.message.split('\n')[0]}). Run: npx playwright install chromium`);
    return { findings, needsReview, tabOrders, srPreviews, notes };
  }

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    for (const t of targets) {
      const page = await context.newPage();
      try {
        await page.goto(t.url, { waitUntil: 'load', timeout });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

        let builder = new AxeBuilder({ page }).withTags(AXE_WCAG22_AA_TAGS);
        if (t.story) builder = builder.disableRules(STORY_DISABLED_RULES);
        const results = await builder.analyze();

        for (const v of results.violations) {
          const wcag = [...new Set(v.tags.map(scFromAxeTag).filter(Boolean))];
          for (const node of v.nodes) {
            findings.push(makeFinding({
              rule: `axe/${v.id}`,
              source: 'axe',
              severity: node.impact ?? v.impact ?? 'moderate',
              wcag,
              file: t.label ?? t.url,
              target: node.target.flat().join(' '),
              snippet: node.html,
              message: `${v.help}. ${firstLine(node.failureSummary)}`.trim(),
              fix: v.helpUrl,
            }));
          }
        }
        for (const v of results.incomplete) {
          for (const node of v.nodes.slice(0, 5)) {
            needsReview.push({ rule: `axe/${v.id}`, page: t.label ?? t.url, target: node.target.flat().join(' '), message: v.help });
          }
        }

        let preview = null;
        if (!t.story) {
          preview = await screenReaderPreview(page, notes);
          if (preview) {
            srPreviews[t.url] = preview;
            for (const r of preview.review) needsReview.push({ rule: 'screen-reader/structure', page: t.url, target: 'page', message: r });
          }
        }

        if (keyboard && !t.story) {
          const walk = await keyboardWalk(page, maxTabs);
          tabOrders[t.url] = walk.order;
          if (preview) preview.tabStops = walk.announcements;
          for (const f of walk.findings) findings.push(makeFinding({ ...f, source: 'keyboard', file: t.url }));
          for (const r of walk.review) needsReview.push({ ...r, page: t.url });
        }
      } catch (err) {
        notes.push(`Failed to scan ${t.url}: ${err.message.split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  return { findings, needsReview, tabOrders, srPreviews, notes };
}

function firstLine(s) {
  return (s ?? '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 2).join(' ');
}

async function storybookTargets(base, notes) {
  const root = base.replace(/\/$/, '');
  for (const path of ['/index.json', '/stories.json']) {
    try {
      const res = await fetch(`${root}${path}`);
      if (!res.ok) continue;
      const data = await res.json();
      const entries = Object.values(data.entries ?? data.stories ?? {});
      return entries
        .filter((e) => (e.type ?? 'story') === 'story')
        .map((e) => ({ url: `${root}/iframe.html?id=${e.id}&viewMode=story`, label: `story:${e.id}`, story: true }));
    } catch { /* try next */ }
  }
  notes.push(`Could not read the Storybook index at ${root} — is Storybook running?`);
  return [];
}

// Press Tab repeatedly and inspect each focused element in the page.
async function keyboardWalk(page, maxTabs) {
  const order = [];
  const announcements = [];
  const findings = [];
  const review = [];
  const seen = new Map();
  let repeats = 0;
  let last = null;

  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(inspectFocused).catch(() => null);
    if (!info) break; // focus left the document
    if (info.selector === last) {
      repeats++;
      if (repeats >= 3) {
        findings.push({
          rule: 'keyboard/focus-trap',
          severity: 'critical',
          wcag: ['2.1.2'],
          target: info.selector,
          message: `Focus is stuck on ${info.label}: pressing Tab does not move focus.`,
          fix: 'Ensure Tab/Shift+Tab can leave the component; only modal dialogs may contain focus, and Escape must close them.',
        });
        break;
      }
      continue;
    }
    repeats = 0;
    last = info.selector;
    if (seen.has(info.selector)) break; // completed a full cycle
    seen.set(info.selector, i);
    order.push(info.label);
    announcements.push(await focusedAnnouncement(page) ?? info.label);

    if (info.obscured === 'full') {
      findings.push({
        rule: 'keyboard/focus-obscured',
        severity: 'serious',
        wcag: ['2.4.11'],
        target: info.selector,
        message: `Focused ${info.label} is completely hidden behind ${info.coveredBy}.`,
        fix: 'Add scroll-padding-top/bottom equal to the sticky header/footer height, or avoid overlaying focusable content.',
      });
    } else if (info.obscured === 'partial') {
      review.push({ rule: 'keyboard/focus-partially-obscured', target: info.selector, message: `Focused ${info.label} is partly covered by ${info.coveredBy} (allowed at AA, verify it is still identifiable).` });
    }
    if (!info.hasIndicator) {
      review.push({ rule: 'keyboard/focus-indicator', target: info.selector, message: `No outline/box-shadow on focused ${info.label} — verify another visible focus style exists (2.4.7).` });
    }
  }
  return { order, announcements, findings, review };
}

// What a screen reader conveys for the focused element, from the browser's
// accessibility tree (Playwright ≥ 1.49). Falls back to null on older versions.
async function focusedAnnouncement(page) {
  try {
    const snap = await page.locator(':focus').first().ariaSnapshot({ timeout: 1500 });
    const node = parseAriaSnapshot(snap)[0];
    if (!node) return null;
    // ariaSnapshot omits false states, required/invalid and descriptions, which screen readers do announce
    const extra = await page.evaluate(() => {
      const el = document.activeElement;
      const a = (n) => el?.getAttribute(n);
      const desc = (a('aria-describedby') ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
      return {
        expanded: a('aria-expanded'),
        pressed: a('aria-pressed'),
        haspopup: a('aria-haspopup'),
        invalid: a('aria-invalid') === 'true',
        required: !!el?.required || a('aria-required') === 'true',
        description: desc || a('aria-description') || '',
      };
    });
    if (extra.expanded === 'false' && !('expanded' in node.states)) node.states.expanded = 'false';
    if (extra.pressed === 'false' && !('pressed' in node.states)) node.states.pressed = 'false';
    if (extra.haspopup && extra.haspopup !== 'false') node.states.haspopup = extra.haspopup;
    if (extra.required) node.states.required = true;
    if (extra.invalid) node.states.invalid = true;
    if (extra.description) node.description = extra.description;
    return announcement(node) || null;
  } catch {
    return null;
  }
}

async function screenReaderPreview(page, notes) {
  try {
    const snap = await page.locator('body').ariaSnapshot({ timeout: 10000 });
    return buildPreview(snap);
  } catch (err) {
    if (!notes.some((n) => n.startsWith('Screen reader preview'))) {
      notes.push(`Screen reader preview unavailable (${err.message.split('\n')[0]}). It needs Playwright 1.49+.`);
    }
    return null;
  }
}

// Runs in the browser.
function inspectFocused() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const cssPath = (node) => {
    const parts = [];
    while (node && node.nodeType === 1 && parts.length < 5) {
      if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      const same = parent ? [...parent.children].filter((c) => c.tagName === node.tagName) : [];
      parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(node) + 1})` : tag);
      node = parent;
    }
    return parts.join(' > ');
  };
  const name = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('placeholder') || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const role = el.getAttribute('role') || el.tagName.toLowerCase();
  const label = `${role}${name ? ` "${name}"` : ''}`;
  const cs = getComputedStyle(el);
  const hasIndicator = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
  const r = el.getBoundingClientRect();
  const inset = 2;
  const points = [
    [r.left + r.width / 2, r.top + r.height / 2],
    [r.left + inset, r.top + inset], [r.right - inset, r.top + inset],
    [r.left + inset, r.bottom - inset], [r.right - inset, r.bottom - inset],
  ];
  let covered = 0;
  let coveredBy = '';
  for (const [x, y] of points) {
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
    const top = document.elementFromPoint(x, y);
    if (top && top !== el && !el.contains(top) && !top.contains(el)) {
      let n = top;
      while (n && n !== document.body) {
        const pos = getComputedStyle(n).position;
        if (pos === 'fixed' || pos === 'sticky') { covered++; coveredBy = cssPath(n); break; }
        n = n.parentElement;
      }
    }
  }
  const obscured = covered === points.length ? 'full' : covered > 0 ? 'partial' : 'none';
  return { selector: cssPath(el), label, hasIndicator: !!hasIndicator, obscured, coveredBy };
}
