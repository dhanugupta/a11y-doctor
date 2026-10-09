// WAI-ARIA 1.2 (+ common 1.3 / DPUB / Graphics) vocabulary used by the heuristics.

export const ARIA_ATTRIBUTES = new Set([
  'aria-activedescendant', 'aria-atomic', 'aria-autocomplete', 'aria-braillelabel',
  'aria-brailleroledescription', 'aria-busy', 'aria-checked', 'aria-colcount',
  'aria-colindex', 'aria-colindextext', 'aria-colspan', 'aria-controls', 'aria-current',
  'aria-describedby', 'aria-description', 'aria-details', 'aria-disabled', 'aria-dropeffect',
  'aria-errormessage', 'aria-expanded', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
  'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label', 'aria-labelledby',
  'aria-level', 'aria-live', 'aria-modal', 'aria-multiline', 'aria-multiselectable',
  'aria-orientation', 'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
  'aria-readonly', 'aria-relevant', 'aria-required', 'aria-roledescription', 'aria-rowcount',
  'aria-rowindex', 'aria-rowindextext', 'aria-rowspan', 'aria-selected', 'aria-setsize',
  'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext',
]);

export const ARIA_ROLES = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'blockquote', 'button',
  'caption', 'cell', 'checkbox', 'code', 'columnheader', 'combobox', 'comment',
  'complementary', 'contentinfo', 'definition', 'deletion', 'dialog', 'directory',
  'document', 'emphasis', 'feed', 'figure', 'form', 'generic', 'grid', 'gridcell', 'group',
  'heading', 'image', 'img', 'insertion', 'link', 'list', 'listbox', 'listitem', 'log',
  'main', 'mark', 'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'meter', 'navigation', 'none', 'note', 'option', 'paragraph',
  'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
  'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton',
  'status', 'strong', 'subscript', 'suggestion', 'superscript', 'switch', 'tab', 'table',
  'tablist', 'tabpanel', 'term', 'textbox', 'time', 'timer', 'toolbar', 'tooltip', 'tree',
  'treegrid', 'treeitem', 'graphics-document', 'graphics-object', 'graphics-symbol',
]);

export function isValidRole(role) {
  return ARIA_ROLES.has(role) || /^doc-[a-z]+$/.test(role);
}

// Widget roles that must be reachable with the keyboard.
export const FOCUSABLE_WIDGET_ROLES = new Set([
  'button', 'checkbox', 'combobox', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'option', 'radio', 'searchbox', 'slider', 'spinbutton', 'switch', 'tab', 'textbox', 'treeitem',
]);

// Elements that are interactive / focusable without extra attributes.
export function isNativelyInteractive(el) {
  switch (el.name) {
    case 'button': case 'select': case 'textarea': case 'summary': case 'details': case 'iframe':
      return true;
    case 'input':
      return el.attrs.type?.value !== 'hidden';
    case 'a': case 'area':
      return 'href' in el.attrs || 'routerlink' in el.attrs || 'to' in el.attrs;
    case 'audio': case 'video':
      return 'controls' in el.attrs;
    default:
      return 'contenteditable' in el.attrs;
  }
}

export function isFocusable(el) {
  if (isNativelyInteractive(el)) return !('disabled' in el.attrs && !el.attrs.disabled.dynamic);
  const ti = el.attrs.tabindex;
  if (!ti) return false;
  if (ti.dynamic) return true;
  return Number(ti.value) >= 0;
}

// Static, non-interactive HTML elements commonly misused as buttons.
export const STATIC_ELEMENTS = new Set([
  'div', 'span', 'li', 'p', 'section', 'article', 'td', 'tr', 'img', 'i', 'svg', 'label',
  'header', 'footer', 'main', 'aside', 'nav', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'figure', 'strong', 'em', 'b', 'small', 'tbody', 'table', 'dl', 'dt', 'dd',
]);

export const GENERIC_LINK_TEXT = new Set([
  'click here', 'here', 'read more', 'more', 'learn more', 'link', 'this link', 'details',
  'click', 'more info', 'continue', 'go',
]);
