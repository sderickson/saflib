**@saflib/vue**

---

# RegistrationFlowForm

Source: `pages/registration/RegistrationFlowForm.vue`

## Props

| Name              | Type                                                                                | Default | Required | Description |
| ----------------- | ----------------------------------------------------------------------------------- | ------- | -------- | ----------- |
| flow              | RegistrationFlow                                                                    | —       | yes      | —           |
| beforeSubmit      | ((fd: FormData) =&gt; string \| Promise&lt;string \| null&gt; \| null) \| undefined | —       | no       | —           |
| afterRegistration | ((fd: FormData) =&gt; void \| Promise&lt;void&gt;) \| undefined                     | —       | no       | —           |

## Slots

| Name          | Bindings                           | Description |
| ------------- | ---------------------------------- | ----------- |
| before-fields | &#123; submitting: boolean; &#125; | —           |
| before-submit | &#123; submitting: boolean; &#125; | —           |
