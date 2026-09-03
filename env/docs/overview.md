# Overview

`@saflib/env` provides some simple validation, typechecking, and CLI tools for env variables in SAF applications.

Use the [env/add-var workflow](./workflows/add-var.md) to add a new env variable to a package, or run `npm exec saf-env generate` in a package to generate an `env.ts` file with env variables from all dependencies for use in code.

## Using env variables in SAF applications

All env variables should be declared in an owning package's `env.schema.json` file, which are structured like this:

```json
{
  "type": "object",
  "properties": {
    "MY_ENV_VARIABLE": {
      "type": "string",
      "description": "Description of what this env variable does."
    }
  },
  "required": ["MY_ENV_VARIABLE"]
}
```

These declarations are used to generate `env.ts` files so variables can be typed, and `env.schema.combined.json` so variables used by an application can be validated on startup, like [in the base application's `run.ts`](https://github.com/sderickson/saflib/blob/bc7f5cfc49d860a51877f577643998e058b77746/base/service/monolith/run.ts).

## Core Env Variables

Some variables are so common throughout SAF, that this package provides them itself, so all packages have them available. See [Environmental Variables](./env/index.md) for the entire list.
