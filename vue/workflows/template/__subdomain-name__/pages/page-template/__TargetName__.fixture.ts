import type { Page } from "@playwright/test";
// import { getByString } from "@saflib/playwright";
// TODO: Import strings from the page's strings file
// import { __target_name___page as strings } from "./__TargetName__.strings.ts";

export class __TargetName__PageFixture {
  //@ts-expect-error - TODO: Implement this fixture
  constructor(private page: Page) {}

  // TODO: Add helper methods for interacting with this page
  // Example:
  // async clickSomeButton(): Promise<void> {
  //   await getByString(this.page, strings.someButton).click();
  // }
}

export const __targetName__PageFixture = async (
  { page }: { page: Page },
  use: (fixture: __TargetName__PageFixture) => Promise<void>,
) => {
  await use(new __TargetName__PageFixture(page));
};
