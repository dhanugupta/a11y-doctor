# Visual design: contrast, size, reflow, motion

## Contrast

| What | Ratio | SC |
|---|---|---|
| Body text (< 24px regular, < 18.66px bold) | **4.5:1** | 1.4.3 |
| Large text (≥ 24px, or ≥ 18.66px bold) | **3:1** | 1.4.3 |
| UI component boundaries (input borders, toggle tracks), focus indicators, meaningful icons and chart elements | **3:1** against adjacent colors | 1.4.11 |
| Disabled controls, logos, decorative graphics | exempt | — |
| Placeholder text | 4.5:1 (it's text) | 1.4.3 |

Fix contrast at the **design token** level (`--color-text-muted`, `$gray-500`, theme palette)
so one change fixes every usage. Check both light and dark themes, and all hover, focus,
active and error states. Text over images needs a solid or gradient scrim.

Relative luminance formula (for quick checks in code):
`L = 0.2126 R + 0.7152 G + 0.0722 B` (linearized sRGB); ratio = `(L1 + 0.05) / (L2 + 0.05)`.
axe's `color-contrast` rule (runtime `--url` scan) computes this on the rendered page.

When changing a brand color would alter the design, propose the nearest passing shade and ask
before applying it.

## Use of color (1.4.1)

- Errors: text plus an icon, not only a red border.
- Links in paragraphs: underline them (or provide ≥3:1 contrast with the surrounding text
  plus an underline on hover/focus).
- Charts: add patterns, direct labels or shapes in addition to color. Status chips: include a text label.

## Target size (2.5.8, NEW in 2.2)

Pointer targets must be at least **24×24 CSS px**, unless spacing ensures a 24px-diameter
circle centred on each target doesn't intersect another target or circle. Exempt: inline links
in sentences, targets whose size the browser controls, and cases where an equivalent larger
control exists.

```css
.icon-button { min-width: 24px; min-height: 24px; }      /* AA minimum */
.icon-button { min-width: 44px; min-height: 44px; }      /* comfortable / AAA 2.5.5 / mobile */
```
You can grow the hit area without changing visuals: padding, or a `::before` pseudo-element
with `inset: -8px`. Use 44–48px on touch-first UIs (Apple HIG 44pt, Material 48dp).

## Reflow (1.4.10) and resize (1.4.4)

- Content must work at **320 CSS px** wide (1280px at 400% zoom) with no horizontal scrolling,
  except for 2D content: data tables, maps, diagrams, toolbars.
- Never disable zoom: no `user-scalable=no` and no `maximum-scale` below 2.
- Use `rem` for font sizes and avoid fixed `height` on containers holding text. Use
  `min-height`.
- Check that sticky headers don't take up most of the viewport when zoomed. Make them
  non-sticky at small heights:
  `@media (max-height: 500px) { header { position: static; } }`.

## Text spacing (1.4.12)

Content must survive user stylesheets applying line-height 1.5, paragraph spacing 2em,
letter-spacing 0.12em and word-spacing 0.16em. Avoid fixed heights with `overflow: hidden`
on text, and avoid clamping that hides content without a way to expand it.

## Orientation (1.3.4)

Don't lock portrait or landscape orientation, and don't show "rotate your device" messages,
unless the orientation is essential (a piano app, a cheque deposit).

## Motion and flashing

- 2.3.1: nothing flashes more than 3 times per second.
- 2.2.2: anything that moves, blinks or auto-updates for more than 5s needs pause/stop/hide.
- Honor reduced motion (2.3.3 is AAA, but it's cheap and expected):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

## Forced colors / Windows Contrast themes

Under `forced-colors: active`, the browser replaces author colors with the user's palette.
Backgrounds and box-shadows disappear.
- Don't convey meaning only with background images, background colors or box-shadow (focus
  rings, selected tabs, toggle states). Use borders, outlines, text or icons.
- SVG icons: `fill: currentColor` so they follow the text color.
- When you must adjust: `@media (forced-colors: active) { .tab[aria-selected="true"] { border-bottom: 3px solid Highlight; } }`
  with system colors (`Canvas`, `CanvasText`, `LinkText`, `Highlight`, `ButtonText`).
- Test with DevTools → Rendering → Emulate `forced-colors: active`, or a Windows Contrast theme.

## Direction and language

- Right-to-left languages: set `dir="rtl"` (with `lang`) on `<html>` or the container. Use
  logical CSS properties (`margin-inline-start`, `inset-inline-end`) so layout and reading order flip correctly.
- Mixed-language phrases: `lang` on the element (3.1.2).

## Third-party embeds

Chat widgets, video players, maps, payment iframes and cookie banners are part of your page's
conformance. Check them with the same keyboard and screen reader passes. Configure their
accessibility options (titles, labels), and provide an alternative path (e.g. contact form
instead of chat) when they fail. Record unfixable vendor issues in the report.

## Hidden content

| Goal | Technique |
|---|---|
| Hidden from everyone | `hidden` attribute, `display:none`, or unmount |
| Visible, but hidden from screen readers (decorative) | `aria-hidden="true"` (never on focusable elements) |
| Hidden visually, read by screen readers | `.sr-only` / `.visually-hidden` / `.cdk-visually-hidden` |
| Inactive region (behind a modal, offscreen drawer) | `inert` |

```css
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
```

## Content on hover or focus (1.4.13)

Tooltips, popovers and mega-menus shown on hover or focus must be **dismissible** (Esc,
without moving the pointer or focus), **hoverable** (the pointer can move onto them without
them closing), and **persistent** (they stay until dismissed or no longer relevant).
