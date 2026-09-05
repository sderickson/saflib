**@saflib/vue**

---

# UsPhoneNumberInput

US phone number input that displays +1 formatting in the field and emits values in E.164 format for API calls.

Source: `components/UsPhoneNumberInput.vue`

## Models

| Name       | Type                | Default | Required | Description                                                  |
| ---------- | ------------------- | ------- | -------- | ------------------------------------------------------------ |
| modelValue | string \| undefined | `""`    | no       | v-model value in E.164 format (for example, `+15551234567`). |

## Props

| Name          | Type                                                  | Default            | Required | Description                                                                  |
| ------------- | ----------------------------------------------------- | ------------------ | -------- | ---------------------------------------------------------------------------- |
| rules         | ((value: string) => string \| boolean)[] \| undefined | `[]`               | no       | Additional Vuetify validation rules appended after the built-in phone rules. |
| required      | boolean \| undefined                                  | `false`            | no       | When true, the built-in phone validation treats the field as required.       |
| label         | string \| undefined                                   | `"Phone Number"`   | no       | Label shown on the underlying `v-text-field`.                                |
| placeholder   | string \| undefined                                   | `"(555) 123-4567"` | no       | Placeholder shown when the field is empty.                                   |
| errorMessages | string[] \| undefined                                 | `[]`               | no       | External error messages passed through to `v-text-field`.                    |

## Exposed

| Name  | Type       | Description                              |
| ----- | ---------- | ---------------------------------------- |
| focus | () => void | Focus the underlying Vuetify text field. |
