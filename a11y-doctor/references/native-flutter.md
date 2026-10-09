# Flutter accessibility

> Coverage: reference patterns plus test tooling. `audit.mjs` has no static Dart checks yet.

## Semantics

| Need | API |
|---|---|
| Name for icons/images | `Icon(Icons.delete, semanticLabel: 'Delete invoice')`, `Image.asset(..., semanticLabel: '…')`; `excludeFromSemantics: true` for decorative |
| Icon buttons | `IconButton(icon: …, tooltip: 'Delete invoice', onPressed: …)` (the tooltip becomes the label) |
| Custom widgets | `Semantics(button: true, label: 'Play', enabled: true, onTap: …, child: …)` |
| State | `Semantics(checked: …, selected: …, toggled: …, expanded: …)` |
| Heading | `Semantics(header: true, child: Text('Orders'))` |
| Group / merge | `MergeSemantics`, `Semantics(container: true)` |
| Hide | `ExcludeSemantics`, `BlockSemantics` (behind custom modals) |
| Live updates | `Semantics(liveRegion: true)`, or `SemanticsService.announce('Saved', TextDirection.ltr)` |
| Order | `Semantics(sortKey: OrdinalSortKey(1))`, `FocusTraversalGroup` + `OrderedTraversalPolicy` |
| Text fields | `TextField(decoration: InputDecoration(labelText: 'Email', errorText: …))` (label and error are exposed) |
| Text scaling | respect `MediaQuery.textScalerOf(context)`; don't clamp to 1.0; avoid fixed-height text boxes |
| Targets | `MaterialTapTargetSize.padded` (48dp default) |
| Web/desktop keyboard | `Focus`, `FocusableActionDetector`, `Shortcuts`/`Actions` for custom controls |

## Testing

```dart
testWidgets('meets a11y guidelines', (tester) async {
  final handle = tester.ensureSemantics();
  await tester.pumpWidget(const MyApp());
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
  await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
  await expectLater(tester, meetsGuideline(textContrastGuideline));
  handle.dispose();
});
```
Also: `find.bySemanticsLabel('Delete invoice')`, Flutter DevTools' "Show semantics debugger",
and manual TalkBack/VoiceOver testing.
