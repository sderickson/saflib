import type { Page } from "@playwright/test";
import { getUniqueEmail, getByString } from "@saflib/playwright";
import { authAppStrings } from "@saflib/auth/strings";
import { expect } from "@playwright/test";

export type SafAuthFixtureOptions = {
  /**
   * Base domain for the application (e.g., "power-up.docker.localhost").
   */
  domain: string;
  /**
   * Auth subdomain. Defaults to "auth".
   */
  authSubdomain?: string;
  /**
   * Admin subdomain. Defaults to "admin".
   */
  adminSubdomain?: string;
};

export type RegisterUserOptions = {
  /**
   * Email address to use for registration. If not provided, a unique email will be generated.
   */
  email?: string;
  /**
   * Password to use for registration. Defaults to "asdfasdf".
   */
  password?: string;
  /**
   * Additional fields to fill during registration (e.g., company_name, company_phone).
   * Each entry should be a tuple of [labelText, value].
   */
  additionalFields?: Array<[string, string]>;
  /**
   * Options for handling email verification.
   */
  emailVerification?: {
    /**
     * Whether to verify the email automatically. Defaults to true.
     */
    verify?: boolean;
    /**
     * Function to navigate to mock emails page and verify email.
     * If not provided, defaults to navigating to admin mock emails.
     */
    verifyEmail?: (page: Page) => Promise<void>;
    /**
     * Function to check if verification was successful and continue to app.
     * If not provided, defaults to waiting for "Verify Your Email" success message.
     */
    continueAfterVerification?: (page: Page) => Promise<void>;
  };
  /**
   * Function to handle login if email already exists.
   * If not provided, defaults to standard login flow.
   */
  handleExistingEmail?: (page: Page, email: string, password: string) => Promise<void>;
};

export class SafAuthFixture {
  private authSubdomain: string;
  private adminSubdomain: string;
  private domain: string;

  constructor(
    private page: Page,
    options: SafAuthFixtureOptions,
  ) {
    this.domain = options.domain;
    this.authSubdomain = options.authSubdomain || "auth";
    this.adminSubdomain = options.adminSubdomain || "admin";
  }

  private getAuthUrl(path: string): string {
    return `http://${this.authSubdomain}.${this.domain}${path}`;
  }

  private getAdminUrl(path: string): string {
    return `http://${this.adminSubdomain}.${this.domain}${path}`;
  }

  /**
   * Register a new user or login if the user already exists.
   * @param options - Registration options
   * @returns The email address used for registration/login
   */
  async registerUser(options: RegisterUserOptions = {}): Promise<string> {
    const userEmail = options.email || getUniqueEmail();
    const password = options.password || "asdfasdf";

    await this.page.goto(this.getAuthUrl("/register"));

    // Fill in email
    await getByString(
      this.page,
      authAppStrings.saflib_register_page.email,
    ).fill(userEmail);

    // Fill in additional fields if provided
    if (options.additionalFields) {
      for (const [labelText, value] of options.additionalFields) {
        await this.page
          .getByText(labelText, { exact: true })
          .nth(1)
          .fill(value);
      }
    }

    // Fill in password fields
    await getByString(
      this.page,
      authAppStrings.saflib_register_page.password,
    ).fill(password);
    await getByString(
      this.page,
      authAppStrings.saflib_register_page.confirm_password,
    ).fill(password);

    // Click register button using test id
    await this.page.getByTestId("register-button").click();

    // Check for either "Verify Your Email" or "Email already exists"
    const result = await Promise.race([
      this.page
        .getByText("Verify Your Email")
        .waitFor()
        .then(() => "verify"),
      this.page
        .getByText("Email already exists")
        .waitFor()
        .then(() => "exists"),
    ]).catch(() => "timeout");

    console.log("Registration result:", result);

    if (result === "exists") {
      // Email already exists, handle login
      if (options.handleExistingEmail) {
        await options.handleExistingEmail(this.page, userEmail, password);
      } else {
        // Default login flow - reuse login function
        await this.login(userEmail, password);
      }
    } else if (result === "verify") {
      // Continue with email verification flow
      const shouldVerify =
        options.emailVerification?.verify !== false; // Default to true
      if (shouldVerify) {
        if (options.emailVerification?.verifyEmail) {
          await options.emailVerification.verifyEmail(this.page);
        } else {
          // Default verification flow
          await getByString(this.page, "Verify Your Email").waitFor();

          await this.page.goto(
            `${this.getAdminUrl("/mock-emails/last")}?subdomain=identity`,
          );
          await expect(
            this.page.getByRole("heading", {
              name: "PowerUp Email Verification",
            }),
          ).toBeVisible();

          await this.page
            .getByRole("link", { name: "Click Here to Verify Your Email" })
            .click();
          await getByString(
            this.page,
            authAppStrings.saflib_verify_email_page.verify_email_success,
          ).waitFor();
        }

        if (options.emailVerification?.continueAfterVerification) {
          await options.emailVerification.continueAfterVerification(
            this.page,
          );
        } else {
          // Default continue flow
          await getByString(
            this.page,
            authAppStrings.saflib_verify_email_page.continue_to_app,
          ).click();
        }
      }
    }

    return userEmail;
  }

  /**
   * Login with an existing user.
   * @param email - Email address
   * @param password - Password
   */
  async login(email: string, password: string): Promise<void> {
    await this.page.goto(this.getAuthUrl("/login"));
    await getByString(
      this.page,
      authAppStrings.saflib_login_page.email,
    ).fill(email);
    await this.page
      .getByRole("textbox", { name: "Password Password" })
      .fill(password);
    await getByString(
      this.page,
      authAppStrings.saflib_login_page.log_in,
    ).click();
    await getByString(this.page, "Welcome").waitFor();
  }
}
