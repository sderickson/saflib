/**
 * Host-facing verification building blocks (e.g. account email-verification embed).
 */
export { default as VerificationAsync } from "./pages/verification/VerificationAsync.vue";
export { default as NewVerificationAsync } from "./pages/new-verification/NewVerificationAsync.vue";
export { parseVerificationFlowIdFromQuery } from "./pages/verification/Verification.logic.ts";
