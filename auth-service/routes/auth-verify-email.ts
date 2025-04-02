import { createHandler } from "@saflib/node-express";
import { createUserResponse } from "./helpers.ts";

export const verifyEmailHandler = createHandler(async (req, res) => {
  const { token } = req.body as { token: string };

  if (!token) {
    res.status(400).json({ message: "Verification token is required" });
    return;
  }

  try {
    // Get the email auth record by verification token
    const emailAuth = await req.db.emailAuth.getByVerificationToken(token);

    // Check if token is expired
    if (
      !emailAuth.verificationTokenExpiresAt ||
      emailAuth.verificationTokenExpiresAt < new Date()
    ) {
      res
        .status(400)
        .json({ message: "Invalid or expired verification token" });
      return;
    }

    // Verify the email
    await req.db.emailAuth.verifyEmail(emailAuth.userId);

    // Get the user and create response
    const user = await req.db.users.getById(emailAuth.userId);
    const userResponse = await createUserResponse(req.db, user);

    res.status(200).json(userResponse);
  } catch (err) {
    if (err instanceof req.db.emailAuth.VerificationTokenNotFoundError) {
      res
        .status(400)
        .json({ message: "Invalid or expired verification token" });
      return;
    }
    throw err; // Re-throw other errors to be handled by error middleware
  }
});
