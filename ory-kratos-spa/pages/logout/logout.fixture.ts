import type { Page } from "@playwright/test";

/**
 * Navigation helpers for {@link ./LogoutAsync.vue} (browser logout flow; redirects via Kratos).
 */
export class LogoutPageFixture {
  constructor(public readonly page: Page) {}

  /**
   * Starts logout on the auth host. After Kratos finishes, the browser typically lands on the site
   * root or {@link returnTo} when passed as `?return_to=`.
   */
  async gotoLogout(options?: { returnTo?: string }): Promise<void> {
    const protocol = process.env.PROTOCOL ?? "http";
    const domain = process.env.DOMAIN ?? "daemon.docker.localhost";
    let url = `${protocol}://auth.${domain}/logout`;
    if (options?.returnTo) {
      url += `?return_to=${encodeURIComponent(options.returnTo)}`;
    }
    await this.page.goto(url);
  }
}

export const logoutPageFixture = async (
  { page }: { page: Page },
  use: (fixture: LogoutPageFixture) => Promise<void>,
) => {
  await use(new LogoutPageFixture(page));
};
