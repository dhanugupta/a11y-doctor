# Vue and Nuxt accessibility patterns

## Template basics

| Issue | ❌ | ✅ |
|---|---|---|
| Click on non-interactive | `<div @click="open">` | `<button type="button" @click="open">` |
| Label | `<input v-model="q" placeholder="Search">` | `<label :for="id">Search</label><input :id="id" v-model="q">`, with `const id = useId()` (Vue 3.5+) |
| Boolean ARIA | `:aria-expanded="open || undefined"` | `:aria-expanded="open"` (Vue renders `"true"`/`"false"` for `aria-*`) |
| Icon button | `<button @click="close"><XIcon/></button>` | `<button aria-label="Close" @click="close"><XIcon aria-hidden="true"/></button>` |
| Attribute fall-through | a wrapper component swallows `aria-*` on its root `<div>` | `defineOptions({ inheritAttrs: false })` + `v-bind="$attrs"` on the real `<input>`/`<button>` |
| `v-html` content | headings/links without structure | sanitize, and keep heading levels and alt text in the CMS content |

## Components

- Forward `$attrs` to the focusable element, and `expose` a `focus()` method so parents can
  manage focus.
- Accept `label` as a required prop for icon-only buttons.
- In `<Teleport to="body">` modals, make the rest of the app `inert` while open, and restore
  focus to the trigger on close.

## Focus and routing

```ts
// One <main id="main" tabindex="-1"> in App.vue (the skip-link target), not one per view.
let first = true;
router.afterEach((to) => {
  document.title = `${to.meta.title ?? 'Page'} | Acme`;
  if (first) { first = false; return; }            // don't steal focus on initial load
  nextTick(() => document.getElementById('main')?.focus());
});
```

Nuxt: set `useHead({ title })` per page, and `htmlAttrs: { lang }` in `app.head` or
`nuxt.config`. Nuxt includes `<NuxtRouteAnnouncer>` (3.12+). Add it to `app.vue`.

## Live regions

Render a persistent `<div aria-live="polite" class="sr-only">{{ message }}</div>` in the layout
and update `message`. Use `role="alert"` only for urgent errors.

## Libraries

Headless UI (Vue), Radix Vue / Reka UI, PrimeVue and Vuetify implement ARIA patterns. Fix
issues through their props (`aria-label`, `label`) rather than DOM overrides.

## Lint and tests

- `eslint-plugin-vuejs-accessibility` (`assets/lint-configs/vue.eslint.config.mjs`).
- `@testing-library/vue` role queries; `vitest-axe` / `jest-axe` on mounted components;
  Playwright + axe for pages.
