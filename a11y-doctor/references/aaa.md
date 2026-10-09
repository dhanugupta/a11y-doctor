# Opt-in: WCAG 2.2 Level AAA

A and AA stay the default. Use this file only when the user, ticket or contract asks for AAA,
or names one of these criteria. AAA conformance is a claim about a whole page or process. Don't
label a single component "AAA", and never drop AA work to chase AAA. Report which AAA criteria
you checked and which you skipped.

| SC | Requirement | Code-level check / fix |
|---|---|---|
| 1.4.6 Contrast (Enhanced) | 7:1 normal text, 4.5:1 large text | Token-level color changes; axe rule `color-contrast-enhanced` (tag `wcag2aaa`) |
| 1.4.8 Visual Presentation | User-selectable colors, ≤ 80 characters per line, no justified text, line spacing 1.5, resize without horizontal scroll | Applies to blocks of prose, not app chrome. Claim it only for long-form content |
| 1.4.9 Images of Text (No Exception) | No images of text except logos | Replace text banners with HTML text |
| 2.1.3 Keyboard (No Exception) | Everything by keyboard, including path-dependent input | Keyboard alternatives for drawing/signature fields |
| 2.2.3 No Timing / 2.2.4 Interruptions / 2.2.5 Re-authenticating | No time limits; interruptions postponable; no data loss on re-login | Remove countdowns; persist form state across session expiry |
| 2.2.6 Timeouts | Warn about data loss from inactivity (if > 20 h data retention isn't provided) | Tell users the timeout length up front |
| 2.3.2 Three Flashes / 2.3.3 Animation from Interactions | No flashing at all; motion triggered by interaction can be disabled | Honor `prefers-reduced-motion: reduce` (see `visual.md`) |
| 2.4.8 Location / 2.4.10 Section Headings | Breadcrumbs or a "you are here" indicator; headings organize content | `aria-current="page"`; breadcrumbs nav |
| 2.4.9 Link Purpose (Link Only) | Link text alone describes the destination; "Read more" fails even with context | Rewrite link text, or add visually-hidden context inside the link |
| 2.4.12 Focus Not Obscured (Enhanced) | **No part** of the focused element is hidden (AA only forbids *entirely* hidden) | `scroll-padding` for sticky UI; the `--url` audit lists partial obscuring under "needs review" |
| 2.4.13 Focus Appearance | Indicator area ≥ a 2 CSS px perimeter of the unfocused component, with ≥ 3:1 contrast change between focused and unfocused states | `outline: 2px solid` + `outline-offset`; check against the criterion text rather than a guessed pixel rule |
| 2.5.5 Target Size (Enhanced) | 44×44 CSS px | `min-width/min-height: 44px` on targets |
| 2.5.6 Concurrent Input Mechanisms | Don't restrict to touch-only or mouse-only | Don't branch on `pointer: coarse` to remove keyboard/mouse support |
| 3.1.3 Unusual Words / 3.1.4 Abbreviations / 3.1.5 Reading Level / 3.1.6 Pronunciation | Definitions, expansions, lower-secondary reading level or a simpler version | Content work. Flag it for content owners; don't claim it for UI strings |
| 3.2.5 Change on Request | Context changes only when the user asks | No auto-redirects or auto-opening windows |
| 3.3.5 Help / 3.3.6 Error Prevention (All) | Context-sensitive help; review/undo for all submissions | Help text next to complex fields; confirmation or undo on every form |
| 3.3.9 Accessible Authentication (Enhanced) | As 3.3.8, **without** the object-recognition and personal-content exceptions | Passkeys, magic links, password managers; no image CAPTCHAs |
| 1.2.6–1.2.9 | Sign language, extended audio description, media alternative, live audio-only alternative | Media production work |

For automated support, add the axe tags `wcag2aaa` / `wcag21aaa` and expect noise: several AAA
criteria are content judgments.
