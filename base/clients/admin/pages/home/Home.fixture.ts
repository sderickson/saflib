import type { Page } from "@playwright/test";
// import { getByString } from "@saflib/playwright";
// TODO: Import strings from the page's strings file
// import { home as strings } from "./Home.strings.ts";

export class HomePageFixture {
  //@ts-ignore - TODO: Implement this fixture
  constructor(private page: Page) {}

  // TODO: Add helper methods for interacting with this page
  // Example:
  // async clickSomeButton(): Promise<void> {
  //   await getByString(this.page, strings.someButton).click();
  // }
}
