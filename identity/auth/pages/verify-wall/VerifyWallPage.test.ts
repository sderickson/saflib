import { describe, it, expect, vi } from "vitest";
import { stubGlobals, setupMockServer } from "@saflib/vue-spa/testing";
import VerifyWallPageAsync from "./VerifyWallPageAsync.vue";
import { verify_wall_page as strings } from "./VerifyWallPage.strings.ts";
import { getElementByString } from "@saflib/vue-spa/testing";
import { http, HttpResponse } from "msw";
import type { AuthResponseBody } from "@saflib/identity-spec";
import { mountTestApp } from "../../test-app.ts";

const handlers = [
  http.get("http://identity.localhost:3000/auth/profile", () => {
    console.log("used verify wall page test!");
    return HttpResponse.json({
      id: 123,
      email: "test@example.com",
      emailVerified: false,
    } satisfies AuthResponseBody["getUserProfile"]["200"]);
  }),
];

describe("VerifyWallPage", () => {
  stubGlobals();

  const server = setupMockServer(handlers);
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
