// A small, forgiving markup scanner for JSX/TSX, HTML (incl. Angular templates),
// Vue templates and Android XML layouts. It is not a full parser: it finds
// elements, normalizes their attributes/event bindings across frameworks and
// records nesting so heuristics can reason about labels, children and text.

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

const IDENT = /[A-Za-z0-9_$]/;

/**
 * @param {string} source full file contents
 * @param {object} opts
 * @param {'jsx'|'html'|'vue'|'xml'} opts.mode
 * @param {number} [opts.from] start offset (e.g. inline template start)
 * @param {number} [opts.to]   end offset
 */
export function parseMarkup(source, { mode, from = 0, to = source.length }) {
  const elements = [];
  const stack = [];
  let i = from;

  while (i < to) {
    const ch = source[i];

    if (mode === 'jsx') {
      // Skip JS comments (also {/* ... */} inside JSX children) and, outside
      // markup, string literals — so "<div>" in a comment or string is ignored.
      if (ch === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2);
        i = end === -1 ? to : end + 2;
        continue;
      }
      if (stack.length === 0) {
        if (ch === '/' && source[i + 1] === '/' && (i === 0 || /[\s;{}(),]/.test(source[i - 1]))) {
          const nl = source.indexOf('\n', i);
          i = nl === -1 ? to : nl;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
          i = skipString(source, i, to);
          continue;
        }
      }
    }

    if (ch !== '<') {
      i++;
      continue;
    }

    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      i = end === -1 ? to : end + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', i) || source[i + 1] === '!' || source[i + 1] === '?') {
      const end = source.indexOf('>', i);
      i = end === -1 ? to : end + 1;
      continue;
    }

    // Closing tag
    if (source[i + 1] === '/') {
      const m = /^<\/\s*([A-Za-z][\w.:-]*)?\s*>/.exec(source.slice(i, Math.min(to, i + 200)));
      if (!m) { i++; continue; }
      const rawName = m[1] ?? '#fragment';
      for (let s = stack.length - 1; s >= 0; s--) {
        if (elements[stack[s]].rawName === rawName) {
          for (let k = stack.length - 1; k >= s; k--) {
            const el = elements[stack[k]];
            el.innerEnd = k === s ? i : el.innerEnd ?? i;
            el.end = k === s ? i + m[0].length : el.end ?? i;
          }
          stack.length = s;
          break;
        }
      }
      i += m[0].length;
      continue;
    }

    // JSX fragment <>
    if (mode === 'jsx' && source[i + 1] === '>') {
      const el = newElement('#fragment', i, mode);
      el.openEnd = i + 2;
      el.innerStart = i + 2;
      el.parent = stack.length ? stack[stack.length - 1] : -1;
      elements.push(el);
      stack.push(elements.length - 1);
      i += 2;
      continue;
    }

    if (!/[A-Za-z]/.test(source[i + 1] ?? '')) { i++; continue; }

    // In JS/TS code, `<` right after an identifier is a generic or comparison
    // (useState<string>, a<b) — unless we're already inside JSX children.
    if (mode === 'jsx' && stack.length === 0 && i > 0 && (IDENT.test(source[i - 1]) || source[i - 1] === ')' || source[i - 1] === ']' || source[i - 1] === '.')) {
      i++;
      continue;
    }

    const nameMatch = /^<([A-Za-z][\w.:-]*)/.exec(source.slice(i, i + 200));
    if (!nameMatch) { i++; continue; }
    const rawName = nameMatch[1];
    // TS generic arrow functions: const f = <T,>(x: T) => … / <T extends U>
    if (mode === 'jsx' && /^\s*(,|extends\b)/.test(source.slice(i + nameMatch[0].length, i + nameMatch[0].length + 10))) {
      i += nameMatch[0].length;
      continue;
    }
    const el = newElement(rawName, i, mode);
    el.parent = stack.length ? stack[stack.length - 1] : -1;

    let j = i + nameMatch[0].length;
    let closed = false;
    while (j < to) {
      while (j < to && /\s/.test(source[j])) j++;
      if (source[j] === '/' && source[j + 1] === '>') { el.selfClosing = true; j += 2; closed = true; break; }
      if (source[j] === '>') { j += 1; closed = true; break; }
      // JS comments between JSX attributes: // … and /* … */
      if (mode === 'jsx' && source[j] === '/' && source[j + 1] === '/') {
        const nl = source.indexOf('\n', j);
        j = nl === -1 ? to : nl + 1;
        continue;
      }
      if (mode === 'jsx' && source[j] === '/' && source[j + 1] === '*') {
        const end = source.indexOf('*/', j + 2);
        j = end === -1 ? to : end + 2;
        continue;
      }
      if (mode === 'jsx' && source[j] === '{') {
        const end = skipBalanced(source, j, to);
        if (/^\{\s*\.\.\./.test(source.slice(j, end))) el.hasSpread = true;
        j = end;
        continue;
      }
      const attrStart = j;
      while (j < to && !/[\s=>]/.test(source[j]) && !(source[j] === '/' && source[j + 1] === '>')) j++;
      const attrName = source.slice(attrStart, j);
      if (!attrName) { j++; continue; }
      let value = null;
      let valueKind = 'none';
      let k = j;
      while (k < to && /\s/.test(source[k])) k++;
      if (source[k] === '=') {
        k++;
        while (k < to && /\s/.test(source[k])) k++;
        const q = source[k];
        if (q === '"' || q === "'") {
          const end = source.indexOf(q, k + 1);
          value = source.slice(k + 1, end === -1 ? to : end);
          valueKind = 'string';
          j = end === -1 ? to : end + 1;
        } else if (q === '{' && mode === 'jsx') {
          const end = skipBalanced(source, k, to);
          value = source.slice(k + 1, end - 1).trim();
          valueKind = 'expression';
          // {"literal"} / {'literal'} are effectively static strings
          const lit = /^(["'`])([^"'`$]*)\1$/.exec(value);
          if (lit) { value = lit[2]; valueKind = 'string'; }
          // {3} / {-1} / {true} / {false} are literals too
          else if (/^(-?\d+(\.\d+)?|true|false)$/.test(value)) valueKind = 'string';
          j = end;
        } else {
          const start = k;
          while (k < to && !/[\s>]/.test(source[k]) && !(source[k] === '/' && source[k + 1] === '>')) k++;
          value = source.slice(start, k);
          valueKind = 'string';
          j = k;
        }
      }
      addAttribute(el, attrName, value, valueKind, mode);
    }
    if (!closed) break;

    el.openEnd = j;
    el.openTag = source.slice(i, j);
    const lower = el.name;
    const isVoid = (mode === 'html' || mode === 'vue') && VOID_ELEMENTS.has(lower);
    if (el.selfClosing || isVoid) {
      el.selfClosing = true;
      el.end = j;
      elements.push(el);
    } else {
      el.innerStart = j;
      elements.push(el);
      // Raw-text elements: don't scan inside
      if (lower === 'script' || lower === 'style') {
        const close = source.toLowerCase().indexOf(`</${lower}`, j);
        const end = close === -1 ? to : source.indexOf('>', close) + 1;
        el.innerEnd = close === -1 ? to : close;
        el.end = end;
        i = end;
        continue;
      }
      stack.push(elements.length - 1);
    }
    i = j;
  }

  for (const idx of stack) {
    const el = elements[idx];
    el.innerEnd ??= to;
    el.end ??= to;
  }
  for (const el of elements) {
    el.end ??= el.openEnd;
  }
  return elements;
}

function newElement(rawName, start, mode) {
  const name = rawName.toLowerCase();
  let isComponent = false;
  if (mode === 'jsx') isComponent = /^[A-Z]/.test(rawName) || rawName.includes('.');
  else if (mode === 'vue') isComponent = /^[A-Z]/.test(rawName) || rawName.includes('-');
  else if (mode === 'html') isComponent = rawName.includes('-');
  return {
    rawName,
    name,
    isComponent,
    start,
    attrs: {},
    events: new Set(),
    eventValues: {},
    hasSpread: false,
    selfClosing: false,
  };
}

function addAttribute(el, rawAttr, value, valueKind, mode) {
  let name = rawAttr;
  let dynamic = valueKind === 'expression';

  if (mode === 'jsx') {
    const ev = /^on([A-Z][A-Za-z]*)$/.exec(name);
    if (ev) { el.events.add(ev[1].toLowerCase()); el.eventValues[ev[1].toLowerCase()] = value ?? ''; return; }
    if (name === 'className') name = 'class';
    else if (name === 'htmlFor') name = 'for';
  } else {
    // Angular event binding (click)="..." / (keydown.enter)="..."
    let m = /^\(([\w-]+)(?:\.[\w.-]+)?\)$/.exec(name);
    if (m) { el.events.add(m[1].toLowerCase()); el.eventValues[m[1].toLowerCase()] = value ?? ''; return; }
    // Vue event binding @click / v-on:click(.modifiers)
    m = /^(?:@|v-on:)([\w-]+)/.exec(name);
    if (m) { el.events.add(m[1].toLowerCase()); el.eventValues[m[1].toLowerCase()] = value ?? ''; return; }
    if (name === 'v-bind' || name === 'v-bind.prop') { el.hasSpread = true; return; }
    if (name.startsWith('*') || name.startsWith('#') || name.startsWith('[(') || name.startsWith('v-') && !name.startsWith('v-bind:')) {
      if (name === 'v-html' || name === '[innerHTML]') el.hasDynamicContent = true;
      return;
    }
    // Angular [attr.aria-label] / [alt] / [ariaLabel]
    m = /^\[(?:attr\.)?([\w.-]+)\]$/.exec(name);
    if (m) { name = m[1]; dynamic = true; if (name === 'innerhtml' || name === 'innerHTML') el.hasDynamicContent = true; }
    // Vue :alt / v-bind:alt
    m = /^(?::|v-bind:)([\w-]+)/.exec(name);
    if (m) { name = m[1]; dynamic = true; }
    if (name.startsWith('i18n')) return;
  }

  // ariaLabel → aria-label (JSX/Angular property style)
  if (/^aria[A-Z]/.test(name)) name = `aria-${name.slice(4).toLowerCase()}`;
  name = name.toLowerCase();
  // Android: android:contentDescription → android:contentdescription
  el.attrs[name] = { value, dynamic };
}

function skipString(source, i, to) {
  const q = source[i];
  let j = i + 1;
  while (j < to) {
    if (source[j] === '\\') { j += 2; continue; }
    if (source[j] === q) return j + 1;
    if (q !== '`' && source[j] === '\n') return j; // unterminated
    if (q === '`' && source[j] === '$' && source[j + 1] === '{') { j = skipBalanced(source, j + 1, to); continue; }
    j++;
  }
  return to;
}

// From an opening `{` return the index just past its matching `}`.
export function skipBalanced(source, i, to = source.length) {
  let depth = 0;
  let j = i;
  while (j < to) {
    const c = source[j];
    if (c === '"' || c === "'" || c === '`') { j = skipString(source, j, to); continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return j + 1; }
    j++;
  }
  return to;
}

export function lineIndex(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, column: offset - starts[lo] + 1 };
  };
}

