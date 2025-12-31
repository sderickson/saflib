import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse } from "msw";
import VerifyEmailPage from "./VerifyEmailPage.vue";
import { mountTestApp, router } from "../../test-app.ts";

// Set up MSW server
const handlers = [
  http.post("http://identity.localhost:3000/auth/verify-email", async () => {
    return HttpResponse.json({
      success: true,
      data: {
        message: "Email verified successfully",
      },
    });
  }),
  http.post(
    "http://identity.localhost:3000/auth/resend-verification",
    async () => {
      return HttpResponse.json({
        success: true,
        data: {
          message: "Verification email sent",
        },
      });
    }
  ),
  http.get("http://identity.localhost:3000/auth/profile", () => {
    return HttpResponse.json({
      success: true,
      data: {
        email: "test@test.com",
      },
    });
  }),
];

describe("VerifyEmailPage", () => {
  stubGlobals();
  setupMockServer(handlers);

  const getResendButton = (wrapper: VueWrapper) => {
    const buttons = wrapper.findAllComponents({ name: "v-btn" });
    return buttons.find(
      (button) => button.text() === "Resend Verification Email"
    );
  };

  const getContinueLink = (wrapper: VueWrapper) => {
    return wrapper.find("a.text-blue");
  };

  const mountApp = () => {
    return mountTestApp(VerifyEmailPage, {
      props: {
        redirectTo: "/",
      },
    });
  };

  it("should automatically verify email when token is present and show continue link on success", async () => {
    await router.push("/verify-email?token=valid-token");
    const wrapper = mountApp();

    // Wait for success message
    const successAlert = await vi.waitUntil(() => {
      const alerts = wrapper.findAllComponents({ name: "v-alert" });
      return alerts.find((alert) => alert.props("type") === "success");
    });
    expect(successAlert?.text()).toContain("You have successfully verified");

    // Verify continue link is shown
    const continueLink = getContinueLink(wrapper);
    expect(continueLink.exists()).toBe(true);
    expect(continueLink.text()).toContain("Continue to App");
  });

  it("should show resend button when no token is present", async () => {
    await router.push("/verify-email");
    const wrapper = mountApp();
    await vi.waitFor(() => {
      const resendButton = getResendButton(wrapper);
      return resendButton?.exists();
    });
  });

  it("should show success message and hide button after resending verification email", async () => {
    await router.push("/verify-email");
    const wrapper = mountApp();
    await vi.waitFor(() => {
      const resendButton = getResendButton(wrapper);
      expect(resendButton?.exists()).toBe(true);
    });
    const resendButton = getResendButton(wrapper);
    await resendButton!.trigger("click");
    await wrapper.vm.$nextTick();

    // Wait for success message
    const successAlert = await vi.waitUntil(() => {
      const alerts = wrapper.findAllComponents({ name: "v-alert" });
      return alerts.find((alert) => alert.props("type") === "success");
    });
    expect(successAlert?.text()).toContain("Please check your email");

    // Verify button is hidden
    expect(getResendButton(wrapper)).toBeUndefined;
  });
});
