import { describe, expect, it, vi } from "vitest";

vi.mock("@saflib/node", () => ({
  getServiceName: () => "test-service",
  getSafReporters: () => ({ log: { warn: vi.fn(), info: vi.fn() } }),
  addTransport: vi.fn(),
}));

vi.mock("../env.ts", () => ({
  typedEnv: {},
}));

describe("addLokiTransport", () => {
  it("no-ops when LOKI_HOSTNAME / LOKI_PORT are unset", async () => {
    const { addTransport } = await import("@saflib/node");
    const { addLokiTransport } = await import("./addLokiTransport.ts");
    addLokiTransport();
    expect(addTransport).not.toHaveBeenCalled();
  });
});
