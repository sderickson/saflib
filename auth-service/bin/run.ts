#!/usr/bin/env node
import { startExpressServer } from "@saflib/express";
import { createApp } from "../app.ts";
import { authDb } from "@saflib/auth-db";
import { makeGrpcServer } from "../grpc.ts";
import { startGrpcServer } from "@saflib/grpc-node";

console.log("Env:", {
  HTTP_PORT: process.env.HTTP_PORT || 3000,
  GRPC_PORT: process.env.GRPC_PORT || 50051,
  DOMAIN: process.env.DOMAIN,
  PROTOCOL: process.env.PROTOCOL,
});

async function main() {
  const dbKey = authDb.connect({ onDisk: true });
  const grpcServer = makeGrpcServer({ dbKey });
  startGrpcServer(grpcServer);

  const app = createApp(dbKey);
  startExpressServer(app);
}

main();
