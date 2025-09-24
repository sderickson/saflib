import { describe, it, expect, assert } from "vitest";
import { useUpdateSecret } from "./update.ts";
import { secretsServiceFakeHandlers } from "../../fakes.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("updateSecret", () => {
  setupMockServer(secretsServiceFakeHandlers);

  it("should update a secret", async () => {
    const [mutation, app] = withVueQuery(() => useUpdateSecret());

    const updateData = {
      id: "secret-1",
      description: "Updated description",
      is_active: false,
    };

    await mutation.mutateAsync(updateData);

    expect(mutation.data).toBeDefined();
    const data = mutation.data?.value;
    assert(data);
    expect(data).toMatchObject({
      id: "secret-1",
      name: "updated-secret",
      description: "Updated description",
      masked_value: "updated_secret***",
      is_active: false,
    });

    app.unmount();
  });
});
