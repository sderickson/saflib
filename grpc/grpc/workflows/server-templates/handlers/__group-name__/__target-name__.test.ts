import { describe, it, beforeEach, expect } from "vitest";
import {
  makeContext,
  __serviceName__ServiceStorage,
} from "template-package-service-common";
import { testContext, safContextStorage } from "@saflib/node";
import { handle__TargetName__ } from "./__target-name__.ts";
import { __TargetName__Request } from "template-package-grpc-proto";
import { SafAuth } from "@saflib/grpc-specs";

describe("handle__TargetName__", () => {
  beforeEach(async () => {
    safContextStorage.enterWith(testContext);
    __serviceName__ServiceStorage.enterWith(makeContext());
  });

  it("should handle successful requests", async () => {
    const request = new __TargetName__Request({
      auth: new SafAuth({
        user_id: "123",
        user_email: "test@test.com",
        user_scopes: ["test"],
      }),
    });
    const response = handle__TargetName__(request);
    expect(response).toBeDefined();
    expect(response.status).toBe("OK");
    expect(response.timestamp).toBeDefined();
  });
});
