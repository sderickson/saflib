import { describe, expect, it } from "vitest";
import { providerHints, PROVIDERS } from "./providers.ts";

describe("providerHints", () => {
  it("picks a provider by name, case-insensitively, falling back to generic", () => {
    expect(providerHints("DigitalOcean")).toBe(PROVIDERS.digitalocean);
    expect(providerHints("gcp").addressMove.join("\n")).toContain(
      "gcloud compute instances",
    );
    expect(providerHints(undefined)).toBe(PROVIDERS.generic);
    expect(providerHints("azure")).toBe(PROVIDERS.generic);
  });
});
