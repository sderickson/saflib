import { afterEach, describe, it, expect } from "vitest";
import { useQuery } from "@tanstack/vue-query";
import { usePutMineUserConfigsMutation } from "./put-mine.ts";
import { getMineUserConfigsQuery } from "./get-mine.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupScopedMockServer } from "#test/scoped-mock.ts";
import { userConfigsFakeHandlers } from "./index.fakes.ts";
import {
  MOCK_SESSION_USER_ID,
  mockUserConfigs,
  resetMocks,
} from "./mocks.ts";

describe("putMineUserConfigs", () => {
  setupScopedMockServer(userConfigsFakeHandlers);
  afterEach(resetMocks);

  it("updates display name and marketing preference", async () => {
    const [mutation, app] = withVueQuery(() =>
      usePutMineUserConfigsMutation(),
    );

    const result = await mutation.mutateAsync({
      display_name: "Jordan Lee",
      marketing_emails_opt_in: true,
      terms_of_service_agreed_at: "now",
    });

    expect(result.user_config).toMatchObject({
      user_id: MOCK_SESSION_USER_ID,
      display_name: "Jordan Lee",
      marketing_emails_opt_in: true,
      marketing_emails_opt_in_at: expect.any(String),
      terms_of_service_agreed_at: expect.any(String),
    });
    expect(result.user_config.terms_of_service_agreed_at).not.toBe("now");
    expect(
      mockUserConfigs.find((config) => config.user_id === MOCK_SESSION_USER_ID),
    ).toMatchObject({
      display_name: "Jordan Lee",
      marketing_emails_opt_in: true,
    });

    app.unmount();
  });

  it("invalidates get-mine cache after update", async () => {
    const [mutation, mutApp, queryClient] = withVueQuery(() =>
      usePutMineUserConfigsMutation(),
    );
    const [mineQuery, mineApp] = withVueQuery(
      () => useQuery(getMineUserConfigsQuery()),
      queryClient,
    );

    await mineQuery.refetch();
    expect(mineQuery.data.value?.user_config.display_name).toBe("Alex Rivera");
    expect(mineQuery.data.value?.user_config.marketing_emails_opt_in).toBe(
      false,
    );

    await mutation.mutateAsync({
      display_name: "Cached Name",
      marketing_emails_opt_in: true,
    });

    await mineQuery.refetch();

    expect(mineQuery.data.value?.user_config).toMatchObject({
      display_name: "Cached Name",
      marketing_emails_opt_in: true,
    });

    mutApp.unmount();
    mineApp.unmount();
  });
});
