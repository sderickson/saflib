import { describe, expect, it } from "vitest";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupScopedMockServer } from "#test/scoped-mock.ts";
import { useUnsubscribeMarketingEmailsUserConfigsMutation } from "./unsubscribe-marketing.ts";
import { userConfigsFakeHandlers } from "./index.fakes.ts";

describe("unsubscribeMarketingEmailsUserConfigs", () => {
  setupScopedMockServer(userConfigsFakeHandlers);

  it("accepts an email address", async () => {
    const [mutation, app] = withVueQuery(() =>
      useUnsubscribeMarketingEmailsUserConfigsMutation(),
    );

    await expect(
      mutation.mutateAsync({ email: "subscriber@example.com" }),
    ).resolves.toEqual({});

    app.unmount();
  });
});
