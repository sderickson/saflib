import { describe, it, beforeEach, expect } from "vitest";
import {
  makeContext,
  type __ServiceName__ServiceContext,
  __serviceName__ServiceStorage,
} from "template-package-service-common";
import { testContext, type SafContext, safContextStorage } from "@saflib/node";
import { handleHealthCheck } from "./health-check.ts";
import { __ServiceName__HealthCheckRequest } from "template-package-grpc-proto";
import { SafAuth } from "@saflib/grpc-specs";

describe("handleHealthCheck", () => {
  let safContext: SafContext = testContext;
  let __serviceName__Context: __ServiceName__ServiceContext;

  beforeEach(async () => {
    __serviceName__Context = makeContext();
  });

  it("should handle successful requests", async () => {
    safContextStorage.run(safContext, () => {
      __serviceName__ServiceStorage.run(__serviceName__Context, () => {
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
  });
});
