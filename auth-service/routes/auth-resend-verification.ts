import { createHandler } from "@saflib/node-express";
import { randomBytes } from "crypto";

export const resendVerificationHandler = createHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "User must be logged in" });
    return;
  }

  // Generate new verification token
  const verificationToken = randomBytes(32).toString("hex");
  const verificationTokenExpiresAt = new Date();
  verificationTokenExpiresAt.setMinutes(
    verificationTokenExpiresAt.getMinutes() + 15,
  ); // 15 minute expiration

  // Update verification token
  await req.db.emailAuth.updateVerificationToken(
    req.user.id,
    verificationToken,
    verificationTokenExpiresAt,
  );

  // Log the verification link (in production this would send an email)
  req.log.info(
    `Verification link: ${process.env.PROTOCOL}://${process.env.DOMAIN}/auth/verify-email?token=${verificationToken}`,
  );

  res.status(200).json({ message: "Verification email sent" });
});
