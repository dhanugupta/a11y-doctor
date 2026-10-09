// Zero-dependency static checks. They run on every file even when the project
// has no a11y lint plugins installed, so they favour precision over recall:
// when something *might* be fine (spread props, components, dynamic content)
// they stay quiet and leave it to ESLint/axe or the agent's review.

import {
  parseMarkup, lineIndex, markupRegions, innerContentKind, ancestors, descendants,
} from './tag-parser.mjs';
import {
  ARIA_ATTRIBUTES, isValidRole, FOCUSABLE_WIDGET_ROLES, isNativelyInteractive, isFocusable,
  STATIC_ELEMENTS, GENERIC_LINK_TEXT,
} from './aria.mjs';
import { makeFinding } from './findings.mjs';

const KEY_EVENTS = ['keydown', 'keyup', 'keypress'];
const TEXT_INPUT_EXCLUDED_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);
const RN_TOUCHABLES = /^(Pressable|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback|TouchableNativeFeedback)$/;

/**
 * @param {string} file   repo-relative path (used in findings)
 * @param {string} source file contents
 * @param {object} [stack] output of detect-stack (optional hints)
 */
export function scanSource(file, source, stack = {}) {
  const findings = [];
  // Lint findings this scan knows to be false positives (by line), e.g. shadcn
  // components whose content arrives through {...props}.
  findings.suppressions = [];
  const loc = lineIndex(source);
  const lines = source.split('\n');
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();

  const add = (rule, at, f) => {
    const { line, column } = loc(at.start ?? at);
    findings.push(makeFinding({
      rule: `heuristic/${rule}`,
      source: 'heuristic',
      file,
      line,
      column,
      snippet: at.openTag ?? lines[line - 1],
      ...f,
    }));
  };

  if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
    scanCss(source, 0, add);
    return findings;
  }
  if (ext === '.vue') {
    const style = /<style[^>]*>([\s\S]*?)<\/style>/g;
    let m;
    while ((m = style.exec(source))) scanCss(m[1], m.index + m[0].indexOf('>') + 1, add);
  }

  const isAndroidLayout = ext === '.xml' && /<(LinearLayout|ConstraintLayout|FrameLayout|RelativeLayout|ImageView|ImageButton|androidx?\.|merge|layout)\b/.test(source);
  if (ext === '.xml' && !isAndroidLayout) return findings;

  const reactNative = stack.reactNative || /from\s+['"]react-native['"]/.test(source);
  const nextImage = /from\s+['"]next\/image['"]/.test(source);

  for (const region of markupRegions(file, source)) {
    const elements = parseMarkup(source, region);
    const suppress = (el, rules, reason) => findings.suppressions.push({ file, line: loc(el.start).line, rules, reason });
    const ctx = { source, elements, mode: region.mode, add, suppress, reactNative, nextImage };
    if (region.mode === 'xml') { checkAndroid(ctx); continue; }
    const labelIndex = buildLabelIndex(elements);
    elements.forEach((el, idx) => {
      if (el.name === '#fragment') return;
      if (reactNative && el.isComponent) { checkReactNative(ctx, el, idx); return; }
      checkImage(ctx, el);
      checkInteractive(ctx, el, idx);
      checkControlName(ctx, el, idx);
      checkFormLabel(ctx, el, idx, labelIndex);
      checkAria(ctx, el);
      checkDocument(ctx, el, idx);
      checkMedia(ctx, el, idx);
      checkAuth(ctx, el);
    });
  }
  return findings;
}

// ---------------------------------------------------------------- images

function checkImage({ add, nextImage }, el) {
  const isImg = el.name === 'img' || (nextImage && el.rawName === 'Image') || (el.name === 'input' && el.attrs.type?.value === 'image');
  if (!isImg || el.hasSpread) return;
  if ('alt' in el.attrs) {
    const alt = el.attrs.alt;
    if (!alt.dynamic && alt.value && /^(image|img|picture|photo|icon|graphic|logo)$|\.(png|jpe?g|gif|svg|webp)$/i.test(alt.value.trim())) {
      add('img-alt-meaningless', el, {
        severity: 'moderate',
        wcag: ['1.1.1'],
        message: `alt="${alt.value}" does not describe the image.`,
        fix: 'Describe the purpose or content (e.g. alt="Company name" for a logo), or use alt="" if purely decorative.',
      });
    }
    return;
  }
  if (el.attrs['aria-label'] || el.attrs['aria-labelledby']) return;
  const role = el.attrs.role?.value;
  if (el.attrs['aria-hidden']?.value === 'true' || role === 'presentation' || role === 'none') {
    add('img-alt', el, {
      severity: 'moderate',
      wcag: ['1.1.1'],
      message: 'Decorative image hidden with ARIA but missing alt="" (screen readers may still announce the file name).',
      fix: 'Add alt="" to decorative images.',
    });
    return;
  }
  add('img-alt', el, {
    severity: 'critical',
    wcag: ['1.1.1'],
    message: `<${el.rawName}> has no alt attribute.`,
    fix: 'Add alt text describing the image\'s purpose, or alt="" if it is decorative. Never guess meaning — ask or leave a TODO if unknown.',
  });
}

// ---------------------------------------------------- keyboard / interaction

function checkInteractive({ add, suppress }, el) {
  if (el.isComponent || el.hasSpread) return;
  const role = el.attrs.role?.value;
  const hasClick = el.events.has('click') || el.events.has('mousedown') || el.events.has('mouseup');
  const hasKey = KEY_EVENTS.some((e) => el.events.has(e));
  const native = isNativelyInteractive(el);

  // <a> without href used as a button
  if (el.name === 'a' && hasClick) {
    const href = el.attrs.href;
    if (!href || (!href.dynamic && /^(#|javascript:|)$/i.test((href.value ?? '').trim()))) {
      add('anchor-as-button', el, {
        severity: 'serious',
        wcag: ['2.1.1', '4.1.2'],
        message: '<a> without a real href is used as a button.',
        fix: 'Use <button type="button"> for actions; keep <a href> for navigation.',
      });
      return;
    }
  }

  // onClick={e => e.stopPropagation()} only stops bubbling (e.g. inside a modal backdrop): not an action
  const clickCode = (el.eventValues?.click ?? '').trim();
  const onlyStops = /^(\(?\s*\w+\s*\)?|\(\s*\w+\s*:\s*[\w.<>]+\s*\))\s*=>\s*\{?\s*(\w+\.(stopPropagation|preventDefault)\(\)\s*;?\s*)+\}?$/.test(clickCode)
    || /^\$event\.stopPropagation\(\)$/.test(clickCode);
  if (!native && hasClick && STATIC_ELEMENTS.has(el.name) && onlyStops && !el.events.has('mousedown') && !el.events.has('mouseup')) {
    suppress(el, ['click-keyboard'], 'handler only stops event propagation');
    return;
  }

  // Full-screen modal backdrops that close on click are a mouse shortcut, fine
  // when the dialog also closes with Escape / a close button.
  const cls = el.attrs.class?.value ?? '';
  const isBackdrop = el.name === 'div' && /\b(fixed|absolute)\b/.test(cls) && /\binset-0\b|\bbackdrop\b|\boverlay\b/.test(cls) && !role;
  if (!native && hasClick && isBackdrop) {
    suppress(el, ['click-keyboard'], 'modal backdrop (reported as heuristic/backdrop-click)');
    add('backdrop-click', el, {
      severity: 'minor',
      wcag: ['2.1.1'],
      message: 'Overlay/backdrop closes on click: verify the dialog also closes with Escape and has a keyboard-reachable close button.',
      fix: 'Keep the click as a mouse convenience; ensure Escape closes it and focus returns to the trigger. Prefer <dialog> + showModal().',
    });
    return;
  }

  if (!native && hasClick && STATIC_ELEMENTS.has(el.name)) {
    const missing = [];
    if (!role || !FOCUSABLE_WIDGET_ROLES.has(role)) missing.push('role');
    if (!('tabindex' in el.attrs)) missing.push('tabindex="0"');
    if (!hasKey) missing.push('Enter/Space key handler');
    if (missing.length) {
      add('click-without-keyboard', el, {
        severity: 'critical',
        wcag: ['2.1.1', '4.1.2'],
        message: `<${el.rawName}> has a click handler but is not keyboard accessible (missing ${missing.join(', ')}).`,
        fix: 'Replace with a native <button type="button"> (preferred). If not possible, add role="button", tabindex="0" and handle Enter and Space.',
      });
    }
    return;
  }

  if (role && FOCUSABLE_WIDGET_ROLES.has(role) && !native && !('tabindex' in el.attrs)) {
    add('interactive-role-not-focusable', el, {
      severity: 'serious',
      wcag: ['2.1.1'],
      message: `Element with role="${role}" is not focusable.`,
      fix: 'Use the native element, or add tabindex="0" (or roving tabindex in composite widgets) plus keyboard handlers.',
    });
  }

  const ti = el.attrs.tabindex;
  if (ti && !ti.dynamic && Number(ti.value) > 0) {
    add('positive-tabindex', el, {
      severity: 'serious',
      wcag: ['2.4.3'],
      message: `tabindex="${ti.value}" overrides the natural focus order.`,
      fix: 'Use tabindex="0" (or remove it) and fix the order in the DOM instead.',
    });
  }

  if ('autofocus' in el.attrs && el.attrs.autofocus.value !== 'false') {
    add('autofocus', el, {
      severity: 'moderate',
      wcag: ['2.4.3', '3.2.1'],
      message: 'autofocus moves focus unexpectedly and can disorient screen reader users.',
      fix: 'Remove autofocus, or move focus programmatically only where expected (e.g. into an opened dialog).',
    });
  }

  if ((el.events.has('mouseover') || el.events.has('mouseenter')) && !el.events.has('focus') && !el.events.has('focusin')) {
    add('mouse-only', el, {
      severity: 'moderate',
      wcag: ['2.1.1', '1.4.13'],
      message: 'Hover behaviour without an equivalent focus handler.',
      fix: 'Mirror onMouseEnter/onMouseLeave with onFocus/onBlur so keyboard users get the same content.',
    });
  }
}

// ------------------------------------------------------- accessible names

function hasNameAttr(el) {
  return ['aria-label', 'aria-labelledby', 'title'].some((a) => {
    const v = el.attrs[a];
    return v && (v.dynamic || (v.value ?? '').trim());
  });
}

const CONTENT_ELEMENTS = /^(a|button|h[1-6])$/;

function checkControlName({ add, suppress, source, elements, mode }, el, idx) {
  if (!el.isComponent && el.hasSpread && CONTENT_ELEMENTS.test(el.name) && innerContentKind(source, elements, idx, mode) === 'empty') {
    // <a {...props} /> in a wrapper component: children come from the caller
    suppress(el, ['control-name', 'heading-content'], 'content passed through {...props}');
  }
  if (el.isComponent || el.hasSpread) return;
  const isButton = el.name === 'button';
  const isLink = el.name === 'a' && ('href' in el.attrs || 'routerlink' in el.attrs);
  const roleButton = el.attrs.role?.value === 'button' || el.attrs.role?.value === 'link';
  if (!isButton && !isLink && !roleButton) return;
  if (hasNameAttr(el)) return;

  const kind = innerContentKind(source, elements, idx, mode);
  if (kind === 'text') {
    if (isLink) checkLinkText({ add, source }, el);
    return;
  }
  if (kind === 'unknown') return;
  add('control-name', el, {
    severity: 'critical',
    wcag: isLink ? ['2.4.4', '4.1.2'] : ['4.1.2'],
    message: `${isLink ? 'Link' : 'Button'} has no accessible name (icon-only or empty).`,
    fix: 'Add visible text, or aria-label="…" describing the action; mark the icon aria-hidden="true".',
  });
}

function checkLinkText({ add, source }, el) {
  const text = source.slice(el.innerStart, el.innerEnd).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (GENERIC_LINK_TEXT.has(text)) {
    add('generic-link-text', el, {
      severity: 'minor',
      wcag: ['2.4.4'],
      message: `Link text "${text}" is not meaningful out of context.`,
      fix: 'Make the text describe the destination (e.g. "Read more about pricing"), or add visually-hidden context.',
    });
  }
}

// -------------------------------------------------------------- forms

function buildLabelIndex(elements) {
  const forValues = new Set();
  for (const el of elements) {
    if (el.name === 'label' && el.attrs.for) forValues.add(String(el.attrs.for.value));
  }
  return { forValues };
}

function checkFormLabel({ add, elements }, el, idx, { forValues }) {
  if (el.isComponent || el.hasSpread) return;
  const isField = (el.name === 'input' && !TEXT_INPUT_EXCLUDED_TYPES.has(el.attrs.type?.value ?? 'text') && !el.attrs.type?.dynamic)
    || el.name === 'select' || el.name === 'textarea';
  if (!isField) return;
  if (hasNameAttr(el)) return;
  if (el.attrs.id && forValues.has(String(el.attrs.id.value))) return;
  const anc = ancestors(elements, idx);
  if (anc.some((a) => a.name === 'label')) return;
  // Angular Material / design-system wrappers that provide the label
  for (const a of anc) {
    if (a.name === 'mat-form-field' && descendants(elements, elements.indexOf(a)).some((d) => d.name === 'mat-label')) return;
    if (a.isComponent && ('label' in a.attrs)) return;
  }
  const placeholder = el.attrs.placeholder ? ' A placeholder is not a label: it disappears on input and often fails contrast.' : '';
  const hasId = !!el.attrs.id;
  add('form-label', el, {
    severity: hasId ? 'serious' : 'critical',
    wcag: ['1.3.1', '3.3.2', '4.1.2'],
    message: `Form field has no associated label${hasId ? ' (no <label for> for this id found in this file)' : ''}.${placeholder}`,
    fix: 'Add a visible <label for="id"> (htmlFor in React), wrap the field in <label>, or use aria-labelledby pointing at visible text.',
  });
}

function checkAuth({ add }, el) {
  if (el.name !== 'input' || el.isComponent) return;
  const type = el.attrs.type?.value;
  if (type !== 'password') return;
  if (el.events.has('paste') || el.events.has('copy')) {
    add('auth-paste-blocked', el, {
      severity: 'serious',
      wcag: ['3.3.8'],
      message: 'Password field handles paste/copy — blocking paste prevents password managers.',
      fix: 'Allow paste into credential fields so users can rely on password managers.',
    });
  }
  if (el.attrs.autocomplete?.value === 'off') {
    add('auth-autocomplete-off', el, {
      severity: 'moderate',
      wcag: ['3.3.8', '1.3.5'],
      message: 'autocomplete="off" on a password field hinders password managers.',
      fix: 'Use autocomplete="current-password" or "new-password".',
    });
  }
}

// --------------------------------------------------------------- ARIA

function checkAria({ add }, el) {
  for (const name of Object.keys(el.attrs)) {
    if (name.startsWith('aria-') && !ARIA_ATTRIBUTES.has(name)) {
      add('invalid-aria-attr', el, {
        severity: 'serious',
        wcag: ['4.1.2'],
        message: `"${name}" is not a valid ARIA attribute.`,
        fix: 'Check spelling against WAI-ARIA 1.2 (e.g. aria-labelledby, aria-describedby).',
      });
    }
  }
  const role = el.attrs.role;
  if (role && !role.dynamic && role.value) {
    for (const r of role.value.trim().split(/\s+/)) {
      if (!isValidRole(r)) {
        add('invalid-role', el, {
          severity: 'serious',
          wcag: ['4.1.2'],
          message: `role="${r}" is not a valid ARIA role.`,
          fix: 'Use a concrete WAI-ARIA role, or prefer the native HTML element.',
        });
      }
    }
    if (/^(dialog|alertdialog)$/.test(role.value.trim()) && !hasNameAttr(el)) {
      add('dialog-name', el, {
        severity: 'serious',
        wcag: ['4.1.2'],
        message: `role="${role.value}" has no accessible name.`,
        fix: 'Add aria-labelledby pointing at the dialog heading (and aria-modal="true" for modal dialogs).',
      });
    }
  }
  if (el.attrs['aria-hidden']?.value === 'true' && !el.isComponent && isFocusable(el)) {
    add('aria-hidden-focusable', el, {
      severity: 'serious',
      wcag: ['4.1.2'],
      message: 'Focusable element is aria-hidden: keyboard users reach something screen readers cannot perceive.',
      fix: 'Remove aria-hidden, or make it unfocusable (tabindex="-1" / inert / disabled).',
    });
  }
}

// ------------------------------------------------------------- document

function checkDocument({ add, suppress, elements }, el, idx) {
  if (el.name === 'html' && !('lang' in el.attrs)) {
    add('html-lang', el, {
      severity: 'serious',
      wcag: ['3.1.1'],
      message: '<html> has no lang attribute.',
      fix: 'Add lang="en" (or the page\'s primary language).',
    });
  }
  if (el.name === 'head' && !descendants(elements, idx).some((d) => d.name === 'title')) {
    const injector = descendants(elements, idx).find((d) => d.isComponent);
    add('page-title', el, injector ? {
      severity: 'moderate',
      wcag: ['2.4.2'],
      message: `<head> gets its contents from <${injector.rawName}>: verify every route sets a descriptive title.`,
      fix: 'Set a title per route (e.g. route head/meta config, Next metadata, Angular route title).',
    } : {
      severity: 'serious',
      wcag: ['2.4.2'],
      message: 'Document <head> has no <title>.',
      fix: 'Add a descriptive <title>, and update it on route changes in SPAs.',
    });
  }
  if (el.name === 'meta' && el.attrs.name?.value === 'viewport') {
    const content = (el.attrs.content?.value ?? '').toLowerCase();
    const max = /maximum-scale\s*=\s*([\d.]+)/.exec(content);
    if (/user-scalable\s*=\s*(no|0)/.test(content) || (max && Number(max[1]) < 2)) {
      add('viewport-zoom', el, {
        severity: 'critical',
        wcag: ['1.4.4'],
        message: 'Viewport meta disables or limits zoom.',
        fix: 'Remove user-scalable=no and maximum-scale (use width=device-width, initial-scale=1).',
      });
    }
  }
  const hiddenFromAt = 'hidden' in el.attrs || el.attrs['aria-hidden']?.value === 'true'
    || /display\s*:\s*['"]?none|visibility\s*:\s*['"]?hidden/.test(el.attrs.style?.value ?? '')
    || ancestors(elements, idx).some((a) => a.name === 'noscript');
  if (el.name === 'iframe' && hiddenFromAt) suppress(el, ['iframe-title'], 'iframe hidden from assistive tech (noscript / display:none)');
  if (el.name === 'iframe' && !el.hasSpread && !hasNameAttr(el) && !hiddenFromAt) {
    add('iframe-title', el, {
      severity: 'serious',
      wcag: ['4.1.2'],
      message: '<iframe> has no title.',
      fix: 'Add title="…" describing the embedded content.',
    });
  }
}

function checkMedia({ add, elements }, el, idx) {
  if (el.name !== 'video' && el.name !== 'audio') return;
  if (el.name === 'video' && !el.hasSpread && !('muted' in el.attrs)) {
    const tracks = descendants(elements, idx).filter((d) => d.name === 'track');
    if (!tracks.some((t) => /captions|subtitles/.test(t.attrs.kind?.value ?? '') || t.attrs.kind?.dynamic)) {
      add('media-captions', el, {
        severity: 'serious',
        wcag: ['1.2.2'],
        message: '<video> has no captions track.',
        fix: 'Add <track kind="captions" src="…vtt" srclang="en" label="English">.',
      });
    }
  }
  if ('autoplay' in el.attrs && !('muted' in el.attrs)) {
    add('media-autoplay', el, {
      severity: 'moderate',
      wcag: ['1.4.2', '2.2.2'],
      message: 'Media autoplays with sound.',
      fix: 'Do not autoplay audio; if autoplay is required, mute it and provide pause/stop controls.',
    });
  }
}

// ------------------------------------------------------------------ CSS

function scanCss(css, offset, add) {
  // Strip comments while keeping offsets stable
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const block = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = block.exec(clean))) {
    const selector = m[1].trim();
    const body = m[2];
    if (!/(^|[;\s])outline(-style)?\s*:\s*(none|0)(px)?\s*(!important)?\s*(;|$)/.test(body)) continue;
    if (/:not\(:focus-visible\)/.test(selector)) continue;
    if (/(box-shadow|border(-color)?|outline-offset|text-decoration|background(-color)?)\s*:/.test(body) && /:focus/.test(selector)) continue;
    const global = /(^|,|\s)(\*|a|button|input|select|textarea|\[tabindex[^\]]*\])(\s*,|\s*$|:)/.test(selector) || /:focus/.test(selector);
    add('focus-outline-removed', { start: offset + m.index + (m[0].length - m[0].trimStart().length), openTag: `${selector} { ${body.trim()} }` }, {
      severity: global ? 'serious' : 'moderate',
      wcag: ['2.4.7'],
      message: `"${selector}" removes the focus outline${global ? '' : ' (verify a visible :focus-visible style replaces it)'}.`,
      fix: 'Keep a visible focus indicator: use :focus-visible { outline: 2px solid <color>; outline-offset: 2px } with ≥3:1 contrast.',
    });
  }
}

// ------------------------------------------------------- native: RN / Android

function checkReactNative({ add, elements, source }, el, idx) {
  if (!RN_TOUCHABLES.test(el.rawName) || el.hasSpread) return;
  const a = el.attrs;
  if (a.accessible?.value === 'false') return;
  const named = a.accessibilitylabel || a['aria-label'] || a['aria-labelledby'] || a.accessibilitylabelledby;
  if (!named) {
    const kids = descendants(elements, idx);
    const hasText = kids.some((k) => k.rawName === 'Text' || k.attrs.accessibilitylabel || k.attrs['aria-label']);
    const onlyVisual = kids.length > 0 && kids.every((k) => /^(View|Image|ImageBackground|Svg|Path|.*Icon.*)$/.test(k.rawName));
    const inlineText = el.innerStart != null && /[A-Za-z]/.test(source.slice(el.innerStart, el.innerEnd).replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, ''));
    if (!hasText && (onlyVisual || (kids.length === 0 && !inlineText))) {
      add('rn-touchable-name', el, {
        severity: 'critical',
        wcag: ['4.1.2', '1.1.1'],
        message: `<${el.rawName}> has no accessible name (icon/image only).`,
        fix: 'Add accessibilityLabel="…" (or aria-label) describing the action.',
      });
    }
  }
  // <Link asChild><Pressable/></Link> (expo-router): the Link supplies the link role
  const parent = elements[el.parent];
  const roleFromParent = parent && /(^|\.)Link$/.test(parent.rawName) && 'aschild' in parent.attrs;
  if (!a.accessibilityrole && !a.role && !roleFromParent) {
    add('rn-touchable-role', el, {
      severity: 'moderate',
      wcag: ['4.1.2'],
      message: `<${el.rawName}> has no accessibilityRole, so screen readers won't announce it as a button.`,
      fix: 'Add accessibilityRole="button" (or role="button"; "link" for navigation).',
    });
  }
}

function checkAndroid({ add, elements }) {
  for (const el of elements) {
    if (!/^(ImageView|ImageButton|FloatingActionButton|com\.google\.android\.material\.floatingactionbutton\.FloatingActionButton|androidx\.appcompat\.widget\.AppCompatImageView|androidx\.appcompat\.widget\.AppCompatImageButton)$/.test(el.rawName)) continue;
    const a = el.attrs;
    if (a['android:contentdescription'] || a['tools:ignore']?.value?.includes('ContentDescription')) continue;
    if (/^no/.test(a['android:importantforaccessibility']?.value ?? '')) continue;
    const isButton = /Button/.test(el.rawName);
    add('android-content-description', el, {
      severity: isButton ? 'critical' : 'serious',
      wcag: isButton ? ['4.1.2', '1.1.1'] : ['1.1.1'],
      message: `<${el.rawName}> has no android:contentDescription.`,
      fix: isButton
        ? 'Add android:contentDescription="@string/…" describing the action.'
        : 'Add android:contentDescription, or android:importantForAccessibility="no" if decorative.',
    });
  }
}
