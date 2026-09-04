import type { KratosCourierCallbacks } from "@saflib/ory-kratos-http";
import { onRecoveryCodeValid } from "./on-recovery-code-valid.ts";
import { onVerificationCodeValid } from "./on-verification-code-valid.ts";

export const callbacks: KratosCourierCallbacks = {
  onVerificationCodeValid,
  onRecoveryCodeValid,
};

/** @deprecated Use {@link callbacks} instead. */
export const courierCallbacks = callbacks;
