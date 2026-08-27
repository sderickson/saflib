# Overview

`@saflib/env` provides some simple validation, typechecking, and CLI tools for env variables in SAF applications.

## The Problem

Environmental variables are standard inputs for running process. However, there isn't a standard way to specify what env variables a program expects, or what values it will accept.

In a monorepo system it's worse. The package responsible for running the application may not itself use all the env variables it depends on directly. Other packages it depends on may expect their own variables. And sometimes multiple packages depend on the same variables or all expect certain ones to exist (e.g. `NODE_ENV`). There isn't a way to see, for a service, what are all the env variables it can accept or requires.

## How `@saflib/env` Works

This package provides tools for

1. Specifying env variables for each package separately.
2. Combining those schemas into larger schemas, or TypeScript types for individual package use.
3. Validating those schemas at runtime.

If a package would use an env variable not provided by some dependency, it should create an `env.schema.json` file in its root directory. This file should be structured like this:

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

Run `npm exec saf-env generate` in that package to generate an `env.ts` file. The generated file:

- Declares an interface with **only this package's** schema properties.
- `import type`s and `extends` the env interfaces of its **env parents** (direct workspace dependencies that have `env.ts` / `env.schema.json`, or an explicit `saf.envExtends` list in `package.json`).
- Exports `typedEnv`, which is `process.env` cast to that composed type.

Packages should also export `./env` from `package.json` so dependents can import the generated types:

```json
"exports": {
  "./env": "./env.ts"
}
```

To ensure env variables passed in at runtime are _actually_ valid, a package will need to validate against a combined schema when the application begins.

To do this, go to whichever package is doing the validating (likely a `service` package or wherever execution begins) and run `npm exec saf-env generate -- --combined`. This will produce an `env.schema.combined.json` file which merges schemas along the same **env-parent graph** (not the full npm transitive closure of unrelated code dependencies). That package can then use `validateEnv` when the process begins. This function errors so the process will end if the environment is invalid.

To regenerate all existing `env.ts` and `env.schema.combined.json` files in the workspace, run `npm exec saf-env generate-all`.

### Explicit env parents

When a package depends on another package for code but should **not** inherit that package's env schema (for example `@saflib/sentry` depends on `@saflib/node` for git hashes, but client builds should not see server logging env), set:

```json
"saf": {
  "kind": "lib",
  "envExtends": ["@saflib/env"]
}
```

## Core Env Variables

Some variables are so common throughout SAF, that this package provides them itself, so all packages have them available. See [Environmental Variables](./env/index.md) for the entire list.
