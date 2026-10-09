# Android (Jetpack Compose / Views) accessibility

> Coverage: `audit.mjs` statically checks XML layouts (`res/layout*/`) for missing
> `contentDescription`. Audit Compose code by reading it against this file.

## Jetpack Compose

| Need | API |
|---|---|
| Name for images/icons | `Icon(Icons.Default.Delete, contentDescription = "Delete invoice")`; `null` **only** if decorative or already labelled by adjacent text |
| Role | `Modifier.clickable(role = Role.Button, onClickLabel = "open invoice") { … }`, or `Modifier.semantics { role = Role.Switch }` |
| State | `Modifier.toggleable(value, role = Role.Checkbox)`, `semantics { stateDescription = "Expanded" }`, `selected = true` |
| Heading | `Modifier.semantics { heading() }` |
| Group | `Modifier.semantics(mergeDescendants = true) {}` on list rows and cards |
| Hide | `Modifier.clearAndSetSemantics {}` or `semantics { invisibleToUser() }` |
| Live region | `semantics { liveRegion = LiveRegionMode.Polite }` |
| Custom actions | `semantics { customActions = listOf(CustomAccessibilityAction("Delete") { … true }) }` (swipe-to-dismiss alternatives) |
| Errors | `semantics { error("Enter a valid email") }` on text fields |
| Traversal order | `semantics { isTraversalGroup = true; traversalIndex = 1f }` |
| Touch target | Material components enforce 48dp (`minimumInteractiveComponentSize()`); custom clickables need `Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)` |
| Font scaling | `sp` units for text; avoid fixed heights on text containers |

```kotlin
// ❌ Icon button without a name: TalkBack says "Button, unlabeled"
IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, contentDescription = null) }

// ✅
IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, contentDescription = "Delete invoice") }
```

## XML Views

- `android:contentDescription` on `ImageView`/`ImageButton`/`FloatingActionButton`;
  `android:importantForAccessibility="no"` for decorative images.
- `android:labelFor` on a `TextView` labelling an `EditText`, or the `TextInputLayout` hint.
- `android:accessibilityHeading="true"` (API 28+) / `ViewCompat.setAccessibilityHeading`.
- `android:minHeight="48dp"` / `minWidth` for touch targets.
- `ViewCompat.setStateDescription`, `ViewCompat.replaceAccessibilityAction` for custom widgets.
- `android:accessibilityLiveRegion="polite"` for status text.

## Testing

- Espresso: `AccessibilityChecks.enable().setRunChecksFromRootView(true)` (ATF) fails tests on
  missing labels, small targets and low contrast.
- Compose UI tests: `onNodeWithContentDescription`, `assert(hasRole(...))`. Compose 1.8+ can
  run ATF checks via `enableAccessibilityChecks()`.
- Android Lint: `ContentDescription`, `ClickableViewAccessibility`, `LabelFor`, `KeyboardInaccessibleWidget`.
- **Accessibility Scanner** app, plus manual TalkBack, Switch Access and the largest font/display size.
