# Environment Variables

`@saflib/vite` does not declare its own `env.schema.json`. [`typedEnv`](../ref/env/variables/typedEnv.md) casts `process.env` to [`ViteEnvSchema`](../ref/env/interfaces/ViteEnvSchema.md), which extends the core schema from [`@saflib/env`](../env/docs/env/index.md).

Client **build** packages validate env at config load time (see [`base/clients/build/vite.config.ts`](../../base/clients/build/vite.config.ts)) using a combined schema from dependencies.

## Variables used by `makeConfig`

| Variable            | Role                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CLIENT_SUBDOMAINS` | Comma-separated SPA subdomains (e.g. `app,auth,admin,account,`). Empty segment = apex client at root `index.html`. Drives Rollup inputs and dev subdomain routing. |
| `DOMAIN`            | Product domain (e.g. `example.docker.localhost`)                                                                                                                   |
| `PROTOCOL`          | `http` or `https` — used for dev URL banner and origin helpers                                                                                                     |

Other core vars (`DEPLOYMENT_NAME`, `NODE_ENV`, `TZ`, …) are inherited for typing and for merged `define` blocks in product build configs. Full definitions: [@saflib/env — Environment Variables](../env/docs/env/index.md).

Add new Vite-specific variables on `@saflib/vite` with [env/add-var](../env/docs/workflows/add-var.md), or on the product build package if they are product-only.
