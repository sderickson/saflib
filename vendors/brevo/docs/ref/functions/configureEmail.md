[**@saflib/vendors-brevo**](../index.md)

---

# Function: configureEmail()

> **configureEmail**(`store`): `Promise`\<`EmailService`>\>

Resolves a Brevo-backed EmailService from the secret store using
this package's `secrets.json`. Missing/empty secrets fall back to mock.

## Parameters

| Parameter | Type          |
| --------- | ------------- |
| `store`   | `SecretStore` |

## Returns

`Promise`\<`EmailService`\>
