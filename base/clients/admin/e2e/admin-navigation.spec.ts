import { expect } from "@playwright/test";
import { test as base } from "@playwright/test";
import { getUniqueEmail, getUniqueId } from "@saflib/playwright";
import {
  registrationPageFixture,
  type RegistrationPageFixture,
} from "@saflib/ory-kratos-spa/pages/registration/registration.fixture.ts";
import {
  baseFixture,
  type BaseFixture,
} from "@saflib/base-clients-common/fixtures";
import { adminLinks } from "@saflib/base-links";
import { home as homeStrings } from "../pages/home/Home.strings.ts";
import { users as usersStrings } from "../pages/users/Users.strings.ts";

type AdminNavigationFixtures = {
  baseApp: BaseFixture;
  registrationPage: RegistrationPageFixture;
};

const test = base.extend<AdminNavigationFixtures>({
  baseApp: baseFixture,
  registrationPage: registrationPageFixture,
});

function protocol(): string {
  return process.env.PROTOCOL ?? "http";
}

function domain(): string {
  return process.env.DOMAIN ?? "docker.localhost";
}

function adminUrl(path: string): string {
  return `${protocol()}://admin.${domain()}${path}`;
}

const sidebarPages: {
  path: string;
  assert: (page: import("@playwright/test").Page) => Promise<void>;
}[] = [
  {
    path: adminLinks.home.path,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: homeStrings.title }),
      ).toBeVisible();
    },
  },
  {
    path: adminLinks.users.path,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: usersStrings.title }),
      ).toBeVisible();
    },
  },
  {
    path: adminLinks.cronJobs.path,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Cron Jobs" }),
      ).toBeVisible();
    },
  },
  {
    path: adminLinks.jobs.path,
    assert: async (page) => {
      await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
    },
  },
  {
    path: adminLinks.emails.path,
    assert: async (page) => {
      await expect(
        page
          .getByText(
            /No emails have been sent yet\.|Last Mock Email|Time Sent|subject/i,
          )
          .first(),
      ).toBeVisible({ timeout: 30_000 });
    },
  },
  {
    path: adminLinks.logs.path,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Server Logs" }),
      ).toBeVisible();
    },
  },
  {
    path: adminLinks.metrics.path,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Metrics" }),
      ).toBeVisible();
    },
  },
  {
    path: adminLinks.events.path,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Product Events" }),
      ).toBeVisible();
    },
  },
  {
    path: adminLinks.errors.path,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Errors" }),
      ).toBeVisible();
    },
  },
  {
    path: adminLinks.audit.path,
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: "Audit log" }),
      ).toBeVisible();
    },
  },
];

test("admin navigation smoke", async ({
  page,
  baseApp,
  registrationPage,
}) => {
  test.setTimeout(180_000);

  const email = getUniqueEmail();
  // Unique password so Kratos HIBP / breach checks do not reject registration.
  const password = `Saf-E2e-${getUniqueId()}-Aa1!`;

  await baseApp.step("Register a session", async () => {
    await registrationPage.gotoRegistration();
    await registrationPage.toBeVisible();
    await registrationPage.completeRegistration(email, password);
    // Registration creates a session; leave the registration flow before admin.
    await expect(page).not.toHaveURL(/registration/, { timeout: 60_000 });
  });

  await baseApp.step("Open admin home", async () => {
    await page.goto(adminUrl(adminLinks.home.path));
    await expect(
      page.getByRole("heading", { name: homeStrings.title }),
    ).toBeVisible({ timeout: 30_000 });
  });

  for (const entry of sidebarPages) {
    await baseApp.step(`Visit ${entry.path}`, async () => {
      await page.goto(adminUrl(entry.path));
      await entry.assert(page);
    });
  }

  await baseApp.step("Users lookup form is interactive", async () => {
    await page.goto(adminUrl(adminLinks.users.path));
    await expect(
      page.getByRole("heading", { name: usersStrings.title }),
    ).toBeVisible();
    await page
      .getByLabel(usersStrings.id_label)
      .fill("22222222-2222-2222-2222-222222222222");
    await page.getByRole("button", { name: usersStrings.submit }).click();
    await expect(page).toHaveURL(/id=22222222-2222-2222-2222-222222222222/);
  });
});
