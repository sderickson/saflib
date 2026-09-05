**@saflib/vue**

---

# Settings

Source: `pages/settings/Settings.vue`

## Props

| Name           | Type                                                                    | Default           | Required | Description                                                                                                                        |
| -------------- | ----------------------------------------------------------------------- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| section        | "email" \| "password" \| "totp" \| "passkey" \| "sessions" \| undefined | —                 | no       | When set (typically with `embedded`), force this settings section and skip the in-page sidebar. Host layouts supply their own nav. |
| embedded       | boolean \| undefined                                                    | `false`           | no       | Hide intro + sidebar (account SPA nest).                                                                                           |
| flowCreatePath | string \| undefined                                                     | `"/new-settings"` | no       | Path used to restart an expired / CSRF settings flow.                                                                              |
| onTotpLinked   | (() => void) \| undefined                                               | —                 | no       | Called when TOTP is already linked or after a successful link (embedded hosts use this to advance onboarding).                     |
