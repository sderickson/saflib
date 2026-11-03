import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allowReturnUrls } from "./make-satellite.ts";

const kratosConfig = (urls: string[]) =>
  [
    "selfservice:",
    "  default_browser_return_url: https://auth.acme.test/",
    "  allowed_return_urls:",
    ...urls.map((url) => `    - ${url}`),
    "",
    "  flows:",
    "    login:",
    "      ui_url: https://auth.acme.test/login",
    "",
  ].join("\n");

function withConfig(urls: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "make-satellite-"));
  const file = path.join(dir, "kratos.yml");
  fs.writeFileSync(file, kratosConfig(urls));
  return file;
}

describe("allowReturnUrls", () => {
  it("appends hosts to the list, leaving the rest of the file alone", () => {
    const file = withConfig(["https://acme.test/", "https://app.acme.test/"]);
    expect(allowReturnUrls(file, ["https://app.notes.acme.test/"])).toBe(true);
    expect(fs.readFileSync(file, "utf8")).toBe(
      kratosConfig([
        "https://acme.test/",
        "https://app.acme.test/",
        "https://app.notes.acme.test/",
      ]),
    );
  });

  it("skips hosts already listed or covered by a wildcard", () => {
    const file = withConfig([
      "https://scotterickson.info/",
      "https://*.scotterickson.info/",
    ]);
    expect(
      allowReturnUrls(file, ["https://app.notebook.scotterickson.info/"]),
    ).toBe(false);
    expect(allowReturnUrls(file, ["https://scotterickson.info/"])).toBe(false);
  });

  it("does nothing when the file doesn't exist", () => {
    expect(
      allowReturnUrls("/nonexistent/kratos.yml", ["https://x.test/"]),
    ).toBe(false);
  });
});
