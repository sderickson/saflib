import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import winston from "winston";
import { createPersistentLogTransport, logsDb } from "@saflib/node-log-db";
import { digestActivity } from "./digest-activity.ts";

let server: Server;
let proxyUrl: string;
let lastQuery: URLSearchParams | undefined;

beforeAll(async () => {
  server = createServer((req, res) => {
    lastQuery = new URL(req.url!, "http://x").searchParams;
    const start = Number(lastQuery.get("start"));
    const step = Number(lastQuery.get("step"));
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        status: "success",
        data: {
          resultType: "matrix",
          result: [
            {
              metric: {},
              values: [
                [start, "12.4"],
                [start + step, "0"],
              ],
            },
          ],
        },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  proxyUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const now = new Date("2026-11-09T12:00:00Z");
const since = new Date("2026-11-08T12:00:00Z");

describe("digestActivity", () => {
  it("counts user-facing GETs per hour, labelled by each hour's start", async () => {
    const a = await digestActivity(
      { metrics: { app: "hub", proxyUrl } },
      since,
      now,
    );
    expect(lastQuery!.get("query")).toContain('method="GET"');
    expect(lastQuery!.get("step")).toBe("3600");
    expect(a).toEqual({
      distinct_users: null,
      requests_by_hour: [
        { start: "2026-11-08T12:00:00.000Z", requests: 12 },
        { start: "2026-11-08T13:00:00.000Z", requests: 0 },
      ],
      error: null,
    });
  });

  it("widens buckets past 48 hours", async () => {
    await digestActivity(
      { metrics: { app: "hub", proxyUrl } },
      new Date("2026-11-02T12:00:00Z"),
      now,
    );
    expect(lastQuery!.get("step")).toBe(String(4 * 3600));
  });

  it("counts distinct signed-in users from the logs, and reports a metrics failure", async () => {
    const logsKey = logsDb.connect();
    const transport = createPersistentLogTransport({
      getDbKey: () => logsKey,
      flushIntervalMs: 60_000,
    });
    const logger = winston.createLogger({ transports: [transport] });
    logger.child({ user_id: "u_1" }).info("a");
    logger.child({ user_id: "u_2" }).info("b");
    logger.child({ user_id: "u_1" }).info("c");
    transport.flush();
    transport.close();
    const a = await digestActivity(
      {
        metrics: { app: "hub", proxyUrl: "http://127.0.0.1:1" },
        logsDbKey: logsKey,
      },
      new Date(Date.now() - 60_000),
    );
    expect(a?.distinct_users).toBe(2);
    expect(a?.requests_by_hour).toBeNull();
    expect(a?.error).toMatch(/Prometheus unreachable/);
  });

  it("is null when the product has neither metrics nor logs", async () => {
    expect(await digestActivity({}, since, now)).toBeNull();
  });
});
