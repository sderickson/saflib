import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@google-cloud/storage", () => {
  const Storage = vi.fn(function Storage(
    this: { options: unknown },
    options?: unknown,
  ) {
    this.options = options;
  });
  return { Storage };
});

import { Storage } from "@google-cloud/storage";
import {
  configureGcsClient,
  getStorage,
  resetGcsClientForTests,
} from "./client.ts";

describe("gcs client configuration", () => {
  beforeEach(() => {
    resetGcsClientForTests();
    vi.mocked(Storage).mockClear();
  });

  afterEach(() => {
    resetGcsClientForTests();
  });

  it("uses Application Default Credentials when not configured", () => {
    getStorage();
    expect(Storage).toHaveBeenCalledWith(undefined);
  });

  it("applies credentials from configureGcsClient", () => {
    const credentials = {
      client_email: "sa@example.iam.gserviceaccount.com",
      private_key:
        "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n",
    };
    configureGcsClient({
      projectId: "weighty-pine-20",
      credentials,
    });
    getStorage();
    expect(Storage).toHaveBeenCalledWith({
      projectId: "weighty-pine-20",
      credentials,
    });
  });
});
