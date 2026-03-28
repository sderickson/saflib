import { QueryClient } from "@tanstack/vue-query";
import { AxiosError } from "axios";
import { withVueQuery } from "@saflib/sdk/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  invalidateKratosSessionQueries,
  kratosSessionQueryOptions,
  useInvalidateKratosSession,
} from "./kratos-session.ts";

const toSession = vi.fn();

vi.mock("../kratos-client.ts", () => ({
  getKratosFrontendApi: () => ({ toSession }),
}));

describe("kratos session query", () => {
  beforeEach(() => {
    toSession.mockReset();
  });

  it("fetchQuery returns session data on success", async () => {
    toSession.mockResolvedValue({ data: { id: "s", active: true } });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const data = await qc.fetchQuery(kratosSessionQueryOptions());
    expect(data).toEqual({ id: "s", active: true });
  });

  it("fetchQuery returns null on 401", async () => {
    const err = new AxiosError("unauthorized");
    err.response = { status: 401 } as never;
    toSession.mockRejectedValue(err);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const data = await qc.fetchQuery(kratosSessionQueryOptions());
    expect(data).toBeNull();
  });

  it("fetchQuery rethrows non-401 Axios errors", async () => {
    const err = new AxiosError("server");
    err.response = { status: 500 } as never;
    toSession.mockRejectedValue(err);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(qc.fetchQuery(kratosSessionQueryOptions())).rejects.toBe(err);
  });
});

describe("invalidateKratosSessionQueries", () => {
  it("calls invalidateQueries with a predicate that only matches session keys", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    invalidateKratosSessionQueries(qc);
    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0][0] as {
      predicate: (q: { queryKey: unknown }) => boolean;
    };
    const pred = arg.predicate;
    expect(pred({ queryKey: ["kratos", "session"] } as never)).toBe(true);
    expect(pred({ queryKey: ["kratos", "session", "x"] } as never)).toBe(true);
    expect(pred({ queryKey: ["kratos", "login"] } as never)).toBe(false);
  });
});

describe("useInvalidateKratosSession", () => {
  it("returns a function that invalidates session queries", () => {
    const [{ invalidate }, app, qc] = withVueQuery(() => ({
      invalidate: useInvalidateKratosSession(),
    }));
    const spy = vi.spyOn(qc, "invalidateQueries");
    invalidate();
    expect(spy).toHaveBeenCalled();
    app.unmount();
  });
});
