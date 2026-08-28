export interface EmailContent {
  subject: string;
  html: string;
}

export interface PasswordResetParams {
  recoveryCode: string;
  expiresInMinutes?: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function passwordReset(params: PasswordResetParams): EmailContent {
  const subject = "Reset your password";
  const code = escapeHtml(params.recoveryCode);
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
    .muted { color: #666; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${subject}</h1>
    <p>Use this recovery code to reset your password:</p>
    <p class="code">${code}</p>
    ${expiryNote}
    <p>If you did not request a password reset, you can ignore this email.</p>
    <p>Best regards,<br>Base</p>
  </div>
</body>
</html>
`;

  return { subject, html };
}
