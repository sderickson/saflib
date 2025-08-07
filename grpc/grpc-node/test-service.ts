import * as grpc from "@grpc/grpc-js";
import { startGrpcServer } from "@saflib/grpc-node";
import { expect, vi } from "vitest";
let port = Math.floor(Math.random() * 10000) + 50000;

async function runTestServer<S extends grpc.Server>(service: S) {
  let host: string;
  while (true) {
    host = `0.0.0.0:${port}`;
    const p = startGrpcServer(service, { port });
    if (vi.isFakeTimers()) {
      vi.advanceTimersByTime(0);
    }
    try {
      // in case of collisions, try a different port
      await p;
      break;
    } catch (e) {
      port++;
    }
  }
  return host;
}

export { runTestServer };

export async function resolveGrpcRequest<T extends { successful: boolean }>(
  p: Promise<T>,
): Promise<T> {
  if (vi.isFakeTimers()) {
    vi.advanceTimersByTime(1000);
  }
  const result = await p;
  expect(result.successful).toBe(true);
  return result;
}
