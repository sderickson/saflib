import { describe, it, expect } from "vitest";
import { cvss3BaseScore, severityFromScore } from "./cvss.ts";
import { parseDpkgStatus, osvEcosystem } from "./os-packages.ts";

describe("cvss3BaseScore", () => {
  it("scores vectors like NVD", () => {
    expect(cvss3BaseScore("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N")).toBe(7.5);
    expect(cvss3BaseScore("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toBe(9.8);
    expect(cvss3BaseScore("CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N")).toBe(6.1);
    expect(cvss3BaseScore("CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:H")).toBe(5.9);
    expect(cvss3BaseScore("CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:N")).toBe(0);
  });

  it("returns null for other versions or junk", () => {
    expect(cvss3BaseScore("CVSS:4.0/AV:N")).toBeNull();
    expect(cvss3BaseScore("CVSS:3.1/AV:X")).toBeNull();
  });

  it("maps scores to ratings", () => {
    expect([9.8, 7.5, 5.9, 2, 0].map(severityFromScore)).toEqual(["critical", "high", "moderate", "low", "unknown"]);
  });
});

describe("parseDpkgStatus", () => {
  it("folds installed binaries into source packages", () => {
    const raw = [
      "Package: libssl3\nStatus: install ok installed\nSource: openssl\nVersion: 3.0.15-1~deb12u1",
      "Package: openssl\nStatus: install ok installed\nVersion: 3.0.15-1~deb12u1",
      "Package: libc6\nStatus: install ok installed\nSource: glibc (2.36-9+deb12u9)\nVersion: 2.36-9+deb12u9",
      "Package: gone\nStatus: deinstall ok config-files\nVersion: 1.0",
    ].join("\n\n");
    expect(parseDpkgStatus(raw)).toEqual([
      { name: "glibc", version: "2.36-9+deb12u9" },
      { name: "openssl", version: "3.0.15-1~deb12u1" },
    ]);
  });

  it("knows OSV's Debian ecosystem", () => {
    expect(osvEcosystem({ id: "debian", versionId: "12" })).toBe("Debian:12");
    expect(osvEcosystem({ id: "alpine", versionId: "3.22.1" })).toBeUndefined();
  });
});
