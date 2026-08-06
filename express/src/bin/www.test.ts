import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import { isInternalRequest } from "../markInternal.ts";
import { startExpressServer } from "./www.ts";

async function waitForListening(server: http.Server): Promise<void> {
  if (!server.listening) {
    await once(server, "listening");
  }
  // `listening` can be true before listen callbacks / 'listening' handlers run.
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function httpGet(options: http.RequestOptions): Promise<{
  status: number;
  body: unknown;
}> {
  return new Promise((resolve, reject) => {
    const req = http.request({ method: "GET", ...options }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: res.statusCode ?? 0,
          body: text ? JSON.parse(text) : null,
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function makeProbeApp() {
  const app = express();
  app.get("/probe", (req, res) => {
    res.status(200).json({ internal: isInternalRequest(req) });
  });
  return app;
}

describe("startExpressServer", () => {
  const started: Array<{ close: () => Promise<void>; socketPath?: string }> =
    [];

  afterEach(async () => {
    while (started.length > 0) {
      const entry = started.pop()!;
      await entry.close();
      if (entry.socketPath && fs.existsSync(entry.socketPath)) {
        fs.unlinkSync(entry.socketPath);
      }
    }
  });

  it("throws when neither port nor socketPath is provided", () => {
    expect(() => startExpressServer(makeProbeApp(), {})).toThrow(
      /port or socketPath/,
    );
  });

  it("serves over a unix socket with the internal tag; TCP requests are untagged", async () => {
    const socketPath = path.join(
      os.tmpdir(),
      `saf-express-internal-${process.pid}-${Date.now()}.sock`,
    );
    const app = makeProbeApp();
    const result = startExpressServer(app, { port: 0, socketPath });
    started.push({ close: result.close, socketPath });

    await waitForListening(result.server!);
    await waitForListening(result.internalServer!);

    const addr = result.server!.address();
    if (addr == null || typeof addr === "string") {
      throw new Error("expected TCP address");
    }

    const mode = fs.statSync(socketPath).mode & 0o777;
    expect(mode).toBe(0o700);

    const overSocket = await httpGet({ socketPath, path: "/probe" });
    expect(overSocket.status).toBe(200);
    expect(overSocket.body).toEqual({ internal: true });

    const overTcp = await httpGet({
      hostname: "127.0.0.1",
      port: addr.port,
      path: "/probe",
    });
    expect(overTcp.status).toBe(200);
    expect(overTcp.body).toEqual({ internal: false });
  });

  it("recovers when restarting over a stale socket file", async () => {
    const socketPath = path.join(
      os.tmpdir(),
      `saf-express-stale-${process.pid}-${Date.now()}.sock`,
    );
    fs.writeFileSync(socketPath, "stale");

    const app = makeProbeApp();
    const result = startExpressServer(app, { socketPath });
    started.push({ close: result.close, socketPath });

    await waitForListening(result.internalServer!);

    const overSocket = await httpGet({ socketPath, path: "/probe" });
    expect(overSocket.status).toBe(200);
    expect(overSocket.body).toEqual({ internal: true });
  });
});
