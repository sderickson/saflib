import { describe, it, expect, vi } from "vitest";
import {
  stubGlobals,
  setupMockServer,
  getElementByString,
} from "@saflib/vue/testing";
import VerifyWallPageAsync from "./VerifyWallPageAsync.vue";
import { verify_wall_page as strings } from "./VerifyWallPage.strings.ts";
import { mountTestApp } from "../../test-app.ts";
import { identityServiceMockHandlers } from "../../mocks.ts";

describe("VerifyWallPage", () => {
  stubGlobals();

  const server = setupMockServer(identityServiceMockHandlers);
  expect(server).toBeDefined();

  it("should render the page with instructions", async () => {
    const wrapper = mountTestApp(VerifyWallPageAsync, {
      props: {
        redirectTo: "/",
      },
    });

    await vi.waitFor(() => getElementByString(wrapper, strings.title).exists());

    expect(getElementByString(wrapper, strings.title).exists()).toBe(true);
    expect(getElementByString(wrapper, strings.subtitle).exists()).toBe(true);
    expect(getElementByString(wrapper, strings.instructions).exists()).toBe(
      true,
    );
    expect(getElementByString(wrapper, strings.resend_email).exists()).toBe(
      true,
    );
  });
});
