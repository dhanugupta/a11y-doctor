// WCAG criteria and default severity for a11y lint rules, so ESLint results land
// on the same scale as axe and the heuristics. Keys are rule names without the
// plugin prefix; the same name is shared across jsx-a11y, vuejs-accessibility
// and @angular-eslint/template where the rules are equivalent.
const RULES = {
  'alt-text': { wcag: ['1.1.1'], severity: 'critical' },
  'img-redundant-alt': { wcag: ['1.1.1'], severity: 'minor' },
  'anchor-has-content': { wcag: ['2.4.4', '4.1.2'], severity: 'critical' },
  'anchor-is-valid': { wcag: ['2.1.1', '4.1.2'], severity: 'serious' },
  'anchor-ambiguous-text': { wcag: ['2.4.4'], severity: 'minor' },
  'aria-activedescendant-has-tabindex': { wcag: ['2.1.1'], severity: 'serious' },
  'aria-props': { wcag: ['4.1.2'], severity: 'serious' },
  'aria-proptypes': { wcag: ['4.1.2'], severity: 'serious' },
  'aria-role': { wcag: ['4.1.2'], severity: 'serious' },
  'aria-unsupported-elements': { wcag: ['4.1.2'], severity: 'serious' },
  'valid-aria': { wcag: ['4.1.2'], severity: 'serious' },
  'autocomplete-valid': { wcag: ['1.3.5'], severity: 'serious' },
  'click-events-have-key-events': { wcag: ['2.1.1'], severity: 'critical' },
  'control-has-associated-label': { wcag: ['4.1.2'], severity: 'critical' },
  'elements-content': { wcag: ['4.1.2'], severity: 'critical' },
  'heading-has-content': { wcag: ['1.3.1', '2.4.6'], severity: 'serious' },
  'html-has-lang': { wcag: ['3.1.1'], severity: 'serious' },
  'iframe-has-title': { wcag: ['4.1.2'], severity: 'serious' },
  'interactive-supports-focus': { wcag: ['2.1.1'], severity: 'serious' },
  'label-has-associated-control': { wcag: ['1.3.1', '3.3.2', '4.1.2'], severity: 'critical' },
  'label-has-for': { wcag: ['1.3.1', '3.3.2'], severity: 'critical' },
  'form-control-has-label': { wcag: ['1.3.1', '3.3.2', '4.1.2'], severity: 'critical' },
  'lang': { wcag: ['3.1.1'], severity: 'serious' },
  'media-has-caption': { wcag: ['1.2.2'], severity: 'serious' },
  'mouse-events-have-key-events': { wcag: ['2.1.1'], severity: 'moderate' },
  'no-access-key': { wcag: ['2.1.4'], severity: 'minor' },
  'no-aria-hidden-on-focusable': { wcag: ['4.1.2'], severity: 'serious' },
  'no-autofocus': { wcag: ['2.4.3', '3.2.1'], severity: 'moderate' },
  'no-distracting-elements': { wcag: ['2.2.2'], severity: 'serious' },
  'no-interactive-element-to-noninteractive-role': { wcag: ['4.1.2'], severity: 'serious' },
  'no-noninteractive-element-interactions': { wcag: ['2.1.1', '4.1.2'], severity: 'serious' },
  'no-noninteractive-element-to-interactive-role': { wcag: ['4.1.2'], severity: 'serious' },
  'no-noninteractive-tabindex': { wcag: ['2.4.3'], severity: 'moderate' },
  'no-redundant-roles': { wcag: ['4.1.2'], severity: 'minor' },
  'no-static-element-interactions': { wcag: ['2.1.1', '4.1.2'], severity: 'serious' },
  'prefer-tag-over-role': { wcag: ['4.1.2'], severity: 'minor' },
  'role-has-required-aria-props': { wcag: ['4.1.2'], severity: 'serious' },
  'role-has-required-aria': { wcag: ['4.1.2'], severity: 'serious' },
  'role-supports-aria-props': { wcag: ['4.1.2'], severity: 'serious' },
  'role-supports-aria': { wcag: ['4.1.2'], severity: 'serious' },
  'scope': { wcag: ['1.3.1'], severity: 'moderate' },
  'table-scope': { wcag: ['1.3.1'], severity: 'moderate' },
  'tabindex-no-positive': { wcag: ['2.4.3'], severity: 'serious' },
  'no-positive-tabindex': { wcag: ['2.4.3'], severity: 'serious' },
  'valid-tabindex': { wcag: ['2.4.3'], severity: 'serious' },
  'no-onchange': { wcag: ['3.2.2'], severity: 'moderate' },
  // eslint-plugin-react-native-a11y
  'has-accessibility-hint': { wcag: ['4.1.2'], severity: 'minor' },
  'has-accessibility-props': { wcag: ['4.1.2'], severity: 'serious' },
  'has-valid-accessibility-actions': { wcag: ['4.1.2'], severity: 'serious' },
  'has-valid-accessibility-role': { wcag: ['4.1.2'], severity: 'serious' },
  'has-valid-accessibility-state': { wcag: ['4.1.2'], severity: 'serious' },
  'has-valid-accessibility-states': { wcag: ['4.1.2'], severity: 'serious' },
  'has-valid-accessibility-component-type': { wcag: ['4.1.2'], severity: 'serious' },
  'has-valid-accessibility-traits': { wcag: ['4.1.2'], severity: 'serious' },
  'has-valid-accessibility-value': { wcag: ['4.1.2'], severity: 'serious' },
  'has-valid-accessibility-descriptors': { wcag: ['4.1.2'], severity: 'serious' },
  'has-valid-accessibility-ignores-invert-colors': { wcag: ['1.1.1'], severity: 'minor' },
  'has-valid-accessibility-live-region': { wcag: ['4.1.3'], severity: 'moderate' },
  'has-valid-important-for-accessibility': { wcag: ['4.1.2'], severity: 'moderate' },
  'no-nested-touchables': { wcag: ['4.1.2'], severity: 'serious' },
};

export function classifyLintRule(ruleId) {
  const short = ruleId.split('/').pop();
  return RULES[short] ?? { wcag: [], severity: 'moderate' };
}

// Angular accessibility rule names (used when the plugin has no "accessibility" config)
export const ANGULAR_A11Y_RULES = [
  'alt-text', 'elements-content', 'label-has-associated-control', 'table-scope', 'valid-aria',
  'click-events-have-key-events', 'mouse-events-have-key-events', 'no-autofocus',
  'no-distracting-elements', 'interactive-supports-focus', 'role-has-required-aria',
  'no-positive-tabindex',
];
