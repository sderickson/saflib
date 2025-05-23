import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleGetUserProfile } from "./get-user-profile.ts";
import * as grpc from "@grpc/grpc-js";
import { resolveGrpcRequest, runTestServer } from "@saflib/grpc-node/testing";
import { makeGrpcServer } from "../../grpc.ts";
import { authDb } from "@saflib/auth-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { UsersClient, GetUserProfileRequest } from "@saflib/auth-rpcs";

describe("handleGetUserProfile", () => {
  let server: grpc.Server;
  let testServerHost: string;
  let dbKey: DbKey;
  let client: UsersClient;

  beforeEach(async () => {
    // Create a test database connection
    dbKey = authDb.connect();

    // Create the gRPC server with the test db key
    server = makeGrpcServer({ dbKey });
    testServerHost = await runTestServer(server);

    // Create a gRPC client
    client = new UsersClient(testServerHost, grpc.credentials.createInsecure());
  });

  afterEach(async () => {
    if (server) {
      server.forceShutdown();
    }
    if (dbKey) {
      authDb.disconnect(dbKey);
    }
  });

  it("should handle successful requests", async () => {
    // Create a test user first
    const userResult = await authDb.users.create(dbKey, {
      email: "test@example.com",
      name: "Test User",
    });

    if ("error" in userResult) {
      throw new Error(`Failed to create user: ${userResult.error}`);
    }

    const user = userResult.result;

    // Create a test email auth record
    await authDb.emailAuth.create(dbKey, {
      userId: user.id,
      email: "test@example.com",
      verifiedAt: new Date(),
      verificationToken: null,
      verificationTokenExpiresAt: null,
      passwordHash: Buffer.from("test-hash"),
      forgotPasswordToken: null,
      forgotPasswordTokenExpiresAt: null,
    });

    // Make the gRPC call
    const result = await resolveGrpcRequest(
      client.GetUserProfile(new GetUserProfileRequest({ user_id: user.id })),
    );

    // Verify the response
    expect(result.profile).toBeDefined();
    expect(result.profile.user_id).toBe(user.id);
    expect(result.profile.email).toBe("test@example.com");
  });

  it("should return NOT_FOUND for non-existent user", async () => {
    try {
      await resolveGrpcRequest(
        client.GetUserProfile(new GetUserProfileRequest({ user_id: 999 })),
      );
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe(grpc.status.NOT_FOUND);
      expect(error.message).toContain("User profile not found");
    }
  });

  it("should return INVALID_ARGUMENT for missing userId", async () => {
    try {
      await resolveGrpcRequest(
        client.GetUserProfile(new GetUserProfileRequest({})),
      );
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe(grpc.status.INVALID_ARGUMENT);
      expect(error.message).toContain("User ID is required");
    }
  });
});
