# Other assistive tech: mobile screen readers, JAWS, Narrator, settings, Guidepup

Load this for mobile apps or mobile web, enterprise (JAWS) users, OS display settings,
Electron apps, or automated screen reader tests. The core workflow, accessible-name rules,
VoiceOver on macOS, NVDA and voice control are in `screen-readers.md`.

## VoiceOver: iOS / iPadOS

| Task | Gesture |
|---|---|
| Turn on/off | Settings → Accessibility → VoiceOver, or the Accessibility Shortcut (triple-click the side/home button), or ask Siri |
| Next / previous item | Swipe right / left (one finger) |
| Explore by touch | Drag one finger; it reads what's underneath |
| Activate | Double-tap |
| **Rotor** | Rotate two fingers like a dial (Headings, Links, Form Controls, Landmarks, Containers…), then swipe up/down to move by that unit |
| Read all from top / from here | Two-finger swipe up / two-finger swipe down |
| Scroll | Three-finger swipe |
| Back / dismiss (Escape) | Two-finger scrub (a "Z" shape) |
| Magic tap (play/pause, answer) | Two-finger double-tap |
| Screen Curtain | Three-finger triple-tap |
| Mute speech | Three-finger double-tap |

**iOS-specific things to check:**
- Modals: swiping must not reach content behind them. The two-finger scrub must close them.
- Custom controls: can each one be reached by swiping *and* activated by double-tap? Hover-only
  and long-press-only actions are unreachable.
- Sliders and steppers: swipe up/down adjusts them (`role="slider"` with `aria-valuetext`).
- Test with a Bluetooth keyboard too: Full Keyboard Access (Settings → Accessibility →
  Keyboards).
- Text size: Settings → Accessibility → Display & Text Size → Larger Text at maximum.

## JAWS (Windows, commercial; common in enterprise and government)

JAWS key = Insert. Similar to NVDA: quick keys H, F, B, T and Tab; the virtual PC cursor
(toggle Insert+Z); forms mode is entered with Enter on a field. Lists: headings Insert+F6,
links Insert+F7, form fields Insert+F5. **Speech history**: Insert+Space, then H. JAWS fills in
missing labels more aggressively than NVDA, so a pass in JAWS alone can hide bugs. Pair it
with Chrome or Edge.

## Narrator (Windows, built-in)

Turn on/off with Win+Ctrl+Enter. Narrator key = Caps Lock or Insert. Scan mode is Caps
Lock+Space, then H/D/K/F like NVDA. Good for a quick smoke test with Edge, but not a substitute
for NVDA/JAWS.

## TalkBack (Android)

| Task | Gesture |
|---|---|
| Turn on/off | Settings → Accessibility → TalkBack, or hold both volume keys for 3 s (if the shortcut is set) |
| Next / previous | Swipe right / left |
| Activate | Double-tap |
| Reading controls (headings, links, controls, characters…) | Swipe up/down to move; swipe down-then-up (or three-finger swipe, depending on version) to change the control |
| Back | Swipe down then left (or the system Back gesture) |
| TalkBack menu | Swipe down then right, or three-finger tap |
| Scroll | Two-finger swipe |
| **See the speech as text** | TalkBack settings → Advanced → Developer settings → **Display speech output** |

Pair it with Chrome. Samsung's older "Voice Assistant" is TalkBack-based. Don't confuse it
with Amazon's VoiceView.

## VoiceView (Amazon Fire OS / Fire tablets / Fire TV)

A screen reader, not speech input. Turn it on at Settings → Accessibility → VoiceView Screen
Reader (on Fire TV, hold Back + Menu). Gestures on tablets are like TalkBack (swipe, double-tap).
It uses the same names, roles and states as Android, so there is no separate API: fix the
accessible name, role and state and retest.

## Other assistive tech and settings worth a pass

| Setting | Where | What to check |
|---|---|---|
| Windows Contrast themes (forced colors) | Settings → Accessibility → Contrast themes; emulate in DevTools → Rendering → `forced-colors: active` | Focus ring, icons (SVG `fill: currentColor`), control borders and selected states remain visible; no meaning carried only by background images or colors |
| macOS / iOS Increase Contrast, Reduce Transparency | Accessibility → Display | Borders and text stay legible |
| Reduce Motion | macOS/iOS/Windows/Android settings; DevTools → `prefers-reduced-motion` | Large animations stop (2.3.3 AAA; 2.2.2 A for auto-moving content) |
| Zoom / text size | Browser 200–400%; iOS Larger Text; Android Font size | No clipping or overlap; reflow at 320 px |
| Switch Control / Switch Access | iOS, Android, macOS | Every control is reachable in scanning order; no time-limited interactions |
| Full Keyboard Access | iOS, macOS | Everything is reachable with Tab/arrows on touch-first designs |

## Desktop apps built with web tech (Electron, Tauri, web views)

This skill applies to their HTML. Also test the native shell:
- Windows: NVDA + JAWS + Narrator. **Accessibility Insights for Windows**: Live Inspect for
  name/role/patterns, FastPass for tab stops and missing names.
- macOS: VoiceOver + **Accessibility Inspector** (Xcode → Open Developer Tool).
- Check native menus, title bars, tray icons, and focus when windows open or close.

Native desktop toolkits (WPF, WinUI, Qt, wxPython, AppKit) are outside this skill's scope.
Apply the same name/role/state principles with the platform's UI Automation / NSAccessibility
APIs.

## Automating real screen readers (Guidepup)

[Guidepup](https://www.guidepup.dev) drives **real VoiceOver (macOS) and NVDA (Windows)** from
Playwright tests and records the spoken phrases. Use it to lock in critical flows, not for
every component.

```bash
npx @guidepup/setup setup                      # grants macOS/Windows automation permissions
npm i -D @guidepup/playwright @guidepup/guidepup @playwright/test
npx @guidepup/setup install                    # screen reader assets (e.g. portable NVDA)
```

Templates are in `assets/test-templates/voiceover-guidepup.spec.ts` and
`nvda-guidepup.spec.ts`. Things to know:
- Browsers must run **headed**. Spread `screenReaderConfig` from `@guidepup/playwright` into
  `playwright.config.ts`, run with one worker, and use WebKit for VoiceOver and Chromium or
  Firefox for NVDA.
- Assert on **key phrases** (`toContain("Delete invoice")`), or snapshot `spokenPhraseLog()`
  for regression. Exact full-log snapshots break when screen reader versions change.
- CI: run on macOS / Windows runners after `@guidepup/setup`. The screen reader takes over the
  machine, so never run it on a developer's laptop without asking.
