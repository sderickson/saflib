[**@saflib/vendors-sentry-node**](../index.md)

---

# vite-build

## Interfaces

| Interface                                                                  | Description |
| -------------------------------------------------------------------------- | ----------- |
| [SentryViteBuildPluginOptions](interfaces/SentryViteBuildPluginOptions.md) | -           |

## Functions

| Function                                                                                      | Description                                                                                                                                                           |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [createSentryViteBuildPlugin](functions/createSentryViteBuildPlugin.md)                       | Vite plugin configuration for production builds: release from `saf-git-hashes`, optional `setCommits` when the tree is clean, and monorepo-relative source map paths. |
| [rewriteSentrySourcesToMonorepoRelative](functions/rewriteSentrySourcesToMonorepoRelative.md) | `sources` path rewrite for Sentry uploads: Rollup emits paths relative to each chunk under `dist/assets`; normalize to repo-relative paths for readable stack traces. |
