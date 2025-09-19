import { describe, it, expect } from "vitest";
import { __extendedName__Query } from "./template-file.ts";
import { __serviceName__ServiceFakeHandlers } from "../../fakes.ts";
import { setupMockServer, withVueQuery } from "@saflib/sdk/testing";
import { useQuery } from "@tanstack/vue-query";

describe("__extendedName__", () => {
  setupMockServer(__serviceName__ServiceFakeHandlers);

  // TODO: Make sure the fake data gets returned
  it("TODO", async () => {
    const [query, app] = withVueQuery(() =>
      useQuery(__extendedName__Query({})),
    );

    await query.refetch();
    expect(query.data).toBeDefined();

    app.unmount();
  });
});
