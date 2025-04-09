export interface EmailContent {
  subject: string;
  html: string;
}

export function generateVerificationEmail(
  verificationUrl: string,
): EmailContent {
  const subject = "Verify Your Email Address";
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
    <p>Thanks for signing up! Please click the button below to verify your email address and complete your registration.</p>
    <p>
      <a href="${verificationUrl}" class="button" target="_blank" rel="noopener noreferrer">Verify Email</a>
    </p>
    <p>If you did not sign up for this account, you can safely ignore this email.</p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p><a href="${verificationUrl}" target="_blank" rel="noopener noreferrer">${verificationUrl}</a></p>
  </div>
</body>
</html>
`;
  return { subject, html };
}
