/** Permissive `format: email` for AJV validation of OpenAPI scalar schemas. */
export function lenientEmailValidate(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const email = value.trim();
  if (email.length < 3 || email.length > 320) {
    return false;
  }
  if (/\s/.test(email)) {
    return false;
  }
  const at = email.indexOf("@");
  if (at <= 0 || at === email.length - 1) {
    return false;
  }
  const domain = email.slice(at + 1);
  return domain.includes(".") && domain.indexOf(".") < domain.length - 1;
}

type AjvWithAddFormat = {
  addFormat: (
    name: string,
    format:
      | boolean
      | RegExp
      | string
      | { type?: string; validate: (value: unknown) => boolean },
  ) => void;
};

/** Register OpenAPI scalar formats used by dossier schemas before `addSchema`. */
export function registerLenientOpenApiAjvFormats(ajv: AjvWithAddFormat): void {
  ajv.addFormat("email", {
    type: "string",
    validate: lenientEmailValidate,
  });
}
