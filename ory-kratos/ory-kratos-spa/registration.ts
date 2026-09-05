/**
 * Host-facing registration building blocks for overriding the default
 * registration route (e.g. product-owned fields above the Kratos form).
 */
export { default as RegistrationFlowForm } from "./pages/registration/RegistrationFlowForm.vue";
export { default as RegistrationAsync } from "./pages/registration/RegistrationAsync.vue";
export { useRegistrationLoader } from "./pages/registration/Registration.loader.ts";
export { registrationFlowHidingPasskeySignup } from "./pages/registration/kratosRegistrationPasskeyUi.logic.ts";
export type { UseRegistrationFlowOptions } from "./pages/registration/useRegistrationFlow.ts";

export { default as RegistrationCsrfViolationPanel } from "./pages/common/CsrfViolationPanel.vue";
export { default as RegistrationFlowGonePanel } from "./pages/common/FlowGonePanel.vue";
export { default as RegistrationUnhandledResponsePanel } from "./pages/common/UnhandledResponsePanel.vue";
