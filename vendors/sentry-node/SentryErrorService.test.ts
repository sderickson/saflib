import { afterEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
vi.mock("@sentry/node", () => ({
  init,
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock("@saflib/node", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  addErrorCollector: vi.fn(),
}));

const { SentryErrorService } = await import("./SentryErrorService.ts");

describe("SentryErrorService.installServerCollector", () => {
  afterEach(() => {
    init.mockClear();
    delete process.env.SENTRY_DSN;
  });

  it("tells Sentry v11 to collect nothing beyond the error by default", () => {
    process.env.SENTRY_DSN = "https://key@o0.ingest.sentry.io/0";
    new SentryErrorService().installServerCollector();
    const options = init.mock.calls[0]![0];
    expect(options.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
    expect(options).not.toHaveProperty("sendDefaultPii");
  });

  it("leaves Sentry's default collection when a product opts in", () => {
    process.env.SENTRY_DSN = "https://key@o0.ingest.sentry.io/0";
    new SentryErrorService({ sendDefaultPii: true }).installServerCollector();
    expect(init.mock.calls[0]![0]).not.toHaveProperty("dataCollection");
  });

  it("does nothing without a DSN", () => {
    new SentryErrorService().installServerCollector();
    expect(init).not.toHaveBeenCalled();
  });
});
