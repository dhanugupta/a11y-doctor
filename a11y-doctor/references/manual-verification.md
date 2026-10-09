# Manual verification scripts

Agents can't reliably operate screen readers. Produce these checklists **filled in for the
specific components you changed** (expected tab stops, expected announcements), and hand them
to the developer.

## Keyboard walk-through (5 minutes per page)

Put the mouse away. Starting from the address bar:

1. **Tab** through the page. Each stop should:
   - [ ] show a clearly visible focus indicator
   - [ ] be fully visible, not hidden under sticky headers, footers or banners
   - [ ] follow the visual reading order
   - [ ] be something interactive: no stops on non-interactive wrappers, no invisible stops
2. **Skip link**: the first Tab shows "Skip to main content", and Enter jumps to `<main>`.
3. **Operate** every control:
   - Enter activates links and buttons; Space activates buttons, checkboxes and switches
   - arrow keys work in tabs, menus, radio groups, sliders, listboxes and grids
   - Esc closes dialogs, menus and tooltips
4. **Dialogs**: focus moves in when one opens, Tab stays inside, Esc closes it, and focus
   returns to the trigger.
5. **Dynamic changes**: after deleting, filtering or loading, focus isn't lost (it hasn't
   jumped back to `<body>`).
6. **No traps**: you can always Tab out of embedded content (video, maps, editors, iframes).
7. **Zoom to 200% and 400%** (Ctrl/Cmd +): nothing is cut off, and there's no horizontal scroll
   at 400% (320px wide).

Template to fill in:

| # | Expected focus | Expected key behaviour | ✓ |
|---|---|---|---|
| 1 | "Skip to main content" | Enter → focus on `<main>` | |
| 2 | Logo link "Acme home" | Enter → home | |
| … | | | |

## Screen reader smoke test

Run the keyboard walk-through first. Then:

1. Generate the script: `audit.mjs --url <page>` writes `.a11y-doctor/sr-script.md`, with the
   expected headings, landmarks, form controls and the announcement at every Tab stop. For
   code-only reviews, write the same table by hand using the accessible-name order in
   `screen-readers.md`.
2. Run it with **VoiceOver + Safari** and **NVDA + Firefox/Chrome** at minimum. Commands,
   setup gotchas (Safari's Tab setting, NVDA browse/focus mode) are in `screen-readers.md`;
   mobile gestures are in `assistive-tech.md`.
3. Capture what you actually hear with NVDA Speech Viewer, the VoiceOver Caption Panel, or
   TalkBack's "Display speech output".

For each changed component, verify that:

- [ ] its **name** matches the visible label ("Delete invoice, button", not just "button")
- [ ] its **role** is right (button, link, checkbox, tab, dialog, …)
- [ ] its **state** is announced and updates (expanded/collapsed, checked, selected, pressed,
  invalid, required)
- [ ] **descriptions** (hints, errors via `aria-describedby`) are read after the name
- [ ] **headings** form a sensible outline (Rotor / NVDA+F7), with one `h1` per page
- [ ] **images** are announced with meaningful alt text, and decorative ones are skipped
- [ ] **form errors** are announced when they appear, or when the field is focused
- [ ] **status messages** (saved, N results, added to cart) are announced without moving focus
- [ ] **dialogs** announce their title on open, keep the screen reader inside, and return focus
  on close
- [ ] **custom widgets** work with screen reader keys too (VO+Space; NVDA switches to focus
  mode so arrow keys reach the widget)
- [ ] **route changes** in SPAs announce the new page
- [ ] **voice control**: saying "Click <visible label>" activates the control (2.5.3)

### Reporting a screen reader finding

```markdown
### <Short description>
- Severity: critical / serious / moderate / minor
- Found with: <screen reader + version> + <browser + version> + <OS> | keyboard | axe
- Steps: 1. Go to … 2. Tab to … 3. Press …
- Expected announcement: "Promo code, button, collapsed"
- Heard: "button"
- WCAG: 4.1.2 Name, Role, Value (A)
- Fix: <concrete code change>
```

## Mobile

Full gestures (rotor, scrub, reading controls) are in `assistive-tech.md`.

- iOS VoiceOver: Settings → Accessibility → VoiceOver (or triple-click the side button).
  Swipe right/left moves between items; double-tap activates.
- Android TalkBack: volume up+down for 3s. Swipe right/left; double-tap activates.
- Check: every control is reachable by swiping, named, its role is announced, there are no
  unlabeled images or buttons, the order is logical, and touch targets are ≥ 44pt/48dp.
- Increase text size to the maximum (Dynamic Type / Font size): nothing is cut off or
  overlapping.
