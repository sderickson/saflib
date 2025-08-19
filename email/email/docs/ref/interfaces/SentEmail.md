[**@saflib/email**](../index.md)

***

# Interface: SentEmail

A record of an email that was sent. Only used for mocking.

## Extends

- [`EmailOptions`](EmailOptions.md)

## Properties

### attachments?

> `optional` **attachments**: `Attachment`[]

An array of attachment objects

#### Inherited from

[`EmailOptions`](EmailOptions.md).[`attachments`](EmailOptions.md#attachments)

***

### bcc?

> `optional` **bcc**: `string` \| `Address` \| (`string` \| `Address`)[]

Comma separated list or an array of recipients e-mail addresses that will appear on the Bcc: field

#### Inherited from

[`EmailOptions`](EmailOptions.md).[`bcc`](EmailOptions.md#bcc)

***

### cc?

> `optional` **cc**: `string` \| `Address` \| (`string` \| `Address`)[]

Comma separated list or an array of recipients e-mail addresses that will appear on the Cc: field

#### Inherited from

[`EmailOptions`](EmailOptions.md).[`cc`](EmailOptions.md#cc)

***

### from?

> `optional` **from**: `string` \| `Address`

The e-mail address of the sender. All e-mail addresses can be plain 'sender@server.com' or formatted 'Sender Name <sender@server.com>'

#### Inherited from

[`EmailOptions`](EmailOptions.md).[`from`](EmailOptions.md#from)

***

### html?

> `optional` **html**: `string` \| `Buffer`\<`ArrayBufferLike`\> \| `Readable` \| `AttachmentLike`

The HTML version of the message

#### Inherited from

[`EmailOptions`](EmailOptions.md).[`html`](EmailOptions.md#html)

***

### replyTo?

> `optional` **replyTo**: `string` \| `Address` \| (`string` \| `Address`)[]

Comma separated list or an array of e-mail addresses that will appear on the Reply-To: field

#### Inherited from

[`EmailOptions`](EmailOptions.md).[`replyTo`](EmailOptions.md#replyto)

***

### subject?

> `optional` **subject**: `string`

The subject of the e-mail

#### Inherited from

[`EmailOptions`](EmailOptions.md).[`subject`](EmailOptions.md#subject)

***

### text?

> `optional` **text**: `string` \| `Buffer`\<`ArrayBufferLike`\> \| `Readable` \| `AttachmentLike`

The plaintext version of the message

#### Inherited from

[`EmailOptions`](EmailOptions.md).[`text`](EmailOptions.md#text)

***

### timeSent

> **timeSent**: `number`

***

### to?

> `optional` **to**: `string` \| `Address` \| (`string` \| `Address`)[]

Comma separated list or an array of recipients e-mail addresses that will appear on the To: field

#### Inherited from

[`EmailOptions`](EmailOptions.md).[`to`](EmailOptions.md#to)
