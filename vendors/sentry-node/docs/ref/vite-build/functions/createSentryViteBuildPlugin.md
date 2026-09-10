[**@saflib/vendors-sentry-node**](../../index.md)

---

# Function: createSentryViteBuildPlugin()

> **createSentryViteBuildPlugin**(`options`): `PluginOption`[]

Vite plugin configuration for production builds: release from `saf-git-hashes`, optional
`setCommits` when the tree is clean, and monorepo-relative source map paths.

Spread into `plugins`: `...createSentryViteBuildPlugin({ ... })`.

## Parameters

| Parameter | Type                                                                            |
| --------- | ------------------------------------------------------------------------------- |
| `options` | [`SentryViteBuildPluginOptions`](../interfaces/SentryViteBuildPluginOptions.md) |

## Returns

`PluginOption`[]
