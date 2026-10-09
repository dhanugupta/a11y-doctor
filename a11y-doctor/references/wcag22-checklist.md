# WCAG 2.2 Level A + AA — code-level checklist

All 55 Level A and AA success criteria (for AAA, which is opt-in only, see `aaa.md`). 4.1.1 Parsing was removed in WCAG 2.2, so don't
report it. **Auto** says how much tools catch: ✅ mostly, ◐ partly, ✋ manual review needed.
**Look for** says what to search for in code.

Criteria new in 2.2 are marked **NEW**.

## 1. Perceivable

| SC | Lvl | Auto | Look for | Typical fix |
|---|---|---|---|---|
| 1.1.1 Non-text Content | A | ◐ | `<img>`/`Image` without `alt`; icon-only buttons; `<svg>` without `role="img"` + `<title>`/`aria-label`; CSS background images that carry meaning; alt like "image", file names | Informative: describe the purpose. Decorative: `alt=""` / `aria-hidden="true"`. Functional (in a link/button): describe the action. Complex (charts): short alt plus a long description nearby. |
| 1.2.1 Audio/Video-only (Prerecorded) | A | ✋ | `<audio>`, silent `<video>` | Transcript, or text/audio alternative for video-only. |
| 1.2.2 Captions (Prerecorded) | A | ◐ | `<video>` without `<track kind="captions">`; player embeds | Add captions (WebVTT). Auto-generated captions must be corrected. |
| 1.2.3 Audio Description or Media Alternative | A | ✋ | videos with visual-only information | Audio description track or full text alternative. |
| 1.2.4 Captions (Live) | AA | ✋ | live streams | Live captioning. |
| 1.2.5 Audio Description (Prerecorded) | AA | ✋ | videos | Audio description track (or described version). |
| 1.3.1 Info and Relationships | A | ◐ | headings done with styled `<div>`s; lists without `<ul>/<ol>`; data tables without `<th>`/`scope`; inputs without programmatic labels; radio groups without `<fieldset>/<legend>`; required shown only visually | Use semantic elements; `<label for>`; `<fieldset>`; `<th scope>`; `aria-required`/`required`; landmarks (`<header> <nav> <main> <footer>`). |
| 1.3.2 Meaningful Sequence | A | ✋ | CSS `order`, `flex-direction: *-reverse`, absolute positioning, grid placement that differs from DOM order | Make DOM order match reading order. |
| 1.3.3 Sensory Characteristics | A | ✋ | copy like "click the red button", "on the right", "the round icon" | Add text cues: "Select **Submit** (green button)". |
| 1.3.4 Orientation | AA | ◐ | `screen.orientation.lock`, CSS that hides content in one orientation, mobile manifests locking orientation | Support both orientations unless essential. |
| 1.3.5 Identify Input Purpose | AA | ◐ | personal-data inputs (name, email, tel, address, cc) without `autocomplete` | Add the right token: `autocomplete="email"`, `"given-name"`, `"street-address"`, `"one-time-code"`. |
| 1.4.1 Use of Color | A | ◐ | errors shown only by red border; links distinguished only by color inside text; charts with color-only legends | Add icon/text/underline/pattern; links in body text need an underline or 3:1 contrast plus a non-color cue on hover/focus. |
| 1.4.2 Audio Control | A | ◐ | `autoplay` media with sound > 3s | Don't autoplay sound; provide pause/mute. |
| 1.4.3 Contrast (Minimum) | AA | ✅ | text color tokens, placeholder color, disabled-looking but active text, text over images | 4.5:1 normal text; 3:1 large (≥24px, or ≥18.66px bold). |
| 1.4.4 Resize Text | AA | ◐ | `user-scalable=no`, `maximum-scale<2`, fixed heights with `overflow:hidden` on text, `px` font sizes inside fixed boxes | Allow zoom; use rem/em; let containers grow. |
| 1.4.5 Images of Text | AA | ✋ | text baked into PNG/JPG banners | Real text styled with CSS (logos exempt). |
| 1.4.10 Reflow | AA | ✋ | fixed widths > 320px, horizontal scrolling at 400% zoom, `white-space: nowrap` on long content | Responsive layout at 320 CSS px width; only data tables, maps and toolbars may scroll in 2D. |
| 1.4.11 Non-text Contrast | AA | ✋ | input borders, focus rings, icon buttons, checkbox/toggle states, chart lines vs background | 3:1 against adjacent colors for UI components and meaningful graphics. |
| 1.4.12 Text Spacing | AA | ◐ | fixed `height` on text containers, `overflow:hidden`, `line-height` in px on clamped text | Content must survive line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, paragraph spacing 2em. |
| 1.4.13 Content on Hover or Focus | AA | ✋ | tooltips/popovers on `mouseenter`/`focus` | Dismissible with Esc without moving the pointer; hoverable (the pointer can move onto it); stays until dismissed or no longer relevant. |

