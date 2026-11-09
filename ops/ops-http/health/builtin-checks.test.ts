import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { kratosCheck } from "./builtin-checks.ts";

let server: Server | undefined;

async function serve(status: number): Promise<string> {
  server = createServer((req, res) => {
    res.statusCode = req.url === "/health/ready" ? status : 404;
    res.end();
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

describe("kratosCheck", () => {
  it("is ok when Kratos reports ready", async () => {
    const outcome = await kratosCheck({ baseUrl: await serve(200) }).run();
    expect(outcome).toMatchObject({ status: "ok" });
  });

  it("fails when Kratos is not ready", async () => {
    const outcome = await kratosCheck({ baseUrl: await serve(503) }).run();
    expect(outcome).toMatchObject({ status: "fail", summary: "kratos not ready (HTTP 503)" });
  });

  it("fails when Kratos is unreachable", async () => {
    const outcome = await kratosCheck({ baseUrl: "http://127.0.0.1:1" }).run();
    expect(outcome.status).toBe("fail");
    expect(outcome.summary).toMatch(/^kratos unreachable/);
  });
});
