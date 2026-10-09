# Angular accessibility patterns

## Template basics

| Issue | ❌ | ✅ |
|---|---|---|
| Click on non-interactive | `<div (click)="open()">` | `<button type="button" (click)="open()">` |
| ARIA binding (Angular < 20) | `[aria-label]="label"` (template error on older versions) | `[attr.aria-label]="label"`. Angular 20+ also accepts `[aria-label]` directly |
| Boolean ARIA | `[attr.aria-expanded]="open ? 'true' : null"` | `[attr.aria-expanded]="open"` (renders "true"/"false"); use `null` to *remove* an attribute |
| Label | `<label>Email</label><input formControlName="email">` | `<label for="email">Email</label><input id="email" formControlName="email">` |
| Unique ids in reusable components | hard-coded `id="email"` | a module-level counter: `let nextId = 0;` … `id = \`email-${nextId++}\`` |
| Icon button | `<button mat-icon-button><mat-icon>delete</mat-icon></button>` | add `aria-label="Delete row"`; `<mat-icon aria-hidden="true">` (MatIcon sets this by default for ligature icons) |
| Router links | `<a (click)="go()">` | `<a routerLink="/orders">` (real href) |

Host bindings make components accessible by default:

```ts
@Component({
  selector: 'app-toggle',
  host: {
    role: 'switch',
    tabindex: '0',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-disabled]': 'disabled()',
    '(click)': 'toggle()',
    '(keydown.enter)': 'toggle()',
    '(keydown.space)': 'toggle(); $event.preventDefault()',
  },
  template: `<ng-content />`,
})
export class ToggleComponent { /* … */ }
```

Better still: wrap a native `<button>` or `<input type="checkbox" role="switch">`.

## Angular CDK a11y (`@angular/cdk/a11y`)

| Need | Tool |
|---|---|
| Trap focus in dialogs/drawers | `cdkTrapFocus` + `[cdkTrapFocusAutoCapture]="true"` (restores focus on destroy) — or use `MatDialog`/CDK `Dialog`, which do it for you |
| Announce status messages | `LiveAnnouncer.announce('3 results', 'polite')` |
| Keyboard nav in lists/menus/tabs | `FocusKeyManager` / `ActiveDescendantKeyManager` with `ListKeyManagerOption` items |
| Detect keyboard vs mouse focus | `FocusMonitor` (`cdk-keyboard-focused` class) for `:focus-visible`-like styling |
| Visually hidden text | `.cdk-visually-hidden` class |
| High contrast mode | `HighContrastModeDetector` |

When you open a `MatDialog` or CDK `Dialog` through the service, don't also put
`role="dialog"` in its template; the container already sets it.

Angular Material components (`MatDialog`, `MatMenu`, `MatSelect`, `MatTabs`, `MatAutocomplete`)
implement the ARIA patterns. Fix issues through their inputs (`aria-label`,
`ariaLabelledBy` on the dialog config, `<mat-label>`), not by fighting their DOM.

```ts
this.dialog.open(ConfirmDialog, {
  ariaLabelledBy: 'confirm-title',   // matches <h2 mat-dialog-title id="confirm-title">
  autoFocus: 'first-tabbable',
  restoreFocus: true,
});
```

## Forms (Reactive / Template-driven)

```html
<label for="email">Email</label>
<input id="email" type="email" formControlName="email" autocomplete="email"
       [attr.aria-invalid]="email.invalid && email.touched"
       [attr.aria-describedby]="email.invalid && email.touched ? 'email-error' : null">
@if (email.invalid && email.touched) {
  <p id="email-error" class="error">Enter an email address like name@example.com</p>
}
```

- `mat-form-field` + `<mat-label>` + `<mat-error>` wires the label and `aria-describedby` for
  you. Placeholder alone is not a label.
- On submit with errors: focus the first invalid control, or an error summary with links to
  each field.
- Group radios and checkboxes with `<fieldset><legend>`, or `mat-radio-group` with `aria-labelledby`.

## Routing

- Set page titles in routes: `{ path: 'orders', title: 'Orders | Acme', component: … }`, or with
  a custom `TitleStrategy` (2.4.2).
- After navigation, move focus to the main heading or announce it:

```ts
// One <main id="main" tabindex="-1"> in the app shell (the skip-link target), outside routed views.
router.events.pipe(
  filter((e): e is NavigationEnd => e instanceof NavigationEnd),
  skip(1),                                            // don't steal focus on initial load
).subscribe(() => {
  setTimeout(() => document.getElementById('main')?.focus()); // wait for the new view to render
});
```

- Use `routerLinkActive` with `ariaCurrentWhenActive="page"` for the current nav item.

## Change detection and live regions

A live region must exist before its text changes. Put a persistent
`<div aria-live="polite" class="cdk-visually-hidden">{{ status() }}</div>` in the layout,
or use `LiveAnnouncer`. Elements added with `@if` that contain `role="alert"` are usually
announced, but polite regions created at the same time as their content often are not.

## Lint

`@angular-eslint/template` has accessibility rules (`alt-text`, `elements-content`,
`label-has-associated-control`, `click-events-have-key-events`, `interactive-supports-focus`,
`valid-aria`, `role-has-required-aria`, `no-positive-tabindex`, `no-autofocus`, `table-scope`,
`mouse-events-have-key-events`, `no-distracting-elements`). Enable them through the
`templateAccessibility` config (see `assets/lint-configs/angular.eslint.config.mjs`).
Inline templates need the `extract-inline-html` processor.

## Testing

- Component harnesses / Testing Library for Angular: `screen.getByRole('button', { name: 'Save' })`.
- axe in TestBed: `assets/test-templates/angular-axe.spec.ts`.
- Playwright + axe for pages: `assets/test-templates/playwright-axe.spec.ts`.
