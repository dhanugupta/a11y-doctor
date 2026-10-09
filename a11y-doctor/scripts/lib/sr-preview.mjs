// Screen reader preview from the browser's real accessibility tree (Playwright
// `ariaSnapshot()`, which uses Chromium's computed roles, names and states).
// It lists what VoiceOver's Rotor / NVDA's Elements List will offer, and turns it
// into the "Expected announcement" column of a manual screen reader script.
// Exact wording and order differ between VoiceOver, NVDA, JAWS and TalkBack;
// the name, role and state must all be present in every one of them.

const LANDMARKS = new Set(['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'region', 'search', 'form']);
const CONTROLS = new Set(['textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'listbox']);

// "- button "Save" [pressed]" / "- heading "Title" [level=1]" / "- textbox "Email": a@b.c"
const LINE = /^(\s*)- (?:'([^']*)'|([a-z]+))(?: "((?:[^"\\]|\\.)*)")?((?: \[[^\]]+\])*)(?::\s*(.*))?$/;

export function parseAriaSnapshot(text) {
  const nodes = [];
  for (const raw of (text ?? '').split('\n')) {
    const m = LINE.exec(raw);
    if (!m) continue;
    const role = m[3] ?? 'text';
    if (role === 'text' && !m[2]) continue;
    const states = {};
    for (const s of (m[5] ?? '').matchAll(/\[([^\]=]+)(?:=([^\]]+))?\]/g)) states[s[1]] = s[2] ?? true;
    nodes.push({
      depth: m[1].length / 2,
      role,
      name: (m[4] ?? '').replace(/\\"/g, '"'),
      states,
      value: m[6] && !m[6].endsWith(':') ? m[6].trim() : undefined,
    });
  }
  return nodes;
}

// Neutral announcement: name, role, states, value — the parts every screen reader speaks.
export function announcement(node) {
  if (!node) return '';
  const parts = [];
  parts.push(node.name ? `"${node.name}"` : '(no name)');
  parts.push(node.role === 'heading' && node.states.level ? `heading level ${node.states.level}` : node.role);
  for (const [k, v] of Object.entries(node.states)) {
    if (k === 'level') continue;
    if (k === 'checked') parts.push(v === 'mixed' ? 'mixed' : v === true || v === 'true' ? 'checked' : 'not checked');
    else if (k === 'expanded') parts.push(v === true || v === 'true' ? 'expanded' : 'collapsed');
    else if (k === 'pressed') parts.push(v === true || v === 'true' ? 'pressed' : 'not pressed');
    else if (k === 'disabled') parts.push('dimmed/unavailable');
    else if (k === 'selected') parts.push('selected');
    else if (k === 'invalid') parts.push('invalid data');
    else if (k === 'haspopup') parts.push(v === 'true' || v === 'menu' ? 'has menu pop-up' : `has ${v} pop-up`);
    else parts.push(v === true ? k : `${k}=${v}`);
  }
  if (node.role === 'checkbox' && !('checked' in node.states)) parts.push('not checked');
  if (node.value) parts.push(`value "${node.value}"`);
  if (node.description) parts.push(`description "${node.description}"`);
  return parts.join(', ');
}

export function buildPreview(snapshotText) {
  const nodes = parseAriaSnapshot(snapshotText);
  const headings = nodes.filter((n) => n.role === 'heading').map((n) => ({ level: Number(n.states.level) || null, name: n.name }));
  const landmarks = nodes.filter((n) => LANDMARKS.has(n.role) && (n.role !== 'region' && n.role !== 'form' ? true : !!n.name))
    .map((n) => ({ role: n.role, name: n.name }));
  const controls = nodes.filter((n) => CONTROLS.has(n.role)).map((n) => ({ role: n.role, name: n.name, text: announcement(n) }));
  const links = nodes.filter((n) => n.role === 'link');
  const buttons = nodes.filter((n) => n.role === 'button');

  const review = [];
  if (!landmarks.some((l) => l.role === 'main')) review.push('No main landmark: screen reader users cannot jump to the content (2.4.1, 1.3.1).');
  if (!headings.length) review.push('No headings: VoiceOver Rotor / NVDA H-key navigation has nothing to offer (1.3.1, 2.4.6).');
  else {
    const h1 = headings.filter((h) => h.level === 1).length;
    if (h1 === 0) review.push('No level-1 heading (best practice: one h1 naming the page).');
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1].level;
      const cur = headings[i].level;
      if (prev && cur && cur > prev + 1) review.push(`Heading level skips from h${prev} to h${cur} before "${headings[i].name}" (best practice, not an AA failure).`);
    }
  }
  const navs = landmarks.filter((l) => l.role === 'navigation');
  if (navs.length > 1 && new Set(navs.map((n) => n.name)).size < navs.length) {
    review.push('Several navigation landmarks share a name (or have none): give each an aria-label ("Main", "Footer").');
  }
  const dupLinks = countDuplicates(links.map((l) => l.name.toLowerCase()).filter(Boolean));
  for (const [name, n] of dupLinks) {
    if (n > 2) review.push(`${n} links are all named "${name}": check each is distinguishable in context (2.4.4) and by voice control.`);
  }
  for (const c of [...links, ...buttons]) {
    if (!c.name) review.push(`A ${c.role} has no accessible name: VoiceOver says just "${c.role}".`);
  }
  return { headings, landmarks, controls, counts: { links: links.length, buttons: buttons.length, headings: headings.length }, review };
}

