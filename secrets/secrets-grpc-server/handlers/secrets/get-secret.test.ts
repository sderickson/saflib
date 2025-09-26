import {
  describe,
  it,
  beforeEach,
  expect,
  vi,
  afterEach,
  assert,
} from "vitest";
import {
  makeContext,
  secretsServiceStorage,
  upsertSecretEncryptionKey,
} from "@saflib/secrets-service-common";
import { testContext, safContextStorage } from "@saflib/node";
import { handleGetSecret } from "./get-secret.ts";
import {
  GetSecretError,
  GetSecretRequest,
  RegisterTokenRequest,
} from "@saflib/secrets-grpc-proto";
import type { DbKey } from "@saflib/drizzle";
import {
  accessRequestQueries,
  secretQueries,
  serviceTokenQueries,
} from "@saflib/secrets-db";
import { handleRegisterToken } from "./register-token.ts";
import { encryptSecret } from "@saflib/secrets-service-common";

describe("handleGetSecret", () => {
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

  it("returns secrets if everything is in order", async () => {
    // Run through all the steps and error cases along the way
    const service_name = "test-service";
    const service_version = "test-version";
    const token = "test-token";
    const secret_name = "test-secret";
    const secret_value = "test-secret-value";

    // CASE 0: token not registered
    const notRegisteredResult = await handleGetSecret(
      new GetSecretRequest({
        secret_name,
        token,
      }),
    );
    expect(notRegisteredResult.result).toBe("error");
    expect(notRegisteredResult.error).toBe(
      GetSecretError.GET_SECRET_INVALID_TOKEN,
    );

    // register token
    const request = new RegisterTokenRequest({
      service_name,
      service_version,
      token,
    });
    const tokenResult = await handleRegisterToken(request);
    expect(tokenResult.result).toBe("success");

    // CASE 1: token not approved
    const notApprovedResult = await handleGetSecret(
      new GetSecretRequest({
        secret_name,
        token,
      }),
    );
    expect(notApprovedResult.result).toBe("error");
    expect(notApprovedResult.error).toBe(
      GetSecretError.GET_SECRET_TOKEN_NOT_APPROVED,
    );

    // approve token
    const { result: tokens } = await serviceTokenQueries.list(dbKey, {
      serviceName: service_name,
    });
    assert(tokens);
    expect(tokens).toHaveLength(1);
    const tokenId = tokens[0].id;
    const { result: approvedToken } = await serviceTokenQueries.updateApproval(
      dbKey,
      {
        id: tokenId,
        approved: true,
        approvedBy: "admin-user",
      },
    );
    expect(approvedToken?.approved).toBe(true);

    // request secret, creating access request
    const notGrantedResult = await handleGetSecret(
      new GetSecretRequest({
        secret_name,
        token,
      }),
    );
    expect(notGrantedResult.result).toBe("error");
    expect(notGrantedResult.error).toBe(
      GetSecretError.GET_SECRET_ACCESS_NOT_GRANTED,
    );

    // ask again, since it should be created already
    const notGrantedResult2 = await handleGetSecret(
      new GetSecretRequest({
        secret_name,
        token,
      }),
    );
    expect(notGrantedResult2.result).toBe("error");
    expect(notGrantedResult2.error).toBe(
      GetSecretError.GET_SECRET_ACCESS_NOT_GRANTED,
    );

    // approve access request
    const { result: accessRequest } = await accessRequestQueries.list(dbKey, {
      serviceName: service_name,
    });
    assert(accessRequest);
    expect(accessRequest).toHaveLength(1);
    const accessRequestId = accessRequest[0].id;
    const { result: approvedAccessRequest } =
      await accessRequestQueries.updateStatus(dbKey, {
        id: accessRequestId,
        status: "granted",
        grantedBy: "admin-user",
      });
    expect(approvedAccessRequest?.status).toBe("granted");

    // CASE 2: secret not found
    const notFoundResult = await handleGetSecret(
      new GetSecretRequest({
        secret_name,
        token,
      }),
    );
    expect(notFoundResult.result).toBe("error");
    expect(notFoundResult.error).toBe(GetSecretError.GET_SECRET_NOT_FOUND);

    // create secret
    const { result: createdSecret } = await secretQueries.create(dbKey, {
      name: secret_name,
      description: "test-secret-description",
      valueEncrypted: encryptSecret(upsertSecretEncryptionKey(), secret_value),
      createdBy: "admin-user",
      isActive: true,
    });
    expect(createdSecret?.name).toBe(secret_name);

    // CASE 3: secret found and active
    const activeSecretResult = await handleGetSecret(
      new GetSecretRequest({
        secret_name,
        token,
      }),
    );
    expect(activeSecretResult.result).toBe("success");
    expect(activeSecretResult.success?.value).toBe(secret_value);

    // update secret to inactive
    assert(createdSecret);
    const { result: updatedSecret } = await secretQueries.update(dbKey, {
      id: createdSecret.id,
      isActive: false,
    });
    expect(updatedSecret?.isActive).toBe(false);

    // CASE 4: secret found and inactive
    const inactiveSecretResult = await handleGetSecret(
      new GetSecretRequest({
        secret_name,
        token,
      }),
    );
    expect(inactiveSecretResult.result).toBe("error");
    expect(inactiveSecretResult.error).toBe(
      GetSecretError.GET_SECRET_NOT_ACTIVE,
    );
  });
});
