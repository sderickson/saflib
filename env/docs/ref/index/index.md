[**@saflib/env**](../index.md)

---

# index

## Functions

| Function                                                        | Description                                                                                                                                                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [isDevelopmentDeployment](functions/isDevelopmentDeployment.md) | Whether the deployment is local development (`DEPLOYMENT_NAME=development`).                                                                                                                                   |
| [validateEnv](functions/validateEnv.md)                         | Given `process.env` and a schema, validate the environment variables. Throws an error if the environment variables are invalid. Run this when your service starts to ensure `typedEnv` conforms to the schema. |

## References

### EnvEnvSchema

Re-exports [EnvEnvSchema](../env/interfaces/EnvEnvSchema.md)

---

### typedEnv

Re-exports [typedEnv](../env/variables/typedEnv.md)
