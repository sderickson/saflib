[**@saflib/email**](../index.md)

---

# Interface: EmailOptions

Accepted options when sending an email. A subset of what nodemailer accepts.
See [Nodemailer docs](https://nodemailer.com/message/) for more details.

## Extends

- `Pick`\<`nodemailer.SendMailOptions`, `"to"` \| `"cc"` \| `"bcc"` \| `"subject"` \| `"text"` \| `"html"` \| `"attachments"` \| `"from"` \| `"replyTo"`\>

## Extended by

- [`SentEmail`](SentEmail.md)

## Properties

### attachments?

> `optional` **attachments**: `Attachment`[]

An array of attachment objects

#### Inherited from

`Pick.attachments`

---

### bcc?

> `optional` **bcc**: `string` \| `Address` \| (`string` \| `Address`)[]

Comma separated list or an array of recipients e-mail addresses that will appear on the Bcc: field

#### Inherited from

`Pick.bcc`

---

### cc?

> `optional` **cc**: `string` \| `Address` \| (`string` \| `Address`)[]

Comma separated list or an array of recipients e-mail addresses that will appear on the Cc: field

#### Inherited from

`Pick.cc`

---

### from?

> `optional` **from**: `string` \| `Address`

The e-mail address of the sender. All e-mail addresses can be plain 'sender@server.com' or formatted 'Sender Name <sender@server.com>'

#### Inherited from

`Pick.from`

---

### html?

> `optional` **html**: `string` \| `Buffer`\<`ArrayBufferLike`\> \| `Readable` \| `AttachmentLike`

The HTML version of the message

#### Inherited from

`Pick.html`

---

### replyTo?

> `optional` **replyTo**: `string` \| `Address` \| (`string` \| `Address`)[]

Comma separated list or an array of e-mail addresses that will appear on the Reply-To: field

#### Inherited from

`Pick.replyTo`

---

### subject?

> `optional` **subject**: `string`

The subject of the e-mail

#### Inherited from

`Pick.subject`

---

### text?

> `optional` **text**: `string` \| `Buffer`\<`ArrayBufferLike`\> \| `Readable` \| `AttachmentLike`

The plaintext version of the message

#### Inherited from

`Pick.text`

---

### to?

> `optional` **to**: `string` \| `Address` \| (`string` \| `Address`)[]

Comma separated list or an array of recipients e-mail addresses that will appear on the To: field

#### Inherited from

`Pick.to`
