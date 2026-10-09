# Keyboard and focus management

## Principles

1. Everything you can do with a mouse, you can do with a keyboard (2.1.1).
2. Focus order follows reading order (2.4.3): fix the DOM, never use `tabindex` > 0.
3. Focus is always visible (2.4.7) and never fully hidden by sticky UI (2.4.11).
4. Focus never gets stuck (2.1.2), except inside a modal, which Esc closes.
5. When UI appears or disappears, focus moves to a sensible place.

## tabindex

| Value | Use |
|---|---|
| none | Native interactive elements are already focusable |
| `0` | A custom widget that must be in the Tab order (`role="button"` div, scrollable region) |
| `-1` | Programmatic focus targets (headings after navigation, dialog containers, error summary) and roving-tabindex items |
| `> 0` | Never |

Scrollable regions with no focusable children need `tabindex="0"` plus a role and name, so
keyboard users can scroll them.

## Focus management cheat sheet

| Event | Move focus to | Then |
|---|---|---|
| Modal opens | First field, or the least-destructive button, or the dialog (`tabindex=-1`) | Trap Tab; Esc closes |
| Modal closes | The element that opened it (or a logical successor if it was deleted) | — |
| Non-modal popover/menu opens | First item (menus), or keep focus on the trigger (tooltips) | Esc closes and returns focus |
| SPA route change | The new page's `<h1 tabindex="-1">` or the main wrapper | Update `document.title` |
| Item deleted from a list | Next item, previous item, or the list heading | Announce "Item deleted" |
| Inline content expands | Keep focus on the trigger | Content follows the trigger in the DOM |
| Form submit with errors | First invalid field, or the error summary | — |
| Infinite scroll / "Load more" | First newly loaded item | Announce the count |

Remember the trigger before opening something:
`const trigger = document.activeElement as HTMLElement;` … `trigger?.focus()`.

## Making the background inert

While a modal is open, make the rest of the page unreachable:

```js
appRoot.inert = true;    // removes from tab order AND accessibility tree; restore on close
```
`inert` is supported in all modern browsers. `<dialog>.showModal()` does this automatically.

## Skip links (2.4.1)

```html
<a class="skip-link" href="#main">Skip to main content</a>
…
<main id="main" tabindex="-1">…</main>
```
```css
.skip-link { position: absolute; left: -9999px; }
.skip-link:focus { left: 1rem; top: 1rem; z-index: 1000; }
```
It must be the first focusable element and visible when focused. Landmarks (`<header>`,
`<nav>`, `<main>`, `<footer>`) also help screen reader users bypass blocks.

## Focus not obscured (2.4.11, NEW in 2.2)

Sticky headers, footers, cookie banners and chat launchers can fully cover the element
that receives focus when tabbing down a page.

```css
html { scroll-padding-top: var(--header-height); scroll-padding-bottom: var(--footer-height); }
```

- Cookie banners: either take focus and require a choice (modal), or don't overlap content
  (push the content up instead).
- The `--url` runtime audit flags fully obscured focused elements (`keyboard/focus-obscured`).

## Visible focus (2.4.7)

```css
:focus-visible { outline: 2px solid var(--focus-color); outline-offset: 2px; }
/* only remove the ring for mouse users */
:focus:not(:focus-visible) { outline: none; }
```
- Focus color needs ≥3:1 contrast against adjacent colors (aim for the 2.4.13 AAA
  guidance: a ring at least 2px thick).
- Don't rely on a subtle background change alone.
- Windows High Contrast / forced-colors: use `outline` (box-shadow disappears), or add
  `@media (forced-colors: active) { :focus-visible { outline: 2px solid CanvasText; } }`.

## Keyboard handlers for custom controls

```ts
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();      // stop page scroll on Space
    activate();
  }
}
```
Buttons activate on Enter **and** Space (Space on key-up). Links activate on Enter only.
Use `e.key`, not `keyCode`.

## Character key shortcuts (2.1.4)

Single-key shortcuts (`/` to search, `j`/`k` to move) must be either: possible to turn off,
remappable to include a modifier, or active only while the relevant component has focus. Never
fire them while focus is in a text field.

## Pointer (2.5.x)

- Trigger actions on `click` (up event), not on `mousedown`/`pointerdown`/`touchstart` (2.5.2).
- Path-based or multi-touch gestures need single-tap alternatives (2.5.1).
- Dragging needs a non-drag alternative (2.5.7). See `aria-patterns.md`.
