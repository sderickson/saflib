import { describe, it, beforeEach, expect } from "vitest";
import {
  makeContext,
  __serviceName__ServiceStorage,
} from "template-package-service-common";
import { testContext, safContextStorage } from "@saflib/node";
import { handleHealthCheck } from "./health-check.ts";
import { __ServiceName__HealthCheckRequest } from "template-package-grpc-proto";
import { SafAuth } from "@saflib/grpc-specs";

describe("handleHealthCheck", () => {
  beforeEach(async () => {
    safContextStorage.enterWith(testContext);
    __serviceName__ServiceStorage.enterWith(makeContext());
  });

  it("should handle successful requests", async () => {
    const request = new __ServiceName__HealthCheckRequest({
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
