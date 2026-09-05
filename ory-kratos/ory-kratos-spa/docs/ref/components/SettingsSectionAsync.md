**@saflib/vue**

---

# SettingsSectionAsync

Source: `pages/settings/SettingsSectionAsync.vue`

## Props

| Name    | Type                                                       | Default | Required | Description                                                                                                                        |
| ------- | ---------------------------------------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| section | "email" \| "password" \| "totp" \| "passkey" \| "sessions" | —       | yes      | Account (or host) settings section to show. Maps to former settings `tab=` values (`email` \| `password` \| `totp` \| `sessions`). |

## Emits

| Name        | Payload | Description |
| ----------- | ------- | ----------- |
| totp-linked | []      | —           |
