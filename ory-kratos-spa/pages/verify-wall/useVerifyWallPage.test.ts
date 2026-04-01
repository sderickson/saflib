import { createApp } from "vue";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { createMemoryHistory, createRouter } from "vue-router";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setClientName } from "@saflib/links";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import {
  kratosFakeHandlers,
  resetKratosFlowMocks,
} from "@saflib/ory-kratos-sdk/fakes";
import { useVerifyWallPage } from "./useVerifyWallPage.ts";

const unverifiedSession = {
  id: "sess-1",
  active: true,
  identity: {
    id: "id-1",
    schema_id: "default",
    schema_url: "",
    traits: { email: "user@test.dev" },
    verifiable_addresses: [
      {
        id: "va-1",
        value: "user@test.dev",
        verified: false,
        status: "pending",
        via: "email",
      },
    ],
  },
};

const verifiedSession = {
  ...unverifiedSession,
  identity: {
    ...unverifiedSession.identity,
    verifiable_addresses: [
      {
        ...unverifiedSession.identity.verifiable_addresses[0],
        verified: true,
        status: "completed",
      },
    ],
  },
};

async function mountVerifyWallPage(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/verify-wall", component: { template: "<div/>" } }],
  });
  await router.push(path);
  await router.isReady();

  let sessionQuery!: ReturnType<typeof useKratosSession>;
  let page!: ReturnType<typeof useVerifyWallPage>;

  const app = createApp({
    setup() {
      sessionQuery = useKratosSession();
      page = useVerifyWallPage(sessionQuery);
      return () => {};
    },
  });
  app.use(VueQueryPlugin, { queryClient });
  app.use(router);
  app.mount(document.createElement("div"));

  await vi.waitFor(() => expect(sessionQuery.status.value).toBe("success"));
  return { page, app, sessionQuery, queryClient };
}

describe("useVerifyWallPage", () => {
  const server = setupMockServer(kratosFakeHandlers);

  beforeEach(() => {
    setClientName("auth");
  });

  afterEach(() => {
    resetKratosFlowMocks();
    vi.restoreAllMocks();
  });

  it("sets showUnverifiedWall when the session has an unverified email address", async () => {
    server.use(
      http.get("*/sessions/whoami", () => HttpResponse.json(unverifiedSession)),
    );

    const { page, app } = await mountVerifyWallPage("/verify-wall");
    expect(page.showUnverifiedWall.value).toBe(true);
    expect(page.showVerifiedWall.value).toBe(false);
    expect(page.identityEmail.value).toContain("user@test");
    app.unmount();
  });

  it("sets showVerifiedWall when the session email is verified (no auto redirect)", async () => {
    server.use(
      http.get("*/sessions/whoami", () => HttpResponse.json(verifiedSession)),
    );

    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://localhost/",
      assign: assignMock,
    });

    try {
      const { page, app } = await mountVerifyWallPage(
        "/verify-wall?return_to=https://recipes.example/ok",
      );
      expect(page.showVerifiedWall.value).toBe(true);
      expect(page.showUnverifiedWall.value).toBe(false);
      expect(page.redirectAfter.value).toBe("https://recipes.example/ok");
      expect(assignMock).not.toHaveBeenCalled();
      app.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
