import { afterEach, describe, expect, it } from "vitest";
import {
  configureAppDocumentTitle,
  DEFAULT_APP_DOCUMENT_TITLE,
  formatDocumentTitle,
} from "./document-title.ts";

describe("formatDocumentTitle", () => {
  afterEach(() => {
    configureAppDocumentTitle(DEFAULT_APP_DOCUMENT_TITLE);
  });

  it("appends the configured app name when a segment is provided", () => {
    configureAppDocumentTitle("CaseDaemon");
    expect(formatDocumentTitle("Home")).toBe("Home — CaseDaemon");
  });

  it("returns only the app name when the segment is empty", () => {
    configureAppDocumentTitle("CaseDaemon");
    expect(formatDocumentTitle(null)).toBe("CaseDaemon");
    expect(formatDocumentTitle("   ")).toBe("CaseDaemon");
  });

  it("allows a per-call app title override", () => {
    expect(formatDocumentTitle("Home", "Other App")).toBe("Home — Other App");
  });
});
