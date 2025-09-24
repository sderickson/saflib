import { describe, it, expect, assert } from "vitest";
import { listSecretsQuery } from "./list.ts";
import { secretsServiceFakeHandlers } from "../../fakes.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { useQuery } from "@tanstack/vue-query";
import { ref } from "vue";

describe("listSecrets", () => {
  setupMockServer(secretsServiceFakeHandlers);

  it("should fetch and return secrets list", async () => {
    const [query, app] = withVueQuery(() => useQuery(listSecretsQuery({})));

    await query.refetch();
    expect(query.data).toBeDefined();
    expect(Array.isArray(query.data?.value)).toBe(true);
    const data = query.data?.value;
    assert(data);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      id: "secret-1",
      name: "database-password",
      description: "Main database password",
      masked_value: "db_pass***",
      is_active: true,
    });

    app.unmount();
  });

  it("should handle query parameters", async () => {
    const limit = ref(1);
    const offset = ref(0);
    const isActive = ref(true);

    const [query, app] = withVueQuery(() =>
      useQuery(listSecretsQuery({ limit, offset, is_active: isActive })),
    );

    await query.refetch();
    expect(query.data).toBeDefined();
    expect(Array.isArray(query.data.value)).toBe(true);
    expect(query.data.value).toHaveLength(1);

    app.unmount();
  });
});