// Helpers ---------------------------------------------------------------

export function attr(el, name) {
  return el.attrs[name];
}

export function hasAttr(el, name) {
  return Object.prototype.hasOwnProperty.call(el.attrs, name);
}

export function attrValue(el, name) {
  const a = el.attrs[name];
  return a && !a.dynamic ? a.value : undefined;
}

export function children(elements, index) {
  return elements.filter((e) => e.parent === index);
}

export function descendants(elements, index) {
  const el = elements[index];
  return elements.filter((e, i) => i !== index && e.start > el.start && e.start < el.end);
}

export function ancestors(elements, index) {
  const out = [];
  let p = elements[index].parent;
  while (p != null && p !== -1) { out.push(elements[p]); p = elements[p].parent; }
  return out;
}

/**
 * Classify an element's inner content.
 * @returns {'text'|'empty'|'unknown'} text = visible static text present,
 *   unknown = dynamic expressions or components that may render text.
 */
export function innerContentKind(source, elements, index, mode) {
  const el = elements[index];
  if (el.selfClosing || el.innerStart == null) return 'empty';
  if (el.hasDynamicContent) return 'unknown';
  const inner = source.slice(el.innerStart, el.innerEnd);
  const kids = descendants(elements, index);
  // Strip child markup to inspect bare text
  let text = inner;
  for (const k of kids.slice().reverse()) {
    if (k.parent !== index) continue;
    const s = k.start - el.innerStart;
    const e = k.end - el.innerStart;
    text = text.slice(0, s) + ' ' + text.slice(e);
  }
  if (mode === 'jsx' && /\{(?!\s*\/\*)[^}]*\}/.test(text)) return 'unknown';
  if ((mode === 'html' || mode === 'vue') && /\{\{[\s\S]*?\}\}/.test(text)) return 'unknown';
  if (/[^\s]/.test(text.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ''))) return 'text';

  let unknown = false;
  for (const k of kids) {
    if (k.attrs['aria-hidden']?.value === 'true') continue;
    if (k.name === 'img' && (k.attrs.alt?.value || k.attrs.alt?.dynamic)) return 'text';
    if (k.attrs['aria-label'] || k.attrs['aria-labelledby']) return 'text';
    if (k.name === 'svg' || k.name === 'title') {
      if (k.name === 'title') return 'text';
      continue;
    }
    if (k.isComponent && !/icon/i.test(k.rawName)) unknown = true;
    if (k.name === 'slot' || k.name === 'ng-content' || k.name === 'router-outlet') unknown = true;
    if (k.hasDynamicContent) unknown = true;
    if (mode === 'jsx' && k.innerStart != null && /\{[^}]*\}/.test(source.slice(k.innerStart, k.innerEnd))) unknown = true;
    if ((mode === 'html' || mode === 'vue') && k.innerStart != null && /\{\{/.test(source.slice(k.innerStart, k.innerEnd))) unknown = true;
    if (k.innerStart != null && !k.isComponent) {
      const kt = source.slice(k.innerStart, k.innerEnd).replace(/<[^>]*>/g, ' ');
      if (/[^\s]/.test(kt) && k.name !== 'svg') {
        // Material icon ligatures (<mat-icon>search</mat-icon>, <i class="material-icons">)
        // render as glyphs, not readable text.
        if (/icon/i.test(k.rawName) || /icon/i.test(k.attrs.class?.value ?? '')) continue;
        if (!isInsideSvg(elements, k)) return 'text';
      }
    }
  }
  return unknown ? 'unknown' : 'empty';
}

