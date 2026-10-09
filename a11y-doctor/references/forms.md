# Accessible forms

## Labels (1.3.1, 3.3.2, 4.1.2, 2.5.3)

- Every field needs a programmatic label: `<label for>` / wrapping `<label>` (best),
  `aria-labelledby` (to visible text), or `aria-label` (last resort, invisible).
- **Placeholder is not a label.** It disappears while typing and usually fails contrast.
- The label must stay visible. Floating labels are fine if they remain readable.
- Group related controls: `<fieldset><legend>Delivery method</legend>…radios…</fieldset>`.
  The same goes for date parts and address blocks.
- Hints: `<p id="pw-hint">At least 12 characters</p>` + `aria-describedby="pw-hint"`.
- Required: native `required` (or `aria-required="true"`) **plus** a visible indicator
  explained once at the top ("* required").

## Input purpose (1.3.5)

Add `autocomplete` to fields that collect information about the user:

| Field | Token |
|---|---|
| Full / given / family name | `name`, `given-name`, `family-name` |
| Email / phone | `email`, `tel` |
| Address | `street-address`, `address-line1`, `postal-code`, `country-name`, `address-level2` (city) |
| Username / password | `username`, `current-password`, `new-password` |
| OTP | `one-time-code` |
| Card | `cc-name`, `cc-number`, `cc-exp`, `cc-csc` |
| Birthday | `bday` |

Also use the correct `type` (`email`, `tel`, `url`) and `inputmode` for mobile keyboards.

## Errors (3.3.1, 3.3.3, 4.1.3)

```html
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email"
       aria-invalid="true" aria-describedby="email-err">
<p id="email-err" class="error">
  <svg aria-hidden="true">…</svg> Enter an email address like name@example.com
</p>
```

- Show errors as text next to the field, not only with color or an icon (1.4.1).
- Say how to fix the problem (3.3.3): "Enter a date like 31/12/2025", not "Invalid".
- Set `aria-invalid="true"` only once the field is actually invalid (after blur or submit),
  not while the user is still typing for the first time.
- On submit:
  - **Few fields**: move focus to the first invalid field.
  - **Long forms**: show an error summary at the top (`role="alert"` or focus it with
    `tabindex="-1"`), with links to each field.
- Don't disable the submit button to show validity. Users can't find out what's wrong.
  Let them submit and then show errors.
- Async validation results ("Username available") go in a polite live region.

## Context changes (3.2.2)

- Don't navigate or submit on `change` of a `<select>`/radio without warning. Use a button.
- An OTP field that auto-submits on its last digit is acceptable if the user is told
  beforehand.

## Error prevention (3.3.4)

For legal, financial or data-changing submissions, provide at least one of: undo, a review
step before final submit, or a confirmation checkbox/dialog.

## Redundant entry (3.3.7, NEW in 2.2)

In multi-step flows, don't ask for the same information twice: pre-fill it, offer "Billing
address same as shipping", and keep values when the user goes back. Exceptions: security
re-entry (password confirmation) and information that is no longer valid.

## Accessible authentication (3.3.8, NEW in 2.2)

Login must not depend on a cognitive function test (remembering, transcribing, solving)
unless an alternative exists or a mechanism helps with it:

- ✅ Allow paste into username, password and OTP fields. Never `onPaste={e => e.preventDefault()}`.
- ✅ `autocomplete="username"` / `"current-password"` / `"one-time-code"` so password managers
  and SMS autofill work. Never `autocomplete="off"` on credentials.
- ✅ Split OTP inputs (6 boxes) must accept a pasted full code and distribute it.
- ✅ Offer passkeys/WebAuthn, magic links or SSO as alternatives.
- ❌ Text/puzzle CAPTCHAs without an alternative. Object-recognition CAPTCHAs ("select the
  cars") and personal-content checks are allowed at AA. A non-cognitive alternative is better.
- ❌ "Enter the 3rd and 5th characters of your password" without allowing paste/copy.

## Timeouts (2.2.1)

Warn at least 20 seconds before a session times out, with a way to extend it, using a modal
dialog that receives focus. Preserve entered data if the session does expire.

## Custom controls

Native `<input type="checkbox|radio|date|range">` and `<select>` come with keyboard and screen
reader support. When you restyle them, visually hide the native input (don't use
`display:none`) and style the adjacent element. For custom selects, comboboxes and date
pickers, see `aria-patterns.md`.
