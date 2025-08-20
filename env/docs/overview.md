# Overview

`@saflib/env` provides some simple validation, typechecking, and tools for env variables in SAF applications.

## The Problem

Environmental variables are standard inputs for running services. However, there isn't a standard way to specify what env variables a program expects, or what values it will accept.

In a monorepo system it's worse. The package responsible for running the application may not itself use all the env variables it depends on directly. Other packages it depends on may use their own variables, and some of those might depend on the same variables.

## How `@saflib/env` Works

If a package _needs_ an env variable, it should create an `env.schema.json` file in the same folder as its package.json. This file should look like this:

```
{
  "type": "object",
  "properties": {
    "MY_ENV_VARIABLE": {
      "type": "string",
      "description": "Description of what this is for."
    }
  },
  "required": ["MY_ENV_VARIABLE"]
}
```

It should be in this sort of JSON Schema format.

Run `npm exec saf-env generate` in that package to generate an `env.ts` file which will include TypeScript types that conform to the JSON Schema, combined with all `env.schema.json`s in dependencies of the package, and `process.env` cast to that type (always called `typedEnv`). At this point the package can import `typedEnv` and use it in logic and it will be type safe, according to the schema and all schemas in dependencies.

To regenerate all `env.ts` files in the workspace, run `npm exec saf-env generate-all`.

This only ensures type safety; to ensure env variables passed in at runtime are actually valid, a package will need to validate them to a combined schema.

To do this, go to whichever package is doing the validating (likely a `service` package) and run `npm exec saf-env generate -- --combined`. This will produce an `env.schema.combined.json` file which, like `env.ts`, will include the schemas of all the dependencies as well as anything defined by the package itself. That package can then `validateSchema` at the beginning of the runtime to enforce the schema.

The `generate` commands will update combined schemas that already exist. Use the `--combined` option just for generating them the first time.

## Core Env Variables

Some variables are so common throughout SAF, that this package provides them itself, so all packages have them available. See [Environmental Variables](./env/index.md) for the entire list.
