# React and Next.js accessibility patterns

## JSX basics

| Issue | ❌ | ✅ |
|---|---|---|
| Label association | `<label>Email</label><input />` | `const id = useId();` `<label htmlFor={id}>Email</label><input id={id} />` |
| Click on non-interactive | `<div onClick={open}>Open</div>` | `<button type="button" onClick={open}>Open</button>` |
| Link vs button | `<a onClick={save}>Save</a>` | `<button type="button" onClick={save}>`. Use `<a href>` / `<Link href>` only to navigate. |
| Icon button | `<button><TrashIcon /></button>` | `<button aria-label="Delete invoice"><TrashIcon aria-hidden="true" focusable="false" /></button>` |
| Fragments break lists/tables | a `<div>` wrapper inside `<ul>`/`<tr>` | Return `<li>`/`<td>` directly, or use `<Fragment key>` |
| Generated IDs | `id="email"` in a reusable component (duplicate ids) | `useId()` — never `Math.random()` (SSR mismatch) |
| Boolean ARIA | `aria-expanded={open ? 'true' : undefined}` | `aria-expanded={open}` — React serializes booleans for `aria-*` |
| Conditional content | Hiding with `display:none` but still announcing | Unmount, or use the `hidden` attribute / `inert` |

Use `aria-*` attribute names as-is in JSX (`aria-label`, not `ariaLabel`). Use `htmlFor` and
`tabIndex`.

## Custom components must forward a11y props

Design-system components are where most issues multiply. Every interactive primitive should:

```tsx
type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;            // required accessible name: make it impossible to forget
  icon: React.ReactNode;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} aria-label={label} {...rest}>
      <span aria-hidden="true">{icon}</span>
    </button>
  ),
);
```

- Spread `...rest` onto the real DOM element so `aria-*`, `id` and `on*` props reach it.
- Use `forwardRef` (or `ref` as a prop in React 19) so callers can move focus to it.
- Make the accessible name a **required** prop for icon-only variants.
- `Input` components: accept `label` and render a real `<label>`; wire `aria-describedby` to
  hint and error ids; set `aria-invalid` from the error state.

## Focus management

```tsx
// Move focus into a dialog on open and restore it on close
function useDialogFocus(open: boolean, dialogRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();          // the dialog container has tabIndex={-1}, or focus its first field
    return () => previous?.focus();
  }, [open]);
}
```

Prefer the native `<dialog>` element with `showModal()`: it provides inert background, Esc to
close and top-layer rendering. It doesn't set `aria-modal`, so still add `aria-labelledby`.
Otherwise use a vetted library (React Aria `useDialog`/`Modal`, Radix Dialog, Headless UI
Dialog, MUI Modal), or `react-focus-lock` / `focus-trap-react` for a custom dialog, rather than
hand-rolling a focus trap. Don't add `role`/`aria-*` that the primitive already sets: duplicates
are announced twice.

Portals (`createPortal`) render outside the component tree's DOM: make sure the background
gets `inert` (or `aria-hidden` on the app root) while a modal is open, and that focus returns
to the trigger.

## Route changes (SPA)

Client-side navigation doesn't announce a new page. On route change:

1. Update `document.title` (Next App Router: `export const metadata` / `generateMetadata`;
   Pages Router: `<Head><title>`; React Router: set it in a route effect).
2. Move focus to the main content, or announce the title through a polite live region.

Keep **one** `<main id="main" tabIndex={-1}>` in the app shell (the skip link's target), not
one per page. Skip the first render, or you'll steal focus on page load:

```tsx
function FocusMainOnNavigate() {
  const { pathname } = useLocation();            // Next.js: usePathname() from next/navigation
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    document.getElementById('main')?.focus();
  }, [pathname]);
  return null;
}
```

Next.js App Router includes a route announcer that reads the new title. Still make sure each
route has a unique title, and that focus isn't left on a removed element.

## Live regions and async UI

```tsx
// Render the region once (e.g. in the layout), then change its text
<div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>
```

- A live region added together with its text is often not announced. Mount it empty first.
- `role="alert"` is for urgent errors only.
- Loading states: `aria-busy="true"` on the updating region, plus a status message
  ("Loading results…" → "24 results").

## Next.js specifics

- `app/layout.tsx`: `<html lang={locale}>` is required (3.1.1).
- `next/image`: `alt` is required. Use `alt=""` for decorative images.
- `next/link`: renders `<a href>`. Never put `onClick`-only behaviour on it; don't nest a
  `<button>` inside it.
- `eslint-config-next` includes some jsx-a11y rules. Add the full `plugin:jsx-a11y/recommended`
  (see `assets/lint-configs/react.eslint.config.mjs`).

## Libraries to prefer

React Aria / React Aria Components, Radix UI, Headless UI, Ariakit, and MUI Base handle
keyboard interaction and ARIA for complex widgets. When the project already uses one, fix
the issue through the library's API (e.g. pass `aria-label` or `label`) instead of wrapping it.

## Testing

- `@testing-library/react`: query with `getByRole('button', { name: /save/i })`. If the query
  fails, the accessible name or role is wrong. This is the cheapest a11y test.
- `jest-axe` / `vitest-axe` for component-level checks (`assets/test-templates/jest-axe.test.tsx`).
- `@axe-core/playwright` for pages (`assets/test-templates/playwright-axe.spec.ts`).
- Storybook: `@storybook/addon-a11y` runs axe on each story. Add `parameters.a11y` in
  `preview.ts` and treat violations as errors in the test runner.
