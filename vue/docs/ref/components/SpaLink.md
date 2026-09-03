**@saflib/vue**

---

# SpaLink

Convenience component to create a simple link using the Link type from @saflib/links. For the most part, use vuetify components such as v-btn, v-list-item, etc. and include `v-bind="linkToProps(linkObject)"`; they all have both "href" and "to" props, and linkToProps will return "href" if the link is to another subdomain, and "to" if the link is to the same subdomain. If you just want a simple piece-of-text link, though, this is your component.

Source: `components/SpaLink.vue`

## Props

| Name | Type | Default | Required | Description |
| ---- | ---- | ------- | -------- | ----------- |
| link | Link | —       | yes      | —           |

## Slots

| Name    | Bindings | Description |
| ------- | -------- | ----------- |
| default | {}       | —           |
