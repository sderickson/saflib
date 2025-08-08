import { change_forgotten_password_page } from "./pages/change-password-page/ChangeForgottenPasswordPage.strings";
import { forgot_password_page } from "./pages/forgot-password/ForgotPasswordPage.strings";
import { login_page } from "./pages/login/LoginPage.strings";
import { register_page } from "./pages/register/RegisterPage.strings";
import { verify_email_page } from "./pages/verify-email/VerifyEmailPage.strings";
import { makeReverseTComposable } from "@saflib/vue-spa";

export const authAppStrings = {
  change_forgotten_password_page,
  forgot_password_page,
  login_page,
  register_page,
  verify_email_page,
};

export const useReverseT = makeReverseTComposable(authAppStrings);
