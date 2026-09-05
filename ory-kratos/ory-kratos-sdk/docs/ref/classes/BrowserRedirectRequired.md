[**@saflib/ory-kratos-sdk**](../index.md)

---

# Class: BrowserRedirectRequired

Kratos responded with `redirect_browser_to` (e.g. AAL re-auth required, or
a browser-location-change after recovery). The caller should redirect to
`payload.redirect_browser_to` — that URL comes straight from Kratos.

## Constructors

### Constructor

> **new BrowserRedirectRequired**(`payload`): `BrowserRedirectRequired`

#### Parameters

| Parameter | Type                                 |
| --------- | ------------------------------------ |
| `payload` | `ErrorBrowserLocationChangeRequired` |

#### Returns

`BrowserRedirectRequired`

## Properties

### payload

> `readonly` **payload**: `ErrorBrowserLocationChangeRequired`
