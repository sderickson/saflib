import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGrpcHandlerTemplate } from "./grpc-handler-template.ts";
import * as grpc from "@grpc/grpc-js";
import { resolveGrpcRequest, runTestServer } from "@saflib/grpc-node/testing";

describe("handleGrpcHandlerTemplate", () => {
  let server: grpc.Server;
  let testServerHost: string;
  // TODO: import this from your package's grpc.ts file
  // let client: GrpcServiceClient;

  beforeEach(async () => {
    // TODO: import this from your package's grpc.ts file
    // server = makeGrpcServer();
    // testServerHost = await runTestServer(server);
    // const client = new GrpcServiceClient(
    //   testServerHost,
    //   grpc.credentials.createInsecure(),
    // );
  });

  it("should handle successful requests", async () => {
    // const result = await resolveGrpcRequest(
    //   client.GrpcHandlerTemplate(
    //     new GrpcHandlerTemplateRequest({
    //       request: {
    //         // TODO: Add test request data based on your proto definition
    //       },
    //     }),
    //   ),
    // );
    // expect(result.success).toEqual(true);
    expect(true).toEqual(false); // TODO: implement this test!
  });
});
