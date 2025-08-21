/**
 * Utilities for testing gRPC services.
 *
 * @module @saflib/grpc/testing
 */

import * as grpc from "@grpc/grpc-js";
import { startGrpcServer } from "@saflib/grpc";
import { expect, vi } from "vitest";
let port = Math.floor(Math.random() * 10000) + 50000;

/**
 * Runs a gRPC server for testing. Handles if fake timers are in use (which tends to break the server).
 */
export async function runTestServer<S extends grpc.Server>(service: S) {
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

/**
 * Resolves a gRPC request, waiting for the server to start and checking that the request was successful.
 * Moves fake timers forward if necessary.
 */
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
