import type { components } from "@saflib/auth-spec";

export type LoginRequest = components["schemas"]["LoginRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type UserResponse = components["schemas"]["UserResponse"];
export type ForgotPasswordRequest =
  components["schemas"]["ForgotPasswordRequest"];
export type ForgotPasswordResponse =
  components["schemas"]["ForgotPasswordResponse"];
export type ResetPasswordRequest =
  components["schemas"]["ResetPasswordRequest"];
export type VerifyEmailRequest = components["schemas"]["VerificationRequest"];
