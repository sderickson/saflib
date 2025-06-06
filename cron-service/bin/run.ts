#!/usr/bin/env node
import { main } from "../index.ts";

console.log("Env:", {
  GRPC_PORT: process.env.GRPC_PORT || 50051,
  HTTP_PORT: process.env.HTTP_PORT || 3000,
});

main({
  jobs: {},
});
