// @ts-nocheck - otherwise `npm exec saf-docs generate` fails. Unclear why... TODO: fix this.
import Ajv from "ajv";

/**
 * Given `process.env` and a schema, validate the environment variables. Throws an error if the environment variables are invalid. Run this when your service starts to ensure `typedEnv` conforms to the schema.
 */
export const validateEnv = (env: any, envSchema: any): boolean => {
  const ajv = new Ajv({
    allErrors: true,
  });
  ajv.addKeyword("source");
  const adjustedEnvSchema = { ...envSchema, additionalProperties: true };
  const validate = ajv.compile(adjustedEnvSchema);
  const valid = validate(env);
  if (!valid) {
    console.error("\n\nInvalid environment variables:");
    validate.errors?.forEach((error) => {
      console.error(`  - ${error.instancePath} ${error.message}`);
    });
    console.error("");
    throw new Error("Invalid environment variables");
  }
  return valid;
};

export * from "./env.ts";
