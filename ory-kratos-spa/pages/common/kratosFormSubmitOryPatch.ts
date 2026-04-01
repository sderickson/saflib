/**
 * Ory `webauthn.js` calls `HTMLFormElement.prototype.submit()` after filling credential fields. That
 * bypasses `submit` events, so Vue's `@submit.prevent` never runs and the browser performs a full
 * navigation (often GET with secrets in the query). Patch this form instance so `submit()` dispatches
 * a cancelable {@link SubmitEvent} first; if listeners call {@link Event.preventDefault}, skip the
 * native submit.
 */
export function patchKratosFormSubmitForOryProgrammaticSubmit(
  form: HTMLFormElement,
): () => void {
  const proto = HTMLFormElement.prototype.submit;
  function wrapped(this: HTMLFormElement) {
    if (this !== form) {
      return proto.call(this);
    }
    const ev = new SubmitEvent("submit", { bubbles: true, cancelable: true });
    if (!this.dispatchEvent(ev)) {
      return;
    }
    return proto.call(this);
  }
  form.submit = wrapped as typeof form.submit;
  return () => {
    if ((form as unknown as { submit: unknown }).submit === wrapped) {
      form.submit = proto.bind(form) as typeof form.submit;
    }
  };
}
