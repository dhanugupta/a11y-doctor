# Tooling setup

Ask before installing anything. Show the command and the config change, then apply them once
the user agrees.

## What each layer catches

| Layer | Tool | Catches | Misses |
|---|---|---|---|
| Editor/CI lint | jsx-a11y, @angular-eslint/template, vuejs-accessibility, react-native-a11y | Static markup mistakes in source, at the exact line | Anything decided at runtime: contrast, computed names, focus |
| Built-in heuristics | `scripts/audit.mjs` | The most common static failures, with zero setup | Same as lint |
| Component tests | jest-axe / vitest-axe + Testing Library | Rendered DOM of each component state | Page-level issues, real CSS (jsdom has no layout, so no contrast) |
| Page tests | @axe-core/playwright, cypress-axe | Real rendering: contrast, target size, landmarks, duplicate ids | Keyboard flow, meaning of text |
| Keyboard walk | `audit.mjs --url` | Tab order, traps, focus obscured, missing focus styles | Whether the order *makes sense* |
| Humans | Keyboard + screen reader | Everything else | — |

## Pin versions

Install a11y tools as `devDependencies` with exact versions (`npm i -D -E …`) and commit the
lockfile. Rule sets change between releases, so unpinned tools make before/after comparisons
meaningless. Each report records the scan scope; note the tool versions (`npm ls axe-core
eslint-plugin-jsx-a11y`) when you hand it to someone.

## ESLint

React / Next.js:
```bash
npm i -D eslint-plugin-jsx-a11y
```
Config: `assets/lint-configs/react.eslint.config.mjs`.

Angular:
```bash
ng add @angular-eslint/schematics   # if ESLint isn't set up yet
```
Then add `...angular.configs.templateAccessibility` for `**/*.html`. Config:
`assets/lint-configs/angular.eslint.config.mjs`.

Vue:
```bash
npm i -D eslint-plugin-vuejs-accessibility
```
Config: `assets/lint-configs/vue.eslint.config.mjs`.

React Native:
```bash
npm i -D eslint-plugin-react-native-a11y
```

Start new rules as `warn` on legacy codebases, then switch them to `error` once the baseline
is clean. Combine this with `audit.mjs --update-baseline` for the parts lint can't baseline.

## axe in tests

```bash
npm i -D jest-axe @types/jest-axe            # Jest
npm i -D vitest-axe                          # Vitest
npm i -D @axe-core/playwright                # Playwright
npm i -D cypress-axe axe-core                # Cypress
```
Templates are in `assets/test-templates/`. Always pass the WCAG 2.2 AA tags:
`['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']`.

Write axe tests for each **state** (closed and open menu, empty and error form), not just
the initial render.

## Quick URL scanners (no test code)

Use these when Playwright isn't set up and you just need a scan of a running page:

```bash
npx @axe-core/cli http://localhost:3000 --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa --exit
npx pa11y http://localhost:3000 --runner axe --standard WCAG2AA       # pa11y 9+; check its Node requirement
npx lighthouse http://localhost:3000 --only-categories=accessibility --view
```
Lighthouse runs a subset of axe and gives a score. Use it for trends, not as a pass/fail gate.
`audit.mjs --url` adds a keyboard walk and a screen reader preview on top of axe.

## Real screen readers in tests

Guidepup drives VoiceOver (macOS) and NVDA (Windows) from Playwright. See `assistive-tech.md`
and `assets/test-templates/voiceover-guidepup.spec.ts`.

## Storybook

```bash
npm i -D @storybook/addon-a11y
```
Add it to `.storybook/main.ts` addons. In `preview.ts`:
```ts
export default { parameters: { a11y: { test: 'error' } } };   // fail story tests on violations (SB 8.5+/9)
```
Run all stories headlessly with `audit.mjs --storybook http://localhost:6006`.

## Runtime audit script

```bash
npm i -D playwright @axe-core/playwright && npx playwright install chromium
node <skill-dir>/scripts/audit.mjs --url http://localhost:3000 --url http://localhost:3000/checkout
```

## CI

`assets/ci/a11y-doctor.yml` runs the static audit on changed files for every PR, and fails
on new serious/critical issues. To add runtime checks, start the app in the workflow and pass
`--url`.

Recommended rollout:
1. Week 1: `audit.mjs --update-baseline` and commit `.a11y-doctor/baseline.json`; CI gate
   `--fail-on critical`.
2. Then `--fail-on serious`, and burn down the baseline (`audit.mjs --no-baseline` shows all).
3. Add axe page tests for critical user journeys: sign-in, search, checkout.

## Browser and OS tools for manual checks

- Chrome DevTools: Accessibility pane (computed name/role), Lighthouse, "Emulate vision
  deficiencies", CSS Overview → contrast.
- axe DevTools / Accessibility Insights for Web (FastPass + tab stops visualization).
- Screen readers: NVDA (Windows, free), JAWS, VoiceOver (macOS/iOS), TalkBack (Android),
  Narrator.
