export interface EmailContent {
  subject: string;
  html: string;
}

export interface VerifyEmailParams {
  verificationCode: string;
  verificationUrl?: string;
  expiresInMinutes?: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function verifyEmail(params: VerifyEmailParams): EmailContent {
  const subject = "Verify your email address";
  const code = escapeHtml(params.verificationCode);
  const verificationLink = params.verificationUrl
    ? `<p><a class="button" href="${escapeHtml(params.verificationUrl)}">Verify email</a></p>`
    : "";
  const expiryNote =
    params.expiresInMinutes != null
      ? `<p class="muted">This code expires in ${params.expiresInMinutes} minutes.</p>`
      : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; margin: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 24px; background: #fff; border: 1px solid #ddd; border-radius: 8px; }
    .code { font-size: 1.5rem; letter-spacing: 0.2em; font-weight: 600; margin: 16px 0; }
    .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff !important; text-decoration: none; border-radius: 4px; }
    .button:hover { background-color: #0056b3; }
    .muted { color: #666; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${subject}</h1>
    <p>Use this verification code to confirm your email address:</p>
    <p class="code">${code}</p>
    ${verificationLink}
    ${expiryNote}
    <p>If you did not create an account, you can ignore this email.</p>
    <p>Best regards,<br>Base</p>
  </div>
</body>
</html>
`;

  return { subject, html };
}
