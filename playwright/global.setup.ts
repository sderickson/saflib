import { expect, test as setup } from "@playwright/test";

const serviceSubdomains = process.env.SERVICE_SUBDOMAINS?.split(",") || [];
const domain = process.env.DOMAIN;

setup("check docker service health", async ({ page }) => {
  let response;
  let attempts = 0;
  const maxAttempts = 50;

  let anyUnhealthy = false;
  while (attempts < maxAttempts) {
    anyUnhealthy = false;
    for (const serviceSubdomain of serviceSubdomains) {
      // uses @saflib/express's health middleware
      response = await page.goto(`http://${serviceSubdomain}.${domain}/health`);
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