function countDuplicates(list) {
  const m = new Map();
  for (const x of list) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].filter(([, n]) => n > 1);
}

// Markdown screen reader test script with expected announcements filled in.
export function renderSrScript(previews) {
  const out = [];
  out.push('# Screen reader test script');
  out.push('');
  out.push('Generated by a11y-doctor from the browser accessibility tree. The **Expected** column lists the name, role and state every screen reader must convey. Wording and order vary: VoiceOver usually says *name, role* ("Save, button"), while NVDA usually says *name role* ("Save button"). Record what you actually hear.');
  out.push('');
  out.push('Recommended pairs: **VoiceOver + Safari** (macOS / iOS), **NVDA + Firefox or Chrome** (Windows), **TalkBack + Chrome** (Android). Commands: references/screen-readers.md (VoiceOver macOS, NVDA) and references/assistive-tech.md (iOS, Android).');
  for (const [url, p] of Object.entries(previews)) {
    out.push('');
    out.push(`## ${url}`);
    out.push('');
    out.push('### 1. Headings: VoiceOver Rotor (VO+U → Headings) / NVDA Elements List (NVDA+F7, Alt+H)');
    out.push('');
    if (p.headings.length) p.headings.forEach((h) => out.push(`- [ ] ${'  '.repeat(Math.max(0, (h.level ?? 1) - 1))}h${h.level ?? '?'} "${h.name}"`));
    else out.push('- [ ] ⚠ none found');
    out.push('');
    out.push('### 2. Landmarks: Rotor → Landmarks / NVDA D key');
    out.push('');
    if (p.landmarks.length) p.landmarks.forEach((l) => out.push(`- [ ] ${l.role}${l.name ? ` "${l.name}"` : ''}`));
    else out.push('- [ ] ⚠ none found');
    if (p.controls.length) {
      out.push('');
      out.push('### 3. Form controls: Rotor → Form Controls / NVDA F key');
      out.push('');
      p.controls.forEach((c) => out.push(`- [ ] ${c.text}`));
    }
    if (p.tabStops?.length) {
      out.push('');
      out.push('### 4. Tab through (keyboard focus): VoiceOver and NVDA announce each stop');
      out.push('');
      out.push('| # | Expected | VoiceOver heard | NVDA heard | ✓ |');
      out.push('|---|---|---|---|---|');
      p.tabStops.forEach((t, i) => out.push(`| ${i + 1} | ${t.replace(/\|/g, '\\|')} | | | |`));
    }
    out.push('');
    out.push('### 5. Interactions');
    out.push('');
    out.push('- [ ] Activate each control (VO+Space / Enter): the result is announced, or focus moves to the new content');
    out.push('- [ ] Open and close dialogs and menus: the title is announced on open, and focus returns on close');
    out.push('- [ ] Trigger errors, toasts and loading: the message is announced without moving focus (live region)');
    out.push('- [ ] Complete the main task with the screen on but without looking (VoiceOver Screen Curtain: VO+Shift+Fn+_ / iOS triple-tap with three fingers)');
    if (p.review.length) {
      out.push('');
      out.push('### ⚠ Things to listen for');
      out.push('');
      p.review.forEach((r) => out.push(`- ${r}`));
    }
  }
  return `${out.join('\n')}\n`;
}
