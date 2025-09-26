import { describe, it, beforeEach, expect } from "vitest";
import {
  makeContext,
  secretsServiceStorage,
} from "@saflib/secrets-service-common";
import { testContext, safContextStorage } from "@saflib/node";
import { handleRegisterToken } from "./register-token.ts";
import { RegisterTokenRequest } from "@saflib/secrets-grpc-proto";
import { SafAuth } from "@saflib/grpc";

describe("handleRegisterToken", () => {
  beforeEach(async () => {
    safContextStorage.enterWith(testContext);
    secretsServiceStorage.enterWith(makeContext());
  });

  it("should handle successful requests", async () => {
    const request = new RegisterTokenRequest({
      auth: new SafAuth({
        user_id: "123",
        user_email: "test@test.com",
        user_scopes: ["test"],
      }),
    });
    const response = handleRegisterToken(request);
    expect(response).toBeDefined();
    expect(response.status).toBe("OK");
    expect(response.timestamp).toBeDefined();
  });
});
