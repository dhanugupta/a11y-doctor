# Accessibility report — <scope>

**Standard:** WCAG 2.2 Level A + AA · **Date:** <YYYY-MM-DD> · **Scope:** <files / PR / URLs>
**Stack:** <framework, UI library> · **Tools run:** <heuristics, ESLint plugins, axe, keyboard walk, manual review>

## Summary

| Severity | Before | After |
|---|---|---|
| 🔴 Critical | | |
| 🟠 Serious | | |
| 🟡 Moderate | | |
| ⚪ Minor | | |

<One or two sentences: the biggest user impact found and what changed.>

## Fixed

| # | Issue | WCAG | Location | Fix |
|---|---|---|---|---|
| 1 | Icon-only "delete" button had no accessible name | 4.1.2 | `src/components/Row.tsx:42` | Added `aria-label="Delete invoice"`; icon `aria-hidden` |

## Needs human decision / review

| # | Issue | WCAG | Location | Why it wasn't auto-fixed |
|---|---|---|---|---|
| 1 | Brand blue `#4A90E2` on white is 3.3:1 | 1.4.3 | `tokens.css:12` | Changing a brand color needs design sign-off (suggest `#2F6DB5`, 5.2:1) |

## Remaining (not fixed in this pass)

<Findings left open, with severity and reason (out of scope, needs a backend change, third-party widget).>

## Verify manually

**Keyboard** (expected Tab order for the changed UI):

1. <element> → <expected behaviour>

**Screen reader**: VoiceOver + Safari (macOS), NVDA + Firefox/Chrome (Windows), plus VoiceOver iOS / TalkBack for mobile.
Full script with expected announcements: `.a11y-doctor/sr-script.md` (commands in references/screen-readers.md and references/assistive-tech.md).

| # | Action (VoiceOver / NVDA) | Expected announcement | VoiceOver heard | NVDA heard |
|---|---|---|---|---|
| 1 | Tab to delete button | "Delete invoice, button" | | |
| 2 | VO+Space / Enter | "Invoice deleted" (status message), focus on next row | | |

**Voice control**: say "Click <visible label>" for each changed control (macOS Voice Control / Windows Voice Access).

## Testing coverage

<Gaps from detect-stack (A11Y-TST-00x) and which were addressed.>

## Recommendations

- <tooling from detect-stack, e.g. enable jsx-a11y, add an axe test for this page, CI gate>
- <regression tests added or proposed>
