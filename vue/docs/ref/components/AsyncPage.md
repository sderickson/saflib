**@saflib/vue**

---

# AsyncPage

Source: `components/AsyncPage.vue`

## Props

| Name          | Type                                   | Default | Required | Description |
| ------------- | -------------------------------------- | ------- | -------- | ----------- |
| loader        | (() =&gt; LoaderQueries) \| undefined  | —       | no       | —           |
| pageComponent | Component                              | —       | yes      | —           |
| pageProps     | Record&lt;string, any&gt; \| undefined | —       | no       | —           |

## Slots

| Name  | Bindings                                    | Description |
| ----- | ------------------------------------------- | ----------- |
| error | &#123; error: TanstackError \| null; &#125; | —           |
