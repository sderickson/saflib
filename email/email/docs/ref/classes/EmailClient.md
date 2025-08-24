[**@saflib/email**](../index.md)

***

# Class: EmailClient

A simplified client for sending emails, wrapping around nodemailer (or a mock in during tests).

## Constructors

### Constructor

> **new EmailClient**(): `EmailClient`

#### Returns

`EmailClient`

## Methods

### sendEmail()

> **sendEmail**(`options`): `Promise`\<[`EmailResult`](../interfaces/EmailResult.md)\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`EmailOptions`](../interfaces/EmailOptions.md) |

#### Returns

`Promise`\<[`EmailResult`](../interfaces/EmailResult.md)\>
