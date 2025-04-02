import { createHandler } from "@saflib/node-express";
import { randomBytes } from "crypto";
import { ResponseSchema, ErrorResponse } from "@saflib/auth-spec";

export const resendVerificationHandler = createHandler(async (req, res) => {
  if (!req.user) {
    res
      .status(401)
      .json({ error: "User must be logged in" } satisfies ErrorResponse);
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

  const response: ResponseSchema<"resendVerification", 200> = {
    success: true,
    message: "Verification email sent",
  };
  res.status(200).json(response);
});
