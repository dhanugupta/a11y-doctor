# iOS (SwiftUI / UIKit) accessibility

> Coverage: reference patterns plus test tooling. `audit.mjs` has no static Swift checks yet.
> Audit Swift code by reading it against this file and `wcag22-checklist.md`.

## SwiftUI

| Need | API |
|---|---|
| Name | `.accessibilityLabel("Delete invoice")` (icon-only `Button`s, `Image`s) |
| Decorative image | `Image(decorative: "divider")` or `.accessibilityHidden(true)` |
| Role/traits | `.accessibilityAddTraits(.isButton / .isHeader / .isSelected)`; prefer real `Button`/`Toggle`/`Link` |
| Value | `.accessibilityValue("3 of 5")` |
| Hint | `.accessibilityHint("Double-tap to open the invoice")` (optional extra context) |
| Group | `.accessibilityElement(children: .combine)` for cards and rows |
| Custom actions | `.accessibilityAction(named: "Delete") { … }` (swipe alternatives) |
| Adjustable | `.accessibilityAdjustableAction { direction in … }` for custom steppers and sliders |
| Focus | `@AccessibilityFocusState` + `.accessibilityFocused($isFocused)` |
| Announce | `AccessibilityNotification.Announcement("Saved").post()` (iOS 17+) |
| Order | `.accessibilitySortPriority(_)` |
| Dynamic Type | system text styles (`.font(.body)`), `@ScaledMetric`; avoid fixed frames on text |
| Reduce motion | `@Environment(\.accessibilityReduceMotion)` |

```swift
// ❌ VoiceOver reads the SF Symbol name, e.g. "trash"
Button { delete() } label: { Image(systemName: "trash") }

// ✅
Button { delete() } label: { Image(systemName: "trash") }
  .accessibilityLabel("Delete invoice")
```
Alternatively, `Label("Delete invoice", systemImage: "trash").labelStyle(.iconOnly)` gives
the name for free.

## UIKit

`isAccessibilityElement`, `accessibilityLabel`, `accessibilityTraits`, `accessibilityValue`,
`accessibilityViewIsModal` (custom modals), `UIAccessibility.post(notification: .screenChanged / .layoutChanged / .announcement, argument:)`,
`adjustsFontForContentSizeCategory = true` with `UIFont.preferredFont(forTextStyle:)`.

## Targets and contrast

Minimum 44×44pt hit targets (HIG). Use semantic system colors, which adapt to Increase
Contrast and Dark Mode. Text contrast ≥ 4.5:1.

## Testing

- Xcode **Accessibility Inspector** → Audit (contrast, missing labels, hit size, Dynamic Type clipping).
- XCTest (Xcode 15+/iOS 17+): run `try app.performAccessibilityAudit()` in UI tests and fail on issues.
- Manual: VoiceOver rotor navigation, the largest Dynamic Type size, Voice Control ("Show names").
