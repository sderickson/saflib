import { describe, it, expect, assert } from "vitest";
import { listServiceTokensQuery } from "./list.ts";
import { secretsServiceFakeHandlers } from "../../fakes.ts";
import { setupMockServer, withVueQuery } from "@saflib/sdk/testing";
import { useQuery } from "@tanstack/vue-query";
import { ref } from "vue";

describe("listServiceTokens", () => {
  setupMockServer(secretsServiceFakeHandlers);

  it("should fetch and return service tokens list", async () => {
    const [query, app] = withVueQuery(() =>
      useQuery(listServiceTokensQuery({})),
    );

    await query.refetch();
    expect(query.data).toBeDefined();
    expect(Array.isArray(query.data?.value)).toBe(true);
    const data = query.data?.value;
    assert(data);
    expect(data).toHaveLength(3);
    expect(data[0]).toMatchObject({
      id: "token-1",
      service_name: "test-service-1",
      token_hash: "test-hash-1-very-long-hash-value",
      service_version: "1.0.0",
      approved: false,
    });

    app.unmount();
  });

  it("should handle query parameters", async () => {
    const limit = ref(2);
    const approved = ref(true);
    const serviceName = ref("test-service-2");

    const [query, app] = withVueQuery(() =>
      useQuery(
        listServiceTokensQuery({ limit, approved, service_name: serviceName }),
      ),
    );

    await query.refetch();
    expect(query.data).toBeDefined();
    expect(Array.isArray(query.data?.value)).toBe(true);
    const data = query.data?.value;
    assert(data);
    expect(data).toHaveLength(1);
    expect(data[0].approved).toBe(true);
    expect(data[0].service_name).toBe("test-service-2");

    app.unmount();
  });
});
