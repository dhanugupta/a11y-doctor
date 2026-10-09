// eslint.config.mjs: React / Next.js accessibility linting (ESLint 9 flat config)
//   npm i -D eslint eslint-plugin-jsx-a11y typescript-eslint
// Merge the jsx-a11y entry into the project's existing config rather than replacing it.
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  jsxA11y.flatConfigs.recommended, // or jsxA11y.flatConfigs.strict
  {
    files: ['**/*.{jsx,tsx}'],
    settings: {
      // Teach jsx-a11y which design-system components render which DOM elements
      'jsx-a11y': {
        polymorphicPropName: 'as',
        components: {
          Button: 'button',
          IconButton: 'button',
          Link: 'a',
          Image: 'img',
          Input: 'input',
        },
      },
    },
    rules: {
      // Legacy codebases: start as warnings, then promote to errors once the baseline is clean
      // 'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],
    },
  },
];
