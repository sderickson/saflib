import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { main, OpsSessionError, type OpsSessionDeps } from "./ops-session.ts";

const LONG_LIVED = "safops_long-lived-secret";
const SHORT_LIVED = "safops_short-lived-secret";
const NOW = Date.parse("2026-11-15T10:00:00Z");

describe("ops-session", () => {
  let dir: string;
  let lines: string[];
  let fetchMock: ReturnType<typeof vi.fn>;
  let deps: OpsSessionDeps;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "ops-session-"));
    lines = [];
    fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).authorization;
      if (url.endsWith("/ops/tokens/exchange")) {
        if (auth !== `Bearer ${LONG_LIVED}`) return new Response("{}", { status: 401 });
        return Response.json(
          {
            token: SHORT_LIVED,
            ops_token: { expires_at: "2026-11-15T11:00:00.000Z", scopes: ["ops:read", "ops:triage"] },
          },
          { status: 201 },
        );
      }
      if (auth !== `Bearer ${SHORT_LIVED}`) return new Response("{}", { status: 401 });
      return Response.json({ ok: true, url });
    });
    deps = {
      fetch: fetchMock as unknown as typeof fetch,
      readSecret: async () => LONG_LIVED,
      sessionDir: path.join(dir, "saf-ops"),
      now: () => NOW,
      out: (line) => lines.push(line),
    };
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const start = () =>
    main(
      ["start", "--name", "casedaemon", "--api", "https://api.example.com/", "--op-ref", "op://Private/x/credential"],
      deps,
    );

  it("exchanges the stored token and saves only the short-lived one, private to the user", async () => {
    await start();
    const file = path.join(dir, "saf-ops", "casedaemon.json");
    const saved = await readFile(file, "utf8");
    expect(JSON.parse(saved)).toEqual({
      api: "https://api.example.com",
      token: SHORT_LIVED,
      expires_at: "2026-11-15T11:00:00.000Z",
      scopes: ["ops:read", "ops:triage"],
    });
    expect(saved).not.toContain(LONG_LIVED);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    expect(lines.join("\n")).not.toContain("safops_");
  });

  it("calls the API with the session and prints the body", async () => {
    await start();
    lines.length = 0;
    await main(["call", "--name", "casedaemon", "/ops/digest"], deps);
    expect(JSON.parse(lines[0]!)).toEqual({ ok: true, url: "https://api.example.com/ops/digest" });

    await main(["call", "--name", "casedaemon", "/ops/issues/abc/resolve", "--data", "{}"], deps);
    const init = fetchMock.mock.calls.at(-1)![1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
  });

  it("asks for a new session when there is none or it expired", async () => {
    await expect(main(["call", "--name", "casedaemon", "/ops/digest"], deps)).rejects.toMatchObject({
      exitCode: 2,
      message: expect.stringContaining("npm run ops-session"),
    });

    await start();
    deps.now = () => Date.parse("2026-11-15T11:00:01Z");
    await expect(main(["call", "--name", "casedaemon", "/ops/digest"], deps)).rejects.toMatchObject({ exitCode: 2 });
    await expect(main(["status", "--name", "casedaemon"], deps)).rejects.toMatchObject({ exitCode: 2 });
  });

  it("only calls /ops/ paths", async () => {
    await start();
    await expect(main(["call", "--name", "casedaemon", "/admin/ops-tokens"], deps)).rejects.toBeInstanceOf(
      OpsSessionError,
    );
  });

  it("explains a failed exchange without printing the token", async () => {
    deps.readSecret = async () => "safops_wrong";
    await expect(start()).rejects.toThrow(/HTTP 401.*invalid, expired, or revoked/);
  });
});
