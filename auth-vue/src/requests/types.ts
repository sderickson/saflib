import type { components, operations } from "@saflib/auth-spec";
import type { ExtractResponseSchema } from "@saflib/openapi-specs";
import type { ExtractRequestSchema } from "@saflib/openapi-specs";

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

// Export Request/Response schema types derived from operations
export type AuthResponse = ExtractResponseSchema<operations>;
export type AuthRequest = ExtractRequestSchema<operations>;
