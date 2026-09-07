import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDownload } from "./download.ts";

const mockFetch = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

function stubDocument(cookie: string) {
  Object.defineProperty(global, "document", {
    value: {
      cookie,
      location: {
        host: "localhost:3000",
        protocol: "http:",
        hostname: "localhost",
      },
      createElement: vi.fn(() => ({
        href: "",
        download: "",
        click: mockClick,
      })),
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild,
      },
    },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateObjectURL.mockReturnValue("blob:test-url");
  Object.defineProperty(global, "fetch", {
    value: mockFetch,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(global, "window", {
    value: {
      URL: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
    },
    writable: true,
    configurable: true,
  });
  stubDocument("_csrf_token=test-token-123");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useDownload", () => {
  it("should create a download composable with correct initial state", () => {
    const { isDownloading, error, download } = useDownload({
      subdomain: "test",
      path: "/download",
      filename: "test.csv",
    });

    expect(isDownloading.value).toBe(false);
    expect(error.value).toBe(null);
    expect(typeof download).toBe("function");
  });

  it("should handle successful download", async () => {
    const mockBlob = new Blob(["test data"], { type: "text/csv" });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "text/csv"]]),
      blob: () => Promise.resolve(mockBlob),
    });

    const { download, isDownloading } = useDownload({
      subdomain: "test",
      path: "/download",
      filename: "test.csv",
    });

    await download();

    expect(isDownloading.value).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.localhost:3000/download",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: {
          "X-CSRF-Token": "test-token-123",
        },
      }),
    );
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });

  it("should handle download errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Map(),
    });

    const { download, error } = useDownload({
      subdomain: "test",
      path: "/download",
      filename: "test.csv",
    });

    await expect(download()).rejects.toThrow("HTTP error! status: 404");
    expect(error.value).toBe("HTTP error! status: 404");
  });

  it("should handle missing CSRF token", async () => {
    stubDocument("");

    const { download, error } = useDownload({
      subdomain: "test",
      path: "/download",
      filename: "test.csv",
    });

    await expect(download()).rejects.toThrow("CSRF token not found");
    expect(error.value).toBe("CSRF token not found");
  });
});
