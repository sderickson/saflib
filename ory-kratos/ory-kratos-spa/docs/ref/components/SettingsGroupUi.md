**@saflib/vue**

---

# SettingsGroupUi

Source: `pages/settings/SettingsGroupUi.vue`

## Props

| Name                           | Type                                                                                      | Default | Required | Description                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------- |
| flow                           | SettingsFlow                                                                              | —       | yes      | —                                                                                               |
| group                          | "password" \| "totp" \| "passkey" \| "profile"                                            | —       | yes      | —                                                                                               |
| submitting                     | boolean                                                                                   | —       | yes      | —                                                                                               |
| idPrefix                       | string                                                                                    | —       | yes      | —                                                                                               |
| messageFilter                  | ((message: UiText, context: KratosFlowUiMessageFilterContext) =&gt; boolean) \| undefined | —       | no       | —                                                                                               |
| identityPasskeyDisplayFallback | string \| undefined                                                                       | —       | no       | Passkey remove-button label fallback when Kratos has no AAGUID display name (see KratosFlowUi). |

## Emits

| Name   | Payload                                                 | Description |
| ------ | ------------------------------------------------------- | ----------- |
| submit | [form: HTMLFormElement, submitter: HTMLElement \| null] | —           |
