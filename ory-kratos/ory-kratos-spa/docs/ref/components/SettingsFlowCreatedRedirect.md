**@saflib/vue**

---

# SettingsFlowCreatedRedirect

Source: `pages/settings/SettingsFlowCreatedRedirect.vue`

## Props

| Name         | Type                                                                            | Default | Required | Description                                                                  |
| ------------ | ------------------------------------------------------------------------------- | ------- | -------- | ---------------------------------------------------------------------------- |
| result       | SettingsFlowCreated                                                             | —       | yes      | —                                                                            |
| settingsPath | string \| undefined                                                             | —       | no       | Path to open after flow creation (defaults to `/settings` for the auth SPA). |
| tab          | "email" \| "password" \| "totp" \| "passkey" \| "sessions" \| null \| undefined | —       | no       | Optional tab query when using the auth SPA settings shell.                   |
