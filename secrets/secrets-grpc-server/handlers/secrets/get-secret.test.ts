import { describe, it, beforeEach, expect } from "vitest";
import {
  makeContext,
  secretsServiceStorage,
} from "@saflib/secrets-service-common";
import { testContext, safContextStorage } from "@saflib/node";
import { handleGetSecret } from "./get-secret.ts";
import { GetSecretRequest } from "@saflib/secrets-grpc-proto";
import { SafAuth } from "@saflib/grpc";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "@saflib/secrets-db";

describe("handleGetSecret", () => {
  let dbKey: DbKey;
  beforeEach(async () => {
    safContextStorage.enterWith(testContext);
    const ctx = makeContext();
    dbKey = ctx.secretsDbKey;
    secretsServiceStorage.enterWith(ctx);
  });

  it("registers requests and only returns the secret value if the request is granted", async () => {

    // const { result: createdSecret } = await secretQueries.create(dbKey, {
    //   name: "test-secret",
    //   description: "Test secret description",
    //   valueEncrypted: Buffer.from("encrypted-value"),
    //   createdBy: "test-user",
    //   isActive: true,
    // });


    // const request = new GetSecretRequest({
    //   secret_name: "test-secret",
    //   token: "test-token",
    //   auth: new SafAuth({
    //     user_id: "123",
    //     user_email: "test@test.com",
    //     user_scopes: ["test"],
    //   }),
    // });
    // const response = handleGetSecret(request);
    // expect(response).toBeDefined();
    // expect(response.status).toBe("OK");
    // expect(response.timestamp).toBeDefined();
  });
});
