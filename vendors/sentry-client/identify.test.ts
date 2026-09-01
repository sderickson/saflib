import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/vue";
import { identifyToSentry, resetSentryUser } from "./identify.ts";

vi.mock("@sentry/vue", () => ({
  setUser: vi.fn(),
}));

vi.mock("@saflib/errors-vue/lib/reportClientErrorToBackend.ts", () => ({
  isLocalhostHostname: () => false,
}));

describe("identifyToSentry", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_CLIENT_SENTRY_DSN", "https://example@sentry.io/1");
  });

  afterEach(() => {
    resetSentryUser();
    vi.clearAllMocks();
  });

  it("sets the Sentry user id from the Kratos session", () => {
    identifyToSentry({
      identity: { id: "U_test" },
    } as never);

    expect(Sentry.setUser).toHaveBeenCalledWith({ id: "U_test" });
  });

  it("does not repeat setUser for the same id", () => {
    const session = { identity: { id: "U_test" } } as never;

    identifyToSentry(session);
    identifyToSentry(session);

    expect(Sentry.setUser).toHaveBeenCalledTimes(1);
  });

  it("clears the Sentry user on reset", () => {
    identifyToSentry({ identity: { id: "U_test" } } as never);

    resetSentryUser();

    expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
  });
});
