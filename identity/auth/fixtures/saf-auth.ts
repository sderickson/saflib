import { test as base, type Page } from "@playwright/test";
import { getUniqueEmail, getByString } from "@saflib/playwright";
import { authAppStrings } from "@saflib/auth/strings";
import { linkToHref } from "@saflib/links";
import { authLinks } from "@saflib/auth-links";
import { expect } from "@playwright/test";

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

export type SafAuthFixture = {
  safAuth: {
    /**
     * Register a new user or login if the user already exists.
     * @param options - Registration options
     * @returns The email address used for registration/login
     */
    registerUser: (options?: RegisterUserOptions) => Promise<string>;
    /**
     * Login with an existing user.
     * @param email - Email address
     * @param password - Password
     */
    login: (email: string, password: string) => Promise<void>;
  };
};

export const safAuthFixture = base.extend<SafAuthFixture>({
  safAuth: async ({ page }, use) => {
    const safAuth = {
      async registerUser(options: RegisterUserOptions = {}): Promise<string> {
        const userEmail = options.email || getUniqueEmail();
        const password = options.password || "asdfasdf";
        
        await page.setViewportSize({
          width: 430,
          height: 1000,
        });

        await page.goto("http://auth.power-up.docker.localhost/register");

        // Fill in email
        await getByString(
          page,
          authAppStrings.saflib_register_page.email,
        ).fill(userEmail);

        // Fill in additional fields if provided
        if (options.additionalFields) {
          for (const [labelText, value] of options.additionalFields) {
            await page.getByText(labelText, { exact: true }).nth(1).fill(value);
          }
        }

        // Fill in password fields
        await getByString(
          page,
          authAppStrings.saflib_register_page.password,
        ).fill(password);
        await getByString(
          page,
          authAppStrings.saflib_register_page.confirm_password,
        ).fill(password);

        // Click register button - try to find it by the register string
        await getByString(
          page,
          authAppStrings.saflib_register_page.register,
        ).click();

        // Check for either "Verify Your Email" or "Email already exists"
        const result = await Promise.race([
          page
            .getByText("Verify Your Email")
            .waitFor()
            .then(() => "verify"),
          page
            .getByText("Email already exists")
            .waitFor()
            .then(() => "exists"),
        ]).catch(() => "timeout");

        console.log("Registration result:", result);

        if (result === "exists") {
          // Email already exists, handle login
          if (options.handleExistingEmail) {
            await options.handleExistingEmail(page, userEmail, password);
          } else {
            // Default login flow
            await page.goto(linkToHref(authLinks.login));
            await getByString(
              page,
              authAppStrings.saflib_login_page.email,
            ).fill(userEmail);
            await page
              .getByRole("textbox", { name: "Password Password" })
              .fill(password);
            await getByString(
              page,
              authAppStrings.saflib_login_page.log_in,
            ).click();
            await getByString(page, "Welcome").waitFor();
          }
        } else if (result === "verify") {
          // Continue with email verification flow
          const shouldVerify =
            options.emailVerification?.verify !== false; // Default to true
          if (shouldVerify) {
            if (options.emailVerification?.verifyEmail) {
              await options.emailVerification.verifyEmail(page);
            } else {
              // Default verification flow
              await getByString(page, "Verify Your Email").waitFor();

              await page.goto(
                `http://admin.power-up.docker.localhost/mock-emails/last?subdomain=identity`,
              );
              await expect(
                page.getByRole("heading", { name: "PowerUp Email Verification" }),
              ).toBeVisible();

              await page
                .getByRole("link", { name: "Click Here to Verify Your Email" })
                .click();
              await getByString(
                page,
                authAppStrings.saflib_verify_email_page.verify_email_success,
              ).waitFor();
            }

            if (options.emailVerification?.continueAfterVerification) {
              await options.emailVerification.continueAfterVerification(page);
            } else {
              // Default continue flow
              await getByString(
                page,
                authAppStrings.saflib_verify_email_page.continue_to_app,
              ).click();
            }
          }
        }

        return userEmail;
      },

      async login(email: string, password: string): Promise<void> {
        await page.goto(linkToHref(authLinks.login));
        await getByString(page, authAppStrings.saflib_login_page.email).fill(
          email,
        );
        await page
          .getByRole("textbox", { name: "Password Password" })
          .fill(password);
        await getByString(
          page,
          authAppStrings.saflib_login_page.log_in,
        ).click();
        await getByString(page, "Welcome").waitFor();
      },
    };

    await use(safAuth);
  },
});
