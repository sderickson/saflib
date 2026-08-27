import { afterEach, describe, expect, it } from "vitest";
import { getUsersByIdAdminQuery } from "./users-by-id.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { useQuery } from "@tanstack/vue-query";
import { ref } from "vue";
import { setupScopedMockServer } from "#testing.ts";
import { getUsersByIdAdminHandler } from "./users-by-id.fake.ts";
import { resetMocks } from "./mocks.ts";

describe("getUsersByIdAdmin", () => {
  setupScopedMockServer([getUsersByIdAdminHandler]);
  afterEach(resetMocks);

  it("returns an identity by id", async () => {
    const userId = ref("22222222-2222-2222-2222-222222222222");
    const [query, app] = withVueQuery(() =>
      useQuery(getUsersByIdAdminQuery(userId)),
    );

    await query.refetch();

    expect(query.data.value).toMatchObject({
      identity: {
        id: "22222222-2222-2222-2222-222222222222",
        traits: { email: "lookup-user@example.com" },
      },
    });

    app.unmount();
  });
});
