/**
 * Spec bundles omit components that another package defines identically and
 * list them under this key, as `{ componentName: owningPackageName }`.
 */
export const EXTERNAL_COMPONENTS_KEY = "x-saf-external-components";

type Doc = {
  components?: { schemas?: Record<string, unknown> };
  [EXTERNAL_COMPONENTS_KEY]?: Record<string, string>;
};

/**
 * Restores components a bundle omitted, taking each from the complete document
 * of the package that owns it. The result is the full document the bundle was
 * generated from.
 */
export function mergeExternalComponents<T>(
  bundle: T,
  owners: Record<string, unknown>,
): T {
  const raw = unwrapJsonModule(bundle) as Doc;
  const external = raw[EXTERNAL_COMPONENTS_KEY];
  if (!external || Object.keys(external).length === 0) return raw as T;
  const { [EXTERNAL_COMPONENTS_KEY]: _omitted, ...rest } = raw;
  const schemas: Record<string, unknown> = { ...rest.components?.schemas };
  for (const [name, packageName] of Object.entries(external)) {
    const owner = unwrapJsonModule(owners[packageName]) as Doc | undefined;
    const schema = owner?.components?.schemas?.[name];
    if (schema === undefined) {
      throw new Error(
        `${EXTERNAL_COMPONENTS_KEY}: ${packageName} does not define component ${name}`,
      );
    }
    schemas[name] = schema;
  }
  return { ...rest, components: { ...rest.components, schemas } } as T;
}

function unwrapJsonModule(json: unknown): unknown {
  if (
    typeof json === "object" &&
    json !== null &&
    "default" in json &&
    (json as { default?: unknown }).default !== undefined
  ) {
    return (json as { default: unknown }).default;
  }
  return json;
}
