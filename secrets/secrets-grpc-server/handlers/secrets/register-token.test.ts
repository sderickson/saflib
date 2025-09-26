import { describe, it, beforeEach, expect, afterEach, vi } from "vitest";
import {
  makeContext,
  secretsServiceStorage,
} from "@saflib/secrets-service-common";
import { testContext, safContextStorage } from "@saflib/node";
import { handleRegisterToken } from "./register-token.ts";
import { RegisterTokenRequest, RegisterTokenError } from "@saflib/secrets-grpc-proto";
import type { DbKey } from "@saflib/drizzle";
import { accessRequestQueries, serviceTokenQueries } from "@saflib/secrets-db";

describe("handleRegisterToken", () => {
  let dbKey: DbKey;
  beforeEach(async () => {
    vi.spyOn(safContextStorage, "getStore").mockReturnValue(testContext);
    const ctx = makeContext();
    dbKey = ctx.secretsDbKey;
    vi.spyOn(secretsServiceStorage, "getStore").mockReturnValue(ctx);
    secretsServiceStorage.enterWith(ctx);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("should handle successful requests", async () => {
    const { result: requests } = await accessRequestQueries.list(dbKey, {});
    expect(requests).toHaveLength(0);

    const request = new RegisterTokenRequest({
      service_name: "test-service",
      service_version: "test-version",
      token: "test-token",
    });
    const response = await handleRegisterToken(request);
    expect(response).toBeDefined();
    expect(response.result).toBe("success");
    expect(response.success.toObject()).toEqual(expect.any(Object));

    const { result: requests2 } = await serviceTokenQueries.list(dbKey, {});
    expect(requests2).toHaveLength(1);
  });

  it("allows the same token to be registered multiple times", async () => {
    const { result: requests1 } = await serviceTokenQueries.list(dbKey, {});
    expect(requests1).toHaveLength(0);

    const request = new RegisterTokenRequest({
      service_name: "test-service",
      service_version: "test-version",
      token: "test-token",
    });
    await handleRegisterToken(request)
    const response = await handleRegisterToken(request);
    expect(response).toBeDefined();
    expect(response.result).toBe("success");
    expect(response.success.toObject()).toEqual(expect.any(Object));

    const { result: requests2 } = await serviceTokenQueries.list(dbKey, {});
    expect(requests2).toHaveLength(1);
  });

  it("should handle invalid requests", async () => {
    const request = new RegisterTokenRequest({});
    const response = await handleRegisterToken(request);
    expect(response).toBeDefined();
    expect(response.result).toBe("error");
    expect(response.error).toBe(RegisterTokenError.INVALID_REQUEST);
  });
});
