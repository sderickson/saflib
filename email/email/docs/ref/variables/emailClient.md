[**@saflib/email**](../index.md)

***

# Variable: emailClient

> `const` **emailClient**: [`EmailClient`](../classes/EmailClient.md)

Global instance of the email client. Since the config is loaded by the
environment, and services shouldn't try to set up multiple SMTP connections,
this can be a singleton.
