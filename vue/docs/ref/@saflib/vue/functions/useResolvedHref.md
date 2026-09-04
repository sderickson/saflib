[**@saflib/vue**](../../../index.md)

---

# Function: useResolvedHref()

## Call Signature

> **useResolvedHref**(`link`, `options?`): `Ref`\<`string`>>\>

Resolves a multi-subdomain href for use in prerendered (SSG) Vue pages.

During the static build, `linkToHrefWithHost` may only know paths; after
`onMounted`, it runs again in the browser and produces full URLs. A second
assignment after mount also forces the DOM to update when Vuetify or
hydration would otherwise leave stale `href` attributes.

**VitePress / SSR:** import from `@saflib/vue/useResolvedHref`, not the
`@saflib/vue` package root — the main entry pulls in modules that touch
`document` at load time and break Node prerender.

### Parameters

| Parameter  | Type          |
| ---------- | ------------- |
| `link`     | `Link`        |
| `options?` | `LinkOptions` |

### Returns

`Ref`\<`string`\>

## Call Signature

> **useResolvedHref**(`resolve`): `Ref`\<`string`>>\>

Resolves a multi-subdomain href for use in prerendered (SSG) Vue pages.

During the static build, `linkToHrefWithHost` may only know paths; after
`onMounted`, it runs again in the browser and produces full URLs. A second
assignment after mount also forces the DOM to update when Vuetify or
hydration would otherwise leave stale `href` attributes.

**VitePress / SSR:** import from `@saflib/vue/useResolvedHref`, not the
`@saflib/vue` package root — the main entry pulls in modules that touch
`document` at load time and break Node prerender.

### Parameters

| Parameter | Type           |
| --------- | -------------- |
| `resolve` | () => `string` |

### Returns

`Ref`\<`string`\>
