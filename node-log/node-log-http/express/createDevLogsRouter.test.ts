import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createErrorMiddleware } from "@saflib/express";
import {
  enableDevLogBuffer,
  resetDevLogBufferForTests,
  createDevLogBufferTransport,
} from "../lib/devLogBuffer.ts";
import { createDevLogsRouter } from "./createDevLogsRouter.ts";

describe("createDevLogsRouter", () => {
  const originalDeployment = process.env.DEPLOYMENT_NAME;

  beforeEach(() => {
    resetDevLogBufferForTests();
    process.env.DEPLOYMENT_NAME = "development";
    enableDevLogBuffer({ capacity: 100 });
    const transport = createDevLogBufferTransport();
    transport.log({ level: "info", message: "hello" }, () => {});
  });

  afterEach(() => {
    resetDevLogBufferForTests();
    if (originalDeployment === undefined) {
      delete process.env.DEPLOYMENT_NAME;
    } else {
      process.env.DEPLOYMENT_NAME = originalDeployment;
    }
  });

  function makeApp() {
    const app = express();
    app.use(createDevLogsRouter());
    app.use(createErrorMiddleware());
    return app;
  }

  it("returns buffered logs in development", async () => {
    const res = await request(makeApp()).get("/dev/logs").expect(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].message).toBe("hello");
  });

  it("returns 403 outside development", async () => {
    process.env.DEPLOYMENT_NAME = "production";
    await request(makeApp()).get("/dev/logs").expect(403);
  });

  it("returns 503 when buffer is disabled", async () => {
    resetDevLogBufferForTests();
    await request(makeApp()).get("/dev/logs").expect(503);
  });
});
