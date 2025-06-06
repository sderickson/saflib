#!/usr/bin/env node
import { startAuthService } from "../index.ts";

console.log("Env:", {
  HTTP_PORT: process.env.HTTP_PORT || 3000,
  GRPC_PORT: process.env.GRPC_PORT || 50051,
  DOMAIN: process.env.DOMAIN,
  PROTOCOL: process.env.PROTOCOL,
});

startAuthService({
  dbOptions: {
    onDisk: true,
  },
});
