# Screen readers: core (VoiceOver macOS, NVDA, voice control)

Agents can't listen to a screen reader, but they can **predict what must be announced** and
hand the developer an exact script. Mobile screen readers (VoiceOver iOS, TalkBack, VoiceView),
JAWS, Narrator, OS display settings, Electron apps and automated screen reader tests
(Guidepup) are in `assistive-tech.md`.

## Workflow

1. **Keyboard first.** Fix Tab order, focus visibility and operability before opening a
   screen reader (`manual-verification.md`).
2. **Generate the expected announcements.** `audit.mjs --url …` writes
   `.a11y-doctor/sr-script.md`, built from the browser's accessibility tree: headings,
   landmarks, form controls, and the name/role/state at each Tab stop. Without a running app,
   derive them from code with the accessible-name order below.
3. **Test with at least two screen readers on different engines.** VoiceOver + Safari and
   NVDA + Firefox/Chrome cover the two most different behaviours. Add TalkBack + Chrome and
   VoiceOver on iOS for mobile-heavy products, and JAWS + Chrome for enterprise users.
4. **Record expected vs heard** for each step, using NVDA Speech Viewer or VoiceOver Caption
   Panel to copy the exact text.

## What every screen reader must convey

For each control: **name**, **role**, **state** (expanded/collapsed, checked, selected,
pressed, disabled, invalid, required), **value** (fields, sliders), **description**
(`aria-describedby`: hints and errors), and **position** for sets ("tab, 2 of 4", "list, 5 items").
After an action, either **focus moves** to the new content or a **live region speaks** the
result. Silence after "Save" is a failure.

Word order and wording vary between screen readers. VoiceOver usually says "Save, button";
NVDA usually says "Save button" (and in browse mode may say the role first for links). Don't
fail a test on wording. Fail it when a part is **missing or wrong**.

### Accessible name computation (simplified accname 1.2)

The first one that applies wins:

1. `aria-labelledby` → the text of the referenced elements, in order
2. `aria-label`
3. Native labelling: `<label for>` / wrapping `<label>`, `alt`, `<caption>`, `<legend>`, `<figcaption>`, `<title>` in SVG
4. Content: the text of buttons, links, headings, cells and options (including the alt of child images)
5. `title`; then `placeholder`, which is a poor fallback that some screen readers skip

`aria-describedby` / `aria-description` add a *description*, which is read after the name and
role, often after a pause.

## VoiceOver: macOS

| Task | Keys (VO = Control+Option, or Caps Lock if enabled) |
|---|---|
| Turn on/off | **Cmd+F5** (or hold Cmd and triple-press Touch ID) |
| Next / previous item | VO+→ / VO+← |
| Activate | VO+Space |
| Read from here / read all | VO+A |
| Stop speaking | Control |
| **Rotor** (headings, links, form controls, landmarks, tables) | **VO+U**, then ←/→ to switch list, ↑/↓ to pick, type to filter, Enter to go |
| Next heading / link / form control / table | VO+Cmd+H / VO+Cmd+L / VO+Cmd+J / VO+Cmd+T |
| Enter / leave a group (web area, table, scroll area) | **VO+Shift+↓** / VO+Shift+↑ |
| Describe the item in the VoiceOver cursor | VO+F3 |
| Quick Nav (arrows alone navigate; single-key H/L/J like NVDA when single-key Quick Nav is on) | press ← and → together |
| Verbosity settings | VO+V |
| Screen Curtain (test without looking) | VO+Shift+Fn+_ |
| Open VoiceOver Utility | VO+F8 |

**Setup tips:**
- **Use Safari.** VoiceOver is developed against WebKit; Chrome works, but bugs differ.
- **Safari Tab gotcha:** by default, Tab only moves between form controls in Safari. Turn on
  Safari → Settings → Advanced → **"Press Tab to highlight each item on a webpage"** (or use
  Option+Tab), and System Settings → Keyboard → **Keyboard navigation**. Otherwise you'll
  report false keyboard bugs.
- **Caption Panel:** VoiceOver Utility → Visuals → *Show caption panel*. It shows the spoken
  text on screen, which you can screenshot as evidence.
- The VoiceOver cursor and keyboard focus can diverge. Test both Tab navigation and VO+arrow
  navigation. Utility → Navigation controls whether they follow each other.
- Hints ("To click this button, press Control-Option-Space") come after a delay and are
  normal. Don't put instructions in `aria-label`.

**macOS-specific things to check:**
- Custom widgets: does VO+Space activate them? It sends a click, so `click` handlers must work
  without key events.
- Live regions: VoiceOver can drop polite announcements that fire immediately after focus moves.
  Delay them by about 100–500 ms, or make sure the region exists before updating it.
- `role="application"` makes VoiceOver/NVDA pass keys straight to the page. Avoid it unless
  you implement every key yourself.
- Tables: VO+arrows move by cell inside an interacted table, and headers should be announced
  as you move.

## NVDA (Windows, free)

NVDA key = **Insert** (desktop layout) or **Caps Lock** (laptop layout).

| Task | Keys |
|---|---|
| Start / quit | Ctrl+Alt+N / NVDA+Q |
| Stop speaking | Ctrl |
| Read next / previous | ↓ / ↑ (browse mode) |
| Say all | NVDA+↓ |
| Read focused item | NVDA+Tab |
| **Elements list** (headings, links, landmarks, form fields, buttons) | **NVDA+F7** |
| Next heading / level 1–6 | H / 1–6 (Shift = previous) |
| Next landmark / link / button / form field / edit / checkbox / table / list | D / K / B / F / E / X / T / L |
| Table cell navigation | Ctrl+Alt+arrows |
| Toggle browse ↔ focus mode | NVDA+Space |
| **Speech Viewer** (copy the exact announcements) | NVDA menu (NVDA+N) → Tools → Speech Viewer |

**Browse vs focus mode** is the #1 source of "works for me" bugs. In browse mode NVDA
intercepts letters and arrows for navigation. Focus mode, entered automatically on fields and
on many widgets, passes keys to the page. If your custom tabs, menu, grid or combobox need
arrow keys, check that NVDA switches to focus mode on them (correct role, focus on the element).
Otherwise the arrows read text instead of moving between items.

Pair NVDA with Firefox and Chrome.

## Voice control (speech input), not screen readers

| Tool | Platform | Commands to test |
|---|---|---|
| Voice Control | macOS, iOS | "Click/Tap *Save*", "Show names", "Show numbers", "Show grid" |
| Voice Access | Windows 11 | "Click *Save*", "Show numbers" |
| Voice Access | Android | "Tap *Save*", "Show labels", "Show numbers" |
| Dragon Professional | Windows | "Click *Save*" |

These users **say the visible label**, so check that:
- the accessible name **contains the visible text**, ideally at the start (2.5.3 Label in Name).
  A "Search" button with `aria-label="Submit query"` can't be activated by saying "Click Search".
- icon-only controls have names that match their tooltip or common wording ("Close", "Menu").
- controls on the same screen don't share a name, or users must fall back to numbers.
- single-key shortcuts can't be triggered accidentally by dictation (2.1.4).
- custom controls appear in "Show numbers". If they're missing, they lack an interactive role.
