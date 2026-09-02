[**@saflib/vite**](../../index.md)

---

# Interface: MakeConfigProps

Arguments for makeConfig

## Properties

### appType?

> `optional` **appType**: `"spa"` \| `"mpa"`

appType: "spa" | "mpa"

---

### monorepoRoot?

> `optional` **monorepoRoot**: `string`

The absolute path of the root of the monorepo, to ensure vite has access to saflib packages.

---

### plugins?

> `optional` **plugins**: `PluginOption`[]

Additional plugins to include in the Vite config. Vue, Vuetify, VueDevTools, and a SPA proxy plugin are included by default.

---

### sourcemap?

> `optional` **sourcemap**: `boolean`

Emit `.js.map` files alongside chunks. Disable for production deploys where maps must not be served publicly (Sentry uploads may still use plugin defaults).

#### Default

```ts
true;
```

---

### useSubdomainProxy?

> `optional` **useSubdomainProxy**: `boolean`

Use subdomain proxy plugin

---

### vuetifySettings?

> `optional` **vuetifySettings**: `string`

Relative path (from process.cwd()) to the Vuetify Sass settings configFile
(`vuetify-settings.scss` — `@use "vuetify/settings" with (…)`).
