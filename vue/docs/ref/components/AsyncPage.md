**@saflib/vue**

---

# AsyncPage

Source: `components/AsyncPage.vue`

## Props

| Name          | Type                               | Default | Required | Description |
| ------------- | ---------------------------------- | ------- | -------- | ----------- |
| loader        | (() => LoaderQueries) \| undefined | —       | no       | —           |
| pageComponent | Component                          | —       | yes      | —           |
| pageProps     | Record<string, any> \| undefined   | —       | no       | —           |

## Slots

| Name  | Bindings                          | Description |
| ----- | --------------------------------- | ----------- |
| error | { error: TanstackError \| null; } | —           |
