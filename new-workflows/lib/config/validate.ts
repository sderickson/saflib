import Ajv from "ajv";
import { jsonSpec } from "@saflib/new-workflows-spec";
import type { WorkflowConfigBody } from "@saflib/new-workflows-spec";
import type { ReturnsError } from "@saflib/utils";

const schema = jsonSpec.components?.schemas?.["workflow-config-body"];
if (!schema) {
  throw new Error('"workflow-config-body" schema not found in @saflib/new-workflows-spec');
}

// `strict: false` because the OpenAPI-authored schema carries
// `example`/`discriminator` keywords ajv's strict mode would otherwise
// reject as unknown. Same approach as @saflib/env's `validateEnv`.
// ajv's ESM/CJS default export doesn't type-check cleanly here; same
// workaround @saflib/env's validateEnv uses (env/index.ts).
// @ts-expect-error - see above
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

export type ValidateWorkflowConfigBodyResult = ReturnsError<WorkflowConfigBody>;

/** Validates a raw parsed JSON/YAML object against the `WorkflowConfigBody` schema. */
export function validateWorkflowConfigBody(raw: unknown): ValidateWorkflowConfigBodyResult {
  if (!validate(raw)) {
    const message = (validate.errors ?? [])
      .map((e: { instancePath: string; message?: string }) => `${e.instancePath || "(root)"} ${e.message}`)
      .join("; ");
    return { error: new Error(`Invalid workflow config: ${message}`) };
  }
  return { result: raw as WorkflowConfigBody };
}
