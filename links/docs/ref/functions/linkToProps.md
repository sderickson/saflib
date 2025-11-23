[**@saflib/links**](../index.md)

---

# Function: linkToProps()

> **linkToProps**(`link`): \{ `href?`: `undefined`; `to`: `string`; \} \| \{ `href`: `string`; `to?`: `undefined`; \}

Given a Link object, return props which will work with vuetify components such as v-list-item and b-btn.
What is returned is based on the current domain; if the link is to the same subdomain, this returns a "to" prop,
otherwise it returns an "href" prop. That way a link will use vue-router wherever possible, to avoid full page
reloads.

The current domain is derived from the client name, which is also the subdomain.

## Parameters

| Parameter | Type                              |
| --------- | --------------------------------- |
| `link`    | [`Link`](../type-aliases/Link.md) |

## Returns

\{ `href?`: `undefined`; `to`: `string`; \} \| \{ `href`: `string`; `to?`: `undefined`; \}
