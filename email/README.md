# @saflib/email

Centralized package for sending emails via SMTP using nodemailer.

## Installation

```bash
npm install @saflib/email -w @your-org/your-service
```

## Usage

```typescript
import { createEmailClient } from "@saflib/email";

const emailClient = createEmailClient(); // Reads config from env vars

async function sendWelcomeEmail(to: string) {
  try {
    const result = await emailClient.sendEmail({
      to,
      subject: "Welcome!",
      text: "Welcome to our service!",
      html: "<p>Welcome to our service!</p>",
    });
    console.log("Email sent:", result.messageId);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
```

## Configuration

The following environment variables are used for configuration:

- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (defaults to 587 for TLS, 465 for SSL, 25 otherwise)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SMTP_SECURE`: Use TLS/SSL (boolean, defaults based on port)
- `EMAIL_FROM`: Default 'From' address for emails
