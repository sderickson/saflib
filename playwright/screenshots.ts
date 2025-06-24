// test
import { test, type Page } from "@playwright/test";
import { unlink } from "fs/promises";
import { readdir } from "fs/promises";
import path, { dirname } from "path";

const countForTest: Record<string, number> = {};

interface ScreenshotOptions {
  fullPage?: boolean;
  type?: "jpeg" | "png";
}

export const cleanScreenshots = async () => {
  const browserName = test.info().project.name;
  const isChromium = browserName.includes("chromium");
  if (!isChromium) {
    return;
  }
  const directory = dirname(test.info().file);
  const title = test.info().title.replace(/\s+/g, "-");
  const files = await readdir(directory);
  for (const file of files) {
    if (
      file.startsWith(title) &&
      (file.endsWith(".png") || file.endsWith(".jpeg"))
    ) {
      await unlink(path.join(directory, file));
    }
  }
};

export const attachScreenshot = async (
  page: Page,
  options: ScreenshotOptions = {},
) => {
  const directory = dirname(test.info().file);
  const title = test.info().title.replace(/\s+/g, "-");
  const browserName = test.info().project.name;
  const count = countForTest[title] || 0;
  countForTest[title] = count + 1;
  const countStr = count.toString().padStart(3, "0");
  const type = options.type ?? "png";
  const filename = `${title}-${countStr}.${type}`;
  const isChromium = browserName.includes("chromium");

  /*
  There are two sets of screenshots:

  - One of just Chromium, adjacent to the test file. These are to be bundled with the docker
    image and deployed with the rest of the site to see what the current site looks like.
  - Screenshots for all browsers, those are in the playwright report folder.

  Setting a path puts the screenshot in both places, that's why p is only set for chromium.
  Neither set should be saved to the repo. Use .gitignore to ignore e2e screenshots.
  */
  const p = isChromium ? path.join(directory, filename) : undefined;

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  test.info().attach(filename, {
    body: await page.screenshot({
      fullPage: options.fullPage ?? true,
      path: p,
      scale: "css",
      animations: "disabled",
      type,
    }),
    contentType: `image/${type}`,
  });
};
