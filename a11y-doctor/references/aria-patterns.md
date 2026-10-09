# ARIA widget patterns

These follow the WAI-ARIA Authoring Practices Guide (APG). **Rule 1 of ARIA: if a native
element exists, use it.** ARIA changes only what assistive technology is told. It adds no
keyboard behaviour, so you implement every key listed below yourself, or use a library
that does (React Aria, Radix, Headless UI, Angular CDK/Material, Reka UI).

A role without its required states and keyboard support is worse than no role at all.

## Dialog (modal)

Prefer native `<dialog>` + `showModal()`. Otherwise:

```html
<div role="dialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-desc">
  <h2 id="dlg-title">Delete project?</h2>
  <p id="dlg-desc">This permanently deletes 12 files.</p>
  <button type="button">Cancel</button> <button type="button">Delete</button>
</div>
```

| Requirement | Detail |
|---|---|
| Open | Move focus inside: to the first field, the least destructive action, or the dialog itself (`tabindex="-1"`) |
| Tab / Shift+Tab | Cycle within the dialog only (focus trap) |
| Esc | Closes the dialog |
| Close | Return focus to the element that opened it |
| Background | `inert` on the rest of the page (or `aria-hidden="true"` on siblings); page scroll locked |
| Name | `aria-labelledby` the heading; `role="alertdialog"` for urgent confirmations |

## Disclosure (show/hide)

```html
<button type="button" aria-expanded="false" aria-controls="faq-1">Shipping costs</button>
<div id="faq-1" hidden>…</div>
```
Enter/Space toggles; update `aria-expanded` and `hidden` together. `<details><summary>` is
the native alternative.

## Accordion

A set of disclosures whose buttons sit inside headings: `<h3><button aria-expanded …>`.
Optionally ↑/↓/Home/End move between headers.

## Tabs

```html
<div role="tablist" aria-label="Account settings">
  <button role="tab" id="t1" aria-selected="true"  aria-controls="p1" tabindex="0">Profile</button>
  <button role="tab" id="t2" aria-selected="false" aria-controls="p2" tabindex="-1">Security</button>
</div>
<div role="tabpanel" id="p1" aria-labelledby="t1" tabindex="0">…</div>
<div role="tabpanel" id="p2" aria-labelledby="t2" hidden>…</div>
```
- Roving tabindex: only the selected tab has `tabindex="0"`.
- ←/→ move between tabs (↑/↓ if `aria-orientation="vertical"`); Home/End go to first/last.
- Tab moves from the tablist into the panel.
- Use tabs only for switching views in place. Use links for navigation that changes the URL.

## Menu button (action menu)

```html
<button type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="m1">Actions</button>
<ul role="menu" id="m1" aria-label="Actions" hidden>
  <li role="menuitem" tabindex="-1">Rename</li>
  <li role="menuitem" tabindex="-1">Delete</li>
</ul>
```
- Enter/Space/↓ opens and focuses the first item; ↑ opens and focuses the last.
- ↑/↓ move between items; Home/End; typing a letter jumps to the matching item.
- Esc closes and returns focus to the button. Tab closes the menu.
- **Site navigation is not a `role="menu"`.** Use `<nav><ul><li><a>` plus disclosure buttons for
  submenus.

## Combobox / autocomplete

```html
<label for="city">City</label>
<input id="city" role="combobox" aria-autocomplete="list" aria-expanded="true"
       aria-controls="city-list" aria-activedescendant="city-opt-2">
<ul id="city-list" role="listbox">
  <li role="option" id="city-opt-1" aria-selected="false">Paris</li>
  <li role="option" id="city-opt-2" aria-selected="true">Prague</li>
</ul>
```
- Focus stays in the input; ↑/↓ change `aria-activedescendant`; Enter selects; Esc closes,
  then clears.
- Announce the result count via a polite live region ("5 results").
- This is the hardest pattern to get right. Use a library (React Aria `useComboBox`,
  Downshift, MatAutocomplete, Headless UI Combobox) whenever possible.

## Listbox (custom select)

`role="listbox"` + `role="option"` + `aria-selected`. ↑/↓/Home/End move; type-ahead; for
multi-select, `aria-multiselectable="true"` and Space toggles. Prefer native `<select>`.

## Checkbox / switch / toggle button

| Widget | Markup | State |
|---|---|---|
| Checkbox | `<input type="checkbox">` (native) or `role="checkbox"` | `aria-checked="true|false|mixed"`, Space toggles |
| Switch | `<button role="switch" aria-checked="false">Wi-Fi</button>` | Space/Enter toggles; the label must not change with the state |
| Toggle button | `<button aria-pressed="false">Bold</button>` | Keep the label fixed; `aria-pressed` carries the state |

## Tooltip

```html
<button aria-describedby="tip1">Share</button>
<div role="tooltip" id="tip1">Copy a link to this page</div>
```
Show on hover **and** focus. Esc dismisses it without moving focus. The pointer can move onto
it. It contains no interactive content (use a non-modal dialog/popover for that). Never put
the only accessible name of an icon button in a tooltip unless it is wired with
`aria-labelledby`.

## Toast / notification

A persistent live region (`role="status"`, or `role="alert"` for errors) that exists before
messages are inserted. Don't auto-dismiss toasts that contain actions (2.2.1); give them
enough time and a pause on hover/focus. Never move focus to a toast.

## Carousel

Previous/next buttons with names, a pause button if it auto-rotates (2.2.2),
`aria-roledescription="carousel"` on the region and `"slide"` on slides with
"3 of 5"-style labels. No auto-rotation while focus is inside. Swipe needs button
alternatives (2.5.1).

## Disabled vs aria-disabled

`disabled` removes a control from the Tab order and from many screen reader navigation modes.
Users can't discover it or learn *why* it's unavailable. Use `aria-disabled="true"` (and ignore
activation in the handler) when the user should still be able to focus it and hear an explanation
via `aria-describedby`, e.g. a submit button with "Complete all required fields". Never rely on
a greyed-out style alone.

## Tables

- Data tables: `<table>`, `<th scope="col|row">` (or `headers` on `<td>` for complex
  tables), and a name via `<caption>` or `aria-labelledby`. Never use tables for layout.
- Screen readers announce the row/column headers as users move between cells
  (NVDA Ctrl+Alt+arrows, VoiceOver VO+arrows inside the table).

## Avoid double announcements

- Don't set `aria-label` to the same text as the visible content (it's redundant, and it breaks
  label-in-name when the two drift apart).
- Don't add `role` and `aria-*` that a native element or a library primitive already provides
  (`role="button"` on `<button>`).
- One live region per message. Don't announce via `role="alert"` *and* move focus to the same text.
- Loading: set `aria-busy="true"` on the updating region, then announce the final result once
  ("24 results"), so "Loading…" and the result don't overlap.

## Data grid / tree

Only use `role="grid"`/`"treegrid"`/`"tree"` when you implement full 2D arrow-key navigation.
A plain `<table>` with `<th scope>` is accessible by default and preferable for read-only data.
Sortable columns: `aria-sort` on the `<th>`, with the sort control as a `<button>` inside it.

## Drag and drop (2.5.7 Dragging Movements)

Every drag interaction needs a single-pointer, non-drag alternative:
- Sortable lists: "Move up"/"Move down" buttons, or a "Move to…" menu.
- Kanban: a "Move to column" select on each card.
- Sliders: clicking the track, plus arrow keys on the thumb.
- dnd-kit's `KeyboardSensor` covers keyboard use but **not** 2.5.7. You still need a
  click/tap alternative. Announce moves through a live region.
