import { describe, it, expect, assert } from "vitest";
import { useCreateSecret } from "./create.ts";
import { secretsServiceFakeHandlers } from "../../fakes.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("createSecret", () => {
  setupMockServer(secretsServiceFakeHandlers);

  it("should create a new secret", async () => {
    const [mutation, app] = withVueQuery(() => useCreateSecret());

    const secretData = {
      name: "test-secret",
      description: "A test secret",
      value: "secret-value",
    };

    await mutation.mutateAsync(secretData);

    expect(mutation.data).toBeDefined();
    const data = mutation.data?.value;
    assert(data);
    expect(data).toMatchObject({
      id: expect.any(String),
      name: "test-secret",
      description: "A test secret",
      masked_value: "new_secret***",
      is_active: true,
    });

    app.unmount();
  });
});
