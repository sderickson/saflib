import { describe, it, expect } from "vitest";
import { listSecretsQuery } from "./list.ts";
import { exampleServiceFakeHandlers } from "../../fakes.ts";
import { setupMockServer, withVueQuery } from "@saflib/sdk/testing";
import { useQuery } from "@tanstack/vue-query";

describe("listSecrets", () => {
  setupMockServer(exampleServiceFakeHandlers);

  // TODO: Make sure the fake data gets returned
  it("TODO", async () => {
    const [query, app] = withVueQuery(() =>
      useQuery(listSecretsQuery({})),
    );

    await query.refetch();
    expect(query.data).toBeDefined();

    app.unmount();
  });
});
