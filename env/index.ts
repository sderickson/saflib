import Ajv from "ajv";

export const validateEnv = (env: any, envSchema: any) => {
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
      console.error(`  - ${error.message}`);
    });
    console.error("");
    throw new Error("Invalid environment variables");
  }
  return valid;
};
