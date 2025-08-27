import { describe, it, expect, vi } from "vitest";
import { stubGlobals, setupMockServer } from "@saflib/vue/testing";
import LastMockEmailPageAsync from "./LastMockEmailPageAsync.vue";
import type { Component } from "vue";
import { http, HttpResponse } from "msw";
import type { EmailResponseBody } from "@saflib/email-spec";
import { last_mock_email_page as strings } from "./LastMockEmailPage.strings.ts";
import { getElementByString } from "@saflib/vue/testing";
import type { VueWrapper } from "@vue/test-utils";
import { mountTestApp } from "../test-app.ts";
import { router } from "../test_router.ts";
import { identityServiceMockHandlers } from "@saflib/auth/mocks";

const mockEmails: EmailResponseBody["listSentEmails"][200] = [
  {
    to: ["test@example.com"],
    subject: "Test Email",
    text: "This is a test email",
    html: "<p>This is a test email</p>",
    from: "test-sender@example.com",
    timeSent: 1,
  },
  {
    to: ["recipient@example.com"],
    cc: ["cc@example.com"],
    bcc: ["bcc@example.com"],
    from: "sender@example.com",
    subject: "Latest Test Email",
    text: "This is the latest test email",
    html: "<p>This is the latest test email</p>",
    timeSent: 2,
  },
];

const handlers = [
  http.get("http://app.localhost:3000/email/sent", () => {
    return HttpResponse.json(mockEmails);
  }),
  ...identityServiceMockHandlers,
];

describe("LastMockEmailPage", () => {
  stubGlobals();

  const server = setupMockServer(handlers);
  expect(server).toBeDefined();

  const mountComponent = async (component: Component) => {
    const route = `/last-email?subdomain=app`;
    await router.push(route);
    const res = mountTestApp(component);
    return res;
  };

  const getToLabel = (wrapper: VueWrapper) =>
    getElementByString(wrapper, strings.email_details.to);
  const getCcLabel = (wrapper: VueWrapper) =>
    getElementByString(wrapper, strings.email_details.cc);
  const getBccLabel = (wrapper: VueWrapper) =>
    getElementByString(wrapper, strings.email_details.bcc);
  const getFromLabel = (wrapper: VueWrapper) =>
    getElementByString(wrapper, strings.email_details.from);
  const getNoEmailsMessage = (wrapper: VueWrapper) =>
    getElementByString(wrapper, strings.no_emails);

  it("should render the last email when emails exist", async () => {
    const wrapper = await mountComponent(LastMockEmailPageAsync);
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain("Latest Test Email"),
    );

    // Check that all elements exist
    expect(getToLabel(wrapper).exists()).toBe(true);
    expect(getCcLabel(wrapper).exists()).toBe(true);
    expect(getBccLabel(wrapper).exists()).toBe(true);
    expect(getFromLabel(wrapper).exists()).toBe(true);

    // Check the content
    expect(wrapper.text()).toContain("recipient@example.com");
    expect(wrapper.text()).toContain("cc@example.com");
    expect(wrapper.text()).toContain("bcc@example.com");
    expect(wrapper.text()).toContain("sender@example.com");
    expect(wrapper.text()).toContain("Latest Test Email");
    expect(wrapper.text()).toContain("This is the latest test email");
  });

  it("should show no emails message when no emails exist", async () => {
    server.use(
      http.get("http://app.localhost:3000/email/sent", () => {
        return HttpResponse.json([]);
      }),
    );

    const wrapper = await mountComponent(LastMockEmailPageAsync);
    await vi.waitFor(() => expect(wrapper.text()).toContain(strings.no_emails));
    expect(getNoEmailsMessage(wrapper).exists()).toBe(true);
  });
});
