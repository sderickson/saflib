import { describe, it, expect, assert } from "vitest";
import { useDeleteSecret } from "./delete.ts";
import { secretsServiceFakeHandlers } from "../../fakes.ts";
import { setupMockServer, withVueQuery } from "@saflib/sdk/testing";

describe("deleteSecret", () => {
  setupMockServer(secretsServiceFakeHandlers);

  it("should delete a secret", async () => {
    const [mutation, app] = withVueQuery(() => useDeleteSecret());

    await mutation.mutateAsync("secret-1");

    expect(mutation.data).toBeDefined();
    const data = mutation.data?.value;
    assert(data);
    expect(data).toMatchObject({
      message: "Secret deleted successfully",
    });

    app.unmount();
  });
});