function isInsideSvg(elements, el) {
  let p = el.parent;
  while (p != null && p !== -1) {
    if (elements[p].name === 'svg') return true;
    p = elements[p].parent;
  }
  return false;
}

// Extract regions to scan from a file, with their markup mode.
export function markupRegions(file, source) {
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
  if (ext === '.jsx' || ext === '.tsx') return [{ mode: 'jsx', from: 0, to: source.length }];
  if (ext === '.js' || ext === '.ts' || ext === '.mjs') {
    const regions = [];
    // Angular inline templates: template: `...`
    const re = /template\s*:\s*`/g;
    let m;
    while ((m = re.exec(source))) {
      const start = m.index + m[0].length;
      const end = source.indexOf('`', start);
      if (end !== -1) regions.push({ mode: 'html', from: start, to: end });
    }
    if (regions.length) return regions;
    // Plain .js/.ts with JSX (common in CRA / older React projects)
    if (/return\s*\(\s*</.test(source) || /=>\s*\(?\s*<[A-Za-z]/.test(source)) {
      return [{ mode: 'jsx', from: 0, to: source.length }];
    }
    return [];
  }
  if (ext === '.html' || ext === '.htm' || ext === '.svelte') return [{ mode: 'html', from: 0, to: source.length }];
  if (ext === '.vue') {
    const open = /<template(\s[^>]*)?>/.exec(source);
    if (!open) return [];
    const from = open.index + open[0].length;
    const to = source.lastIndexOf('</template>');
    return [{ mode: 'vue', from, to: to > from ? to : source.length }];
  }
  if (ext === '.xml') return [{ mode: 'xml', from: 0, to: source.length }];
  return [];
}
