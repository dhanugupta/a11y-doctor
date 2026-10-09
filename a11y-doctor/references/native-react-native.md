# React Native / Expo accessibility

WCAG applies to native apps through W3C's WCAG2ICT guidance. Map the criteria to platform
semantics: an accessible name, a role (trait) and a state for every interactive element.

## Core props

| Need | Prop (RN ≥ 0.71 also supports the web-style `role`/`aria-*` aliases) |
|---|---|
| Name | `accessibilityLabel="Delete invoice"` or `aria-label` |
| Role | `accessibilityRole="button" \| "link" \| "header" \| "image" \| "checkbox" \| "switch" \| "tab" \| "adjustable" …` or `role` |
| State | `accessibilityState={{ disabled, selected, checked, expanded, busy }}` or `aria-checked`, `aria-expanded`, … |
| Hint (extra context) | `accessibilityHint="Opens the invoice in a new screen"` (don't repeat the label) |
| Value (sliders, progress) | `accessibilityValue={{ min, max, now, text }}` |
| Grouping | `accessible={true}` on a container merges its children into one focusable element |
| Hide decorative | `accessible={false}`, or `importantForAccessibility="no-hide-descendants"` (Android) / `accessibilityElementsHidden` (iOS) / `aria-hidden` |
| Live updates | `accessibilityLiveRegion="polite"` (Android), `AccessibilityInfo.announceForAccessibility(msg)` (both) |
| Modal | `<Modal>` + `accessibilityViewIsModal` (iOS) so content behind it is ignored |
| Custom actions | `accessibilityActions` + `onAccessibilityAction` (swipe-to-delete alternatives) |

## Common fixes

```tsx
// ❌ icon-only touchable: announced as nothing, or just "button"
<Pressable onPress={onBack}><Image source={backIcon} /></Pressable>

// ✅
<Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
  <Image source={backIcon} accessibilityIgnoresInvertColors />
</Pressable>
```

- Every `Pressable`/`Touchable*` needs `accessibilityRole` (usually `"button"`, or `"link"`),
  and a label if it has no `<Text>` child.
- Headings: `<Text accessibilityRole="header">` so screen reader users can jump between them.
- Text inputs: `accessibilityLabel` (or `aria-labelledby` / `accessibilityLabelledBy` → a
  visible label's `nativeID`). A placeholder is not a label.
- Errors: announce them with `AccessibilityInfo.announceForAccessibility`, and keep them
  visible next to the field.
- Touch targets: at least 44×44pt (iOS) / 48×48dp (Android). Use `hitSlop` or `minHeight` and
  `minWidth`.
- Text scaling: don't set `allowFontScaling={false}`. Test at the largest size, avoid fixed
  heights, and use `maxFontSizeMultiplier` sparingly.
- Reduced motion: `AccessibilityInfo.isReduceMotionEnabled()`; Reanimated's
  `useReducedMotion()`.
- Focus after navigation: React Navigation moves screen reader focus to the new screen.
  For in-screen changes, use `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref.current))`.
- Swipe-only gestures (swipe to delete) need `accessibilityActions` or a visible button.

## Tooling

- `eslint-plugin-react-native-a11y` for static checks.
- `@testing-library/react-native`: `getByRole('button', { name: 'Back' })`, `getByLabelText`.
- Platform scanners: Xcode Accessibility Inspector (iOS) and Accessibility Scanner (Android).
- Manual: VoiceOver and TalkBack (`manual-verification.md` → Mobile).
