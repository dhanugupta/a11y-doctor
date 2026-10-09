// eslint.config.mjs: Angular accessibility linting (angular-eslint, flat config)
//   ng add @angular-eslint/schematics   (or: npm i -D angular-eslint typescript-eslint eslint)
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    // Lint inline `template:` strings with the HTML rules below
    processor: angular.processInlineTemplates,
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility, // alt-text, label-has-associated-control, interactive-supports-focus, valid-aria, …
    ],
    rules: {
      // Teach the label rule about custom form controls
      '@angular-eslint/template/label-has-associated-control': ['error', {
        controlComponents: ['mat-select', 'mat-slide-toggle', 'p-dropdown'],
      }],
    },
  },
);
