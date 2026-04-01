/**
 * Kratos `webauthn.js` registers implementations on `window` with a `__` prefix (e.g.
 * `__oryPasskeySettingsRegistration`), while flow UI nodes and inline `onclick` snippets call the
 * unprefixed name (`oryPasskeySettingsRegistration`). Wire aliases so both work.
 *
 * @see https://github.com/ory/kratos/tree/master/selfservice/strategy/webauthn/js
 */
const ORY_WEBAUTHN_TRIGGER_NAMES = [
  "oryWebAuthnRegistration",
  "oryWebAuthnLogin",
  "oryPasskeyLogin",
  "oryPasskeyLoginAutocompleteInit",
  "oryPasskeyRegistration",
  "oryPasskeySettingsRegistration",
] as const;

function wireOryWebAuthnWindowAliases(): void {
  const w = window as unknown as Record<string, unknown>;
  for (const name of ORY_WEBAUTHN_TRIGGER_NAMES) {
    const implName = `__${name}`;
    if (typeof w[implName] === "function" && typeof w[name] !== "function") {
      w[name] = w[implName];
    }
  }
}

export function invokeOryWebAuthnByTrigger(trigger: string): void {
  wireOryWebAuthnWindowAliases();
  const w = window as unknown as Record<string, (payload?: unknown) => void>;
  const impl = w[trigger] ?? w[`__${trigger}`];
  if (typeof impl === "function") {
    impl();
  }
}
