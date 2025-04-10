import type { EmailContent } from "./verify-email.ts";

export function generatePasswordResetEmail(resetUrl: string): EmailContent {
  const subject = "Reset Your Password";
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 3px; }
    .button:hover { background-color: #0056b3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${subject}</h1>
    <p>You recently requested to reset your password. Click the button below to proceed.</p>
    <p>
      <a href="${resetUrl}" class="button" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </p>
    <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a></p>
  </div>
</body>
</html>
`;
  return { subject, html };
}
