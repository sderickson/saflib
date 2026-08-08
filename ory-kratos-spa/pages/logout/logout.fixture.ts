import { expect, type Page } from "@playwright/test";

/**
 * Navigation helpers for {@link ./LogoutAsync.vue} (browser logout flow; redirects via Kratos).
 */
export class LogoutPageFixture {
  constructor(public readonly page: Page) {}

  /**
   * Runs browser logout on the auth host and waits until the browser has reached {@link returnTo}
   * (defaults to site root: {@link process.env.PROTOCOL}://{@link process.env.DOMAIN}/).
   */
  async gotoLogout(options?: { returnTo?: string }): Promise<void> {
    const protocol = process.env.PROTOCOL ?? "http";
    const domain = process.env.DOMAIN ?? "app.docker.localhost";
    const siteRoot = `${protocol}://${domain}/`;
    const returnTo = options?.returnTo ?? siteRoot;
    const url = `${protocol}://auth.${domain}/logout?return_to=${encodeURIComponent(returnTo)}`;
    await this.page.goto(url);

    const target = new URL(returnTo);
    const normPath = (p: string) => p.replace(/\/$/, "") || "/";
    await expect(this.page).toHaveURL((u) => {
      if (u.hostname !== target.hostname) {
        return false;
      }
      return normPath(u.pathname) === normPath(target.pathname);
    });
  }
}

export const logoutPageFixture = async (
  { page }: { page: Page },
  use: (fixture: LogoutPageFixture) => Promise<void>,
) => {
  await use(new LogoutPageFixture(page));
};
