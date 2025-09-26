import { describe, it, beforeEach, expect } from "vitest";
import {
  makeContext,
  secretsServiceStorage,
} from "@saflib/secrets-service-common";
import { testContext, safContextStorage } from "@saflib/node";
import { handleGetSecret } from "./get-secret.ts";
import { GetSecretRequest } from "@saflib/secrets-grpc-proto";
import { SafAuth } from "@saflib/grpc";

describe("handleGetSecret", () => {
  beforeEach(async () => {
    safContextStorage.enterWith(testContext);
    secretsServiceStorage.enterWith(makeContext());
  });

  it("should handle successful requests", async () => {
    const request = new GetSecretRequest({
      auth: new SafAuth({
        user_id: "123",
        user_email: "test@test.com",
        user_scopes: ["test"],
      }),
    });
    const response = handleGetSecret(request);
    expect(response).toBeDefined();
    expect(response.status).toBe("OK");
    expect(response.timestamp).toBeDefined();
  });
});
