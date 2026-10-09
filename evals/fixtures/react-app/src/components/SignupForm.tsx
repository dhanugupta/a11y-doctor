export function SignupForm() {
  return (
    <form>
      {/* expect: form-label */}
      <input type="email" placeholder="Email" />
      {/* expect: auth-paste-blocked auth-autocomplete-off */}
      <input type="password" onPaste={(e) => e.preventDefault()} autoComplete="off" aria-label="Password" />
      {/* expect: invalid-aria-attr invalid-role */}
      <div role="alertt" aria-labeledby="err">Something went wrong</div>
      {/* expect: autofocus */}
      <textarea aria-label="Bio" autoFocus />
      {/* expect: aria-hidden-focusable */}
      <button aria-hidden="true">Hidden action</button>
      {/* expect: dialog-name */}
      <div role="dialog" aria-modal="true"><p>Confirm?</p></div>
    </form>
  );
}