## 2. Operable

| SC | Lvl | Auto | Look for | Typical fix |
|---|---|---|---|---|
| 2.1.1 Keyboard | A | ◐ | `onClick` / `(click)` / `@click` on `div`/`span`/`li`/`img`; `<a>` without `href`; drag-only, hover-only or double-click-only actions; custom widgets without key handlers | Native `<button>`/`<a href>`; otherwise `role` + `tabindex="0"` + Enter/Space handlers; keyboard alternatives for drag and hover. |
| 2.1.2 No Keyboard Trap | A | ◐ | focus traps in modals with no Esc/close; embedded editors, iframes, video players | Esc closes modals and returns focus; Tab can always leave non-modal widgets. |
| 2.1.4 Character Key Shortcuts | A | ✋ | global `keydown` handlers on single letters (`/`, `j`, `k`, `?`) | Allow turning shortcuts off or remapping them, or only activate them while the component has focus. |
| 2.2.1 Timing Adjustable | A | ◐ | session timeouts, `setTimeout` redirects, auto-dismissing toasts that hold actions | Warn ≥20s before timeout with an option to extend; don't auto-dismiss actionable content. |
| 2.2.2 Pause, Stop, Hide | A | ◐ | carousels, marquees, auto-updating feeds, animations > 5s | Pause/stop control; honor `prefers-reduced-motion`. |
| 2.3.1 Three Flashes | A | ✋ | flashing animations/video | No more than 3 flashes per second. |
| 2.4.1 Bypass Blocks | A | ◐ | no skip link; no `<main>` landmark | "Skip to main content" link as the first focusable element, plus landmarks. |
| 2.4.2 Page Titled | A | ✅ | missing `<title>`; SPA routes not updating `document.title` | Unique, descriptive title per route (Next `metadata`, Angular route `title`, Vue router hook). |
| 2.4.3 Focus Order | A | ◐ | `tabindex` > 0; DOM order differs from visual order; modals opened without moving focus; focus not returned on close | Remove positive tabindex; fix DOM order; manage focus on open/close. |
| 2.4.4 Link Purpose (In Context) | A | ◐ | "click here", "read more", "learn more", icon-only links, repeated identical links to different URLs | Descriptive text, or visually-hidden context / `aria-describedby`. |
| 2.4.5 Multiple Ways | AA | ✋ | sites with only one navigation path | Search, sitemap, or nav plus links (exempt: steps in a process). |
| 2.4.6 Headings and Labels | AA | ✋ | vague headings/labels ("Info", "Field 1"); skipped heading levels (a best practice, not a failure) | Descriptive headings and labels. |
| 2.4.7 Focus Visible | AA | ◐ | `outline: none`/`0` without replacement; `*:focus { outline: none }` resets; focus styles only on `:hover` | `:focus-visible` style with ≥3:1 contrast. |
| 2.4.11 Focus Not Obscured (Minimum) **NEW** | AA | ◐ | `position: sticky/fixed` headers, footers, cookie banners, chat widgets covering focused elements | `scroll-padding-top/bottom` equal to the sticky height; banners must not fully hide focused content. |
| 2.5.1 Pointer Gestures | A | ✋ | pinch, swipe, multi-finger or path-based gestures (carousels, maps, sliders) | Single-pointer alternative (buttons for next/prev, +/- for zoom). |
| 2.5.2 Pointer Cancellation | A | ◐ | actions on `mousedown`/`pointerdown`/`touchstart` | Trigger on `click`/up-event; allow aborting by moving away. |
| 2.5.3 Label in Name | A | ◐ | `aria-label` that differs from the visible text ("Go" button with `aria-label="Submit form"`) | The accessible name contains the visible label text, ideally at the start. |
| 2.5.4 Motion Actuation | A | ✋ | `devicemotion`/`deviceorientation`, shake to undo | UI alternative plus a way to disable motion. |
| 2.5.7 Dragging Movements **NEW** | AA | ✋ | drag-and-drop lists/kanban (dnd-kit, react-beautiful-dnd, CDK DragDrop), range sliders, resizable panes, drag-to-upload | Single-pointer alternative: move up/down buttons, "Move to…" menu, click-to-select then click-to-place, click on slider track, file picker button. |
| 2.5.8 Target Size (Minimum) **NEW** | AA | ✅ | icon buttons < 24×24 CSS px; tightly packed links/chips; close "×" buttons | ≥24×24px target, or enough spacing (a 24px circle centred on the target doesn't overlap others). Inline text links are exempt. |

## 3. Understandable

| SC | Lvl | Auto | Look for | Typical fix |
|---|---|---|---|---|
| 3.1.1 Language of Page | A | ✅ | `<html>` without `lang`; Next `app/layout` missing `lang` | `<html lang="en">` (dynamic per locale). |
| 3.1.2 Language of Parts | AA | ✋ | inline foreign-language phrases, language switchers | `lang="fr"` on the element. Language names in a switcher in their own language get their own `lang`. |
| 3.2.1 On Focus | A | ✋ | `onFocus` that navigates, submits or opens new windows | No context change on focus. |
| 3.2.2 On Input | A | ✋ | `<select onChange={navigate}>`, auto-submit on last OTP digit without warning, radio buttons that reload the page | Explicit submit button, or warn beforehand. |
| 3.2.3 Consistent Navigation | AA | ✋ | nav order differing between layouts/routes | Shared layout component with the same order. |
| 3.2.4 Consistent Identification | AA | ✋ | same function labeled differently ("Search" vs "Find") | Consistent names and icons via shared components. |
| 3.2.6 Consistent Help **NEW** | A | ✋ | help links/chat/contact placed differently across pages | Same relative order on every page (shared layout). |
| 3.3.1 Error Identification | A | ◐ | errors shown only by color; errors not linked to fields; toasts as the only error | Text error next to the field, `aria-invalid="true"`, `aria-describedby` → error id; focus or summarize on submit. |
| 3.3.2 Labels or Instructions | A | ◐ | placeholder-only fields; required/format not stated | Visible persistent label; state format ("DD/MM/YYYY") and required fields. |
| 3.3.3 Error Suggestion | AA | ✋ | "Invalid input" messages | Say how to fix it: "Enter a date like 31/12/2025". |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | ✋ | checkout, transfers, deletions, legal submissions | Reversible, or checked, or a confirmation/review step. |
| 3.3.7 Redundant Entry **NEW** | A | ✋ | multi-step forms asking for the same info twice (shipping vs billing) | Auto-fill, or offer "Same as shipping"; keep entered values when going back. |
| 3.3.8 Accessible Authentication (Minimum) **NEW** | AA | ◐ | paste blocked on password/OTP fields; `autocomplete="off"` on credentials; puzzle CAPTCHAs; "retype the characters" challenges; OTP split into boxes that break paste | Allow paste and password managers (`autocomplete="current-password"`, `"one-time-code"`); offer passkeys, magic links or an alternative to cognitive tests. Object-recognition CAPTCHAs are allowed at AA. |

## 4. Robust

| SC | Lvl | Auto | Look for | Typical fix |
|---|---|---|---|---|
| 4.1.2 Name, Role, Value | A | ◐ | custom controls without role/state (`aria-expanded`, `aria-checked`, `aria-selected`, `aria-pressed`); unnamed buttons/inputs/iframes; invalid ARIA attributes or roles; `aria-hidden` on focusable elements; toggles whose state is only visual | Native elements, or a complete ARIA pattern (`aria-patterns.md`) with state kept in sync. |
| 4.1.3 Status Messages | AA | ◐ | toasts, "saved", result counts, cart updates, form errors appearing without focus moving | `role="status"` (polite) or `role="alert"` (urgent), present in the DOM **before** its content changes. |

## Fast review order for a component

1. Name/role/value of every interactive element (1.1.1, 4.1.2, 2.5.3)
2. Keyboard: reachable, operable, no trap, visible focus, not obscured (2.1.x, 2.4.3, 2.4.7, 2.4.11)
3. Forms: labels, instructions, errors, autocomplete, auth (1.3.1, 1.3.5, 3.3.x)
4. Dynamic behaviour: focus on open/close, status messages, no context change on focus/input (3.2.x, 4.1.3)
5. Visual: contrast, color-only, target size, reflow, text spacing (1.4.x, 2.5.8)
6. Pointer: drag alternatives, gestures, cancellation (2.5.1, 2.5.2, 2.5.7)
