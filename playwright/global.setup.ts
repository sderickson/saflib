import { expect, test as setup } from "@playwright/test";

/** API host health-checked before e2e (matches product Caddy `api.{DOMAIN}`). */
const serviceSubdomains = ["api"] as const;
const domain = process.env.DOMAIN;
const protocol = process.env.PROTOCOL;

setup("check docker service health", async ({ page }) => {
  let response;
  let attempts = 0;
  const maxAttempts = 50;

  let anyUnhealthy = false;
  while (attempts < maxAttempts) {
    anyUnhealthy = false;
    for (const serviceSubdomain of serviceSubdomains) {
      // uses @saflib/express's health middleware
      const url = `${protocol}://${serviceSubdomain}.${domain}/health`;
      response = await page.goto(url);
      console.log(`Response from ${url}: ${response?.status()}`);
      if (response && response.status() !== 200) {
        anyUnhealthy = true;
        break;
      }
    }
    if (anyUnhealthy === false) {
      break;
    }
    await page.waitForTimeout(200);
    attempts++;
  }

  expect(anyUnhealthy).toBe(false);
});
