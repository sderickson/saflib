[**@saflib/vendors-sentry-node**](../../index.md)

---

# Interface: SentryViteBuildPluginOptions

## Properties

### authToken

> **authToken**: `string`

Organization auth token for source map upload (build-time only).

---

### githubRepoSlug

> **githubRepoSlug**: `string`

GitHub `owner/repo` as linked in Sentry (Integrations → GitHub), used for `release.setCommits`.

---

### monorepoRoot

> **monorepoRoot**: `string`

Absolute monorepo root; source maps are rewritten to paths relative to this directory.

---

### org

> **org**: `string`

Sentry org slug.

---

### project

> **project**: `string`

Sentry project slug for this frontend bundle.
