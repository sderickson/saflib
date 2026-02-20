export * from "./requests/auth.ts";
export * from "./requests/users.ts";
export * from "./utils/rules.ts";
export { default as LoginPage } from "./pages/login/LoginPage.vue";
export { default as RegisterPage } from "./pages/register/RegisterPage.vue";
export { default as ForgotPasswordPage } from "./pages/forgot-password/ForgotPasswordPage.vue";
export { default as LogoutPage } from "./pages/logout/LogoutPage.vue";
export { default as ChangeForgottenPasswordPage } from "./pages/change-password-page/ChangeForgottenPasswordPage.vue";
export { default as VerifyEmailPage } from "./pages/verify-email/VerifyEmailPage.vue";
export { default as VerifyEmailPageAsync } from "./pages/verify-wall/VerifyWallPageAsync.vue";
export { default as UserAdmin } from "./pages/admin-users/UserAdmin.vue";
export { createAuthRouter } from "./auth-router.ts";
export {
  getRedirectTarget,
  clearRedirectTarget,
  validateAndRedirect,
  safeRedirect,
} from "./redirect.ts";

const currentDomain = window.location.origin;
const allowedRedirects = [`${currentDomain}/auth/verify-email`];

export const redirectAfterLogin = (defaultRedirect: string) => {
  if (window.location.href.includes("redirect")) {
    const url = atob(window.location.href.split("redirect=")[1]);
    for (const redirect of allowedRedirects) {
      if (url.startsWith(redirect)) {
        window.location.href = url;
        return;
      }
    }
  }
  window.location.href = defaultRedirect;
};
