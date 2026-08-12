# Package scripts and platform bins

SAF packages expose tooling through npm `bin` entries (usually `saf-*`). Product and library packages should call those bins from their own `package.json` `scripts`, rather than re-implementing the same pipelines.

## Pattern

1. **Platform owns the toolchain** — implement logic once behind a `bin` in a `@saflib/*` package (often with `@saflib/commander` + `setupContext`).
2. **Package owns the inputs** — OpenAPI YAML, Drizzle schemas, `./bin/ping.ts`, compose templates, etc. stay in the consuming package.
3. **One-line scripts** — the package script is a thin call to the platform bin.

Ideal example:

```json
{
  "scripts": {
    "build": "saf-specs generate -f openapi.yaml -o dist"
  },
  "dependencies": {
    "@saflib/openapi": "*"
  }
}
```

Declare a dependency on the package that provides the bin so workspace linking puts it on PATH when you run `npm run …` from that package.

## How to invoke

| Context | Form | Example |
|---------|------|---------|
| `package.json` scripts | Direct bin name | `"build": "saf-specs generate …"` |
| Agent workflows / any cwd | `npm exec` | `npm exec saf-specs generate` |
| Never | `npm run saf-*` | `npm run saf-specs` — bins are not npm scripts |

Generated-file headers and workflow steps should keep using `npm exec` so they resolve correctly outside a package that depends on the bin.

## Common platform bins

| Bin | Package | Typical package script |
|-----|---------|------------------------|
| `saf-specs` | `@saflib/openapi` | `"build": "saf-specs generate -f openapi.yaml -o dist"` |
| `saf-env` | `@saflib/env` | (often via `npm exec saf-env generate`) |
| `saf-docker` | `@saflib/dev-tools` | `"generate": "saf-docker generate"` |
| `saf-git-hashes` | `@saflib/dev-tools` | used in `dev`/`up` chains |
| `saf-ts-run` | `@saflib/dev-tools` | `"ping": "saf-ts-run ./bin/ping.ts"` |
| `saf-workflow` | `@saflib/workflows-cli` | kickoff / next (prefer `npm exec`) |
| `saf-docs` | `@saflib/dev-tools` | docs generation |
| `saf-tests` | `@saflib/dev-tools` | coverage / test assets |
| `saf-imports` | `@saflib/imports` | import-graph tooling |
| `saf-format` | `@saflib/monorepo` | Prettier wrapper |

## When to add a new bin

Add a platform bin when:

- The same multi-step command appears in several packages, **or**
- You need shared monorepo behavior (logging via `setupContext`, fragment generation, env headers, generate-all), **or**
- Product packages would otherwise paste third-party CLI chains by hand (e.g. re-listing `redocly` + `openapi-typescript` instead of `saf-specs`).

Do **not** wrap every third-party CLI just for naming. Bare `"generate": "drizzle-kit generate"` or `"test": "vitest run"` is fine when the package only needs the upstream tool.

## Adding a CLI with Commander

Use [`commander/add-cli`](./workflows/add-cli.md) to scaffold a bin, then wire it in `package.json`:

```json
{
  "bin": {
    "saf-example": "./bin/saf-example/index.ts"
  }
}
```

Entry files should use the Node strip-types shebang and `setupContext` from this package — see existing `saf-specs` / `saf-docker` CLIs.

## Anti-patterns

- Re-implementing a platform pipeline in a product `package.json` script.
- Calling a bin from a package that does not depend on the providing `@saflib/*` package (fragile hoisting).
- Documenting `npm run saf-*` when `saf-*` is only a bin.
- Putting product/host-specific deploy orchestration into saflib — keep that in the product `deploy/` package; call platform bins from there when needed.
