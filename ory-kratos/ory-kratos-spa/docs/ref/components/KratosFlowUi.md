**@saflib/vue**

---

# KratosFlowUi

Source: `pages/common/KratosFlowUi.vue`

## Props

| Name                           | Type                                                                                      | Default         | Required | Description                                                                                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------- | --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flow                           | KratosFlowUiModel \| null \| undefined                                                    | —               | yes      | —                                                                                                                                                                                                                                                   |
| nodes                          | UiNode[] \| undefined                                                                     | —               | no       | When set, render these nodes instead of `flow.ui.nodes` (e.g. settings sidebar groups use a subset).                                                                                                                                                |
| submitting                     | boolean                                                                                   | —               | yes      | —                                                                                                                                                                                                                                                   |
| idPrefix                       | string \| undefined                                                                       | `"kratos-flow"` | no       | Prefix for element `id`s (`$&#123;idPrefix&#125;-$&#123;nodeIndex&#125;`).                                                                                                                                                                          |
| hideSubmitNames                | string[] \| undefined                                                                     | `[]`            | no       | Submit inputs to omit (e.g. in-flow resend when the page provides its own resend).                                                                                                                                                                  |
| messageFilter                  | ((message: UiText, context: KratosFlowUiMessageFilterContext) =&gt; boolean) \| undefined | —               | no       | Return false to hide a message. Used e.g. to soften Kratos "Property … is missing" on the first step of multi-field flows (registration: email → password).                                                                                         |
| interceptOryProgrammaticSubmit | boolean \| undefined                                                                      | `false`         | no       | Ory `webauthn.js` calls `form.submit()` after passkey/WebAuthn, which skips `submit` events. When true, patch this form so programmatic submit dispatches a cancelable event first (SPA `@submit.prevent` runs; see `kratosFormSubmitOryPatch.ts`). |
| identityPasskeyDisplayFallback | string \| undefined                                                                       | `undefined`     | no       | When Kratos labels a passkey as "unnamed" (no AAGUID display name), use this (e.g. account email) for remove-button copy instead.                                                                                                                   |

## Emits

| Name   | Payload                                                 | Description |
| ------ | ------------------------------------------------------- | ----------- |
| submit | [form: HTMLFormElement, submitter: HTMLElement \| null] | —           |

## Slots

| Name     | Bindings                                                                          | Description |
| -------- | --------------------------------------------------------------------------------- | ----------- |
| fieldset | &#123; displayNodes: readonly UiNode[]; allNodeIndices: readonly number[]; &#125; | —           |
| node     | &#123; node: UiNode; idx: number; &#125;                                          | —           |
