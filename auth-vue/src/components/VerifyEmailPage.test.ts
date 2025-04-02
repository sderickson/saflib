import { describe, it, expect, vi } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue-spa-dev/components";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse } from "msw";
import { setupMockServer } from "@saflib/vue-spa-dev/components";
import VerifyEmailPage from "./VerifyEmailPage.vue";
import { router } from "../router";

// Set up MSW server
const handlers = [
  http.post(
    "http://api.localhost:3000/auth/verify-email",
    async ({ request }) => {
      const body = (await request.json()) as { token: string };
      if (body.token === "valid-token") {
        return HttpResponse.json({
          success: true,
          data: {
            message: "Email verified successfully",
          },
        });
      }
      return new HttpResponse(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 404,
        },
      );
    },
  ),
  http.post("http://api.localhost:3000/auth/resend-verification", async () => {
    return HttpResponse.json({
      success: true,
      data: {
        message: "Verification email sent",
      },
    });
  }),
];

describe("VerifyEmailPage", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  const getVerifyButton = (wrapper: VueWrapper) => {
    const buttons = wrapper.findAllComponents({ name: "v-btn" });
    const verifyButton = buttons.find(
      (button) => button.text() === "Verify Email",
    );
    expect(verifyButton?.exists()).toBe(true);
    return verifyButton!;
  };

  const getResendButton = (wrapper: VueWrapper) => {
    const buttons = wrapper.findAllComponents({ name: "v-btn" });
    const resendButton = buttons.find(
      (button) => button.text() === "Resend Verification Email",
    );
    expect(resendButton?.exists()).toBe(true);
    return resendButton!;
  };

  const mountComponent = () => {
    return mountWithPlugins(VerifyEmailPage, {}, { router });
  };

  it("should render verify button when token is present", async () => {
    await router.push("/verify-email?token=valid-token");
    const wrapper = mountComponent();
    expect(getVerifyButton(wrapper).exists()).toBe(true);
  });

  it("should render resend button when token is not present", async () => {
    await router.push("/verify-email");
    const wrapper = mountComponent();
    expect(getResendButton(wrapper).exists()).toBe(true);
  });

  it("should show success message after successful verification", async () => {
    await router.push("/verify-email?token=valid-token");
    const wrapper = mountComponent();
    const verifyButton = getVerifyButton(wrapper);

    await verifyButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Wait for success message
    const successAlert = await vi.waitUntil(() => {
      const alerts = wrapper.findAllComponents({ name: "v-alert" });
      return alerts.find((alert) => alert.props("type") === "success");
    });
    expect(successAlert?.text()).toContain("Email successfully verified!");
  });

  it("should show error message when token is invalid", async () => {
    await router.push("/verify-email?token=invalid-token");
    const wrapper = mountComponent();
    const verifyButton = getVerifyButton(wrapper);

    await verifyButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Wait for error message
    const errorAlert = await vi.waitUntil(() => {
      const alerts = wrapper.findAllComponents({ name: "v-alert" });
      return alerts.find((alert) => alert.props("type") === "error");
    });
    expect(errorAlert?.text()).toContain("Failed to verify email");
  });

  it("should show success message after resending verification email", async () => {
    await router.push("/verify-email");
    const wrapper = mountComponent();
    const resendButton = getResendButton(wrapper);

    await resendButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Wait for success message
    const successAlert = await vi.waitUntil(() => {
      const alerts = wrapper.findAllComponents({ name: "v-alert" });
      return alerts.find((alert) => alert.props("type") === "success");
    });
    expect(successAlert?.text()).toContain("Verification email sent!");
  });

  it("should disable buttons while loading", async () => {
    await router.push("/verify-email?token=valid-token");
    const wrapper = mountComponent();
    const verifyButton = getVerifyButton(wrapper);

    await verifyButton.trigger("click");
    await wrapper.vm.$nextTick();

    expect(verifyButton.attributes("disabled")).toBe("");
    expect(verifyButton.text()).toBe("Verifying...");
  });
});
