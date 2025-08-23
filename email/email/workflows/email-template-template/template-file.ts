export interface EmailContent {
  subject: string;
  html: string;
}

export function templateFile(): EmailContent {
  /* TODO: Add parameters here, e.g.:
  recipientName: string,
  data: any,
  */
  const subject = "TODO: Add your email subject";

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
    <p>TODO: Add your email content here.</p>
    
    <!-- Example button (remove if not needed) -->
    <p>
      <a href="#" class="button" target="_blank" rel="noopener noreferrer">Call to Action</a>
    </p>
    
    <p>Best regards,<br>Your Team</p>
  </div>
</body>
</html>
`;

  return { subject, html };
}
