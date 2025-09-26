import { describe, it, beforeEach, expect } from "vitest";
import {
  makeContext,
  secretsServiceStorage,
} from "@saflib/secrets-service-common";
import { testContext, safContextStorage } from "@saflib/node";
import { handleHealthCheck } from "./health-check.ts";
import { SecretsHealthCheckRequest } from "@saflib/secrets-grpc-proto";
import { SafAuth } from "@saflib/grpc";

describe("handleHealthCheck", () => {
  beforeEach(async () => {
    safContextStorage.enterWith(testContext);
    secretsServiceStorage.enterWith(makeContext());
  });

  it("should handle successful requests", async () => {
    const request = new SecretsHealthCheckRequest({
      auth: new SafAuth({
        user_id: "123",
        user_email: "test@test.com",
        user_scopes: ["test"],
      }),
    });
    const response = handleHealthCheck(request);
    expect(response).toBeDefined();
    expect(response.status).toBe("OK");
    expect(response.current_time).toBeDefined();
  });
});
