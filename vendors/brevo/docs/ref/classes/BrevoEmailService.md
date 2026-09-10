[**@saflib/vendors-brevo**](../index.md)

---

# Class: BrevoEmailService

Sends email via [Brevo transactional API](https://developers.brevo.com/reference/send-transac-email)
(`sendTransacEmail`). Pass `"mock"` as the API key to append to sentEmails without calling the API.

## Implements

- `EmailService`

## Constructors

### Constructor

> **new BrevoEmailService**(`apiKey`): `BrevoEmailService`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `apiKey`  | `string` |

#### Returns

`BrevoEmailService`

## Properties

### isMocked

> `readonly` **isMocked**: `boolean`

#### Implementation of

`EmailService.isMocked`

## Methods

### sendEmail()

> **sendEmail**(`options`): `Promise`\<`EmailResult`>\>

#### Parameters

| Parameter | Type           |
| --------- | -------------- |
| `options` | `EmailOptions` |

#### Returns

`Promise`\<`EmailResult`\>

#### Implementation of

`EmailService.sendEmail`
