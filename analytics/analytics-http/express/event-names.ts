type Schema = {
  $ref?: string;
  oneOf?: Schema[];
  anyOf?: Schema[];
  properties?: { event?: { enum?: unknown[]; const?: unknown } };
};

/**
 * The event names a product declares: every `event` enum (or const) under
 * the spec's `ProductEvent` schema, following `$ref`s and `oneOf`/`anyOf`.
 * Pass the result as `allowedEvents`, so declaring an event in the spec is
 * what lets browsers send it.
 */
export function productEventNames(
  spec: { components?: { schemas?: Record<string, unknown> } },
  schemaName = "ProductEvent",
): string[] {
  const schemas = (spec.components?.schemas ?? {}) as Record<string, Schema>;
  const names = new Set<string>();
  const seen = new Set<Schema>();
  const visit = (s: Schema | undefined) => {
    if (!s || seen.has(s)) return;
    seen.add(s);
    if (s.$ref?.startsWith("#/components/schemas/")) visit(schemas[s.$ref.slice("#/components/schemas/".length)]);
    for (const sub of [...(s.oneOf ?? []), ...(s.anyOf ?? [])]) visit(sub);
    const ev = s.properties?.event;
    for (const v of [...(ev?.enum ?? []), ...(ev?.const !== undefined ? [ev.const] : [])]) {
      if (typeof v === "string") names.add(v);
    }
  };
  visit(schemas[schemaName]);
  return [...names].sort();
}
