[**@saflib/env**](../index.md)

***

# Function: validateEnv()

> **validateEnv**(`env`, `envSchema`): `true` \| `PromiseLike`\<`boolean`\>

Given `process.env` and a schema, validate the environment variables. Throws an error if the environment variables are invalid. Run this when your service starts to ensure `typedEnv` conforms to the schema.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `env` | `any` |
| `envSchema` | `any` |

## Returns

`true` \| `PromiseLike`\<`boolean`\>
