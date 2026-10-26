/**
 * Deliberately small JSON-Schema-*shaped* subset — just enough for a CLI (or
 * dev-site form) to coerce named args into a workflow's input. Not a general
 * validator: no nesting, no `oneOf`, no patterns.
 *
 * Standalone module so the dev-site SPA can import it without the workflow
 * engine barrel (git, copy steps, db, …).
 */
export interface WorkflowInputSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: "string" | "boolean" | "number";
      description?: string;
      default?: string | boolean | number;
    }
  >;
  required?: string[];
}
