[**@saflib/vite**](../index.md)

---

# Interface: MakeConfigProps

Arguments for makeConfig

## Properties

### monorepoRoot?

> `optional` **monorepoRoot**: `string`

The absolute path of the root of the monorepo, to ensure vite has access to saflib packages.

---

### plugins?

> `optional` **plugins**: `PluginOption`[]

Additional plugins to include in the Vite config. Vue, Vuetify, VueDevTools, and a SPA proxy plugin are included by default.

---

### vuetifySettings?

> `optional` **vuetifySettings**: `string`

A relative path (from process.cwd()) to the Vuetify Sass settings configFile
(`vuetify-settings.scss`).
