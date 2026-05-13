import { QueryClient } from "@tanstack/vue-query";
import { describe, expect, it, vi } from "vitest";
import {
  invalidateKratosMySessionsQueries,
  kratosMySessionsQueryOptions,
} from "./kratos-my-sessions.ts";

const listMySessions = vi.fn();

vi.mock("../kratos-client.ts", () => ({
  getKratosFrontendApi: () => ({ listMySessions }),
}));

describe("kratos my sessions query", () => {
  it("fetchQuery returns session list on success", async () => {
    listMySessions.mockReset();
    listMySessions.mockResolvedValue({
      data: [{ id: "a", active: true }, { id: "b", active: true }],
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const data = await qc.fetchQuery(kratosMySessionsQueryOptions());
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe("a");
  });

  it("normalizes undefined data to empty array", async () => {
    listMySessions.mockReset();
    listMySessions.mockResolvedValue({ data: undefined });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const data = await qc.fetchQuery(kratosMySessionsQueryOptions());
    expect(data).toEqual([]);
  });
});

describe("invalidateKratosMySessionsQueries", () => {
  it("invalidates my-sessions query key", () => {
    const qc = new QueryClient();
    const pred = vi.fn();
    qc.invalidateQueries = pred as never;
    invalidateKratosMySessionsQueries(qc);
    expect(pred).toHaveBeenCalledWith({ queryKey: ["kratos", "my-sessions"] });
  });
});
