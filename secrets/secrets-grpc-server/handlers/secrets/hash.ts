import crypto from "crypto";

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
