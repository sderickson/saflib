import { describe, it, expect } from "vitest";
import { getHealthClient, health } from "./health.ts";
import { SafAuth, SafRequest } from "@saflib/grpc-specs";

describe("health", () => {
  it("should be defined", async () => {
    expect(getHealthClient).toBeDefined();
    const client = getHealthClient("localhost:50051");
    expect(client).toBeDefined();
    const response = await client.HealthCheck(
      new health.HealthCheckRequest({
        auth: new SafAuth({
          user_id: 123,
          user_email: "test@test.com",
          user_scopes: ["test"],
        }),
        request: new SafRequest({
          id: "123",
        }),
      }),
    );
    expect(response).toBeDefined();
    expect(response.status).toBe("OK");
    expect(response.current_time).toBeDefined();
  });
});
