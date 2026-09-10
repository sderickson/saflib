/**
 * Playwright page fixtures for Kratos auth flows.
 * Prefer this entry over deep `pages/.../*.fixture.ts` imports.
 */
export {
  LoginPageFixture,
  loginPageFixture,
} from "./pages/login/login.fixture.ts";
export {
  LogoutPageFixture,
  logoutPageFixture,
} from "./pages/logout/logout.fixture.ts";
export {
  RegistrationPageFixture,
  registrationPageFixture,
} from "./pages/registration/registration.fixture.ts";
export {
  VerifyWallPageFixture,
  verifyWallPageFixture,
} from "./pages/verify-wall/verify-wall.fixture.ts";
