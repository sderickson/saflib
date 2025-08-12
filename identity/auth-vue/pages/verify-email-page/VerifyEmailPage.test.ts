import { describe, it, expect, vi } from "vitest";
import { stubGlobals, setupMockServer } from "@saflib/vue-spa/testing";
import VerifyEmailPageAsync from "./VerifyEmailPageAsync.vue";
import { VerifyEmailPage_page as strings } from "./VerifyEmailPage.strings.ts";
import { getElementByString } from "@saflib/vue-spa/testing";
import { http, HttpResponse } from "msw";
import type { AuthResponse } from "@saflib/identity-spec";
import { mountTestApp } from "../../test-app.ts";

const handlers = [
  http.get("http://identity.localhost:3000/auth/profile", () => {
    return HttpResponse.json({
      id: 123,
      email: "test@example.com",
      emailVerified: false,
    } satisfies AuthResponse["getUserProfile"]["200"]);
  }),
];

describe("VerifyEmailPage", () => {
  stubGlobals();

  const server = setupMockServer(handlers);
  expect(server).toBeDefined();

  it("should render the page with instructions", async () => {
    const wrapper = mountTestApp(VerifyEmailPageAsync, {
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
