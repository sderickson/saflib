**@saflib/vue**

---

# RegistrationFlowForm

Source: `pages/registration/RegistrationFlowForm.vue`

## Props

| Name              | Type                                                                       | Default | Required | Description |
| ----------------- | -------------------------------------------------------------------------- | ------- | -------- | ----------- |
| flow              | RegistrationFlow                                                           | —       | yes      | —           |
| beforeSubmit      | ((fd: FormData) => string \| Promise<string \| null> \| null) \| undefined | —       | no       | —           |
| afterRegistration | ((fd: FormData) => void \| Promise<void>) \| undefined                     | —       | no       | —           |

## Slots

| Name          | Bindings                 | Description |
| ------------- | ------------------------ | ----------- |
| before-fields | { submitting: boolean; } | —           |
| before-submit | { submitting: boolean; } | —           |
