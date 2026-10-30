import { describe, it, expect } from "vitest";
import { volumeExportArgv, volumeImportArgv } from "./volume.ts";

describe("volume copy argv", () => {
  it("imports a host folder into the volume, writable by service users", () => {
    const argv = volumeImportArgv("app-dev-db-data", "/repo/service/db/data");
    expect(argv).toContain("/repo/service/db/data:/from:ro");
    expect(argv).toContain("app-dev-db-data:/to");
    expect(argv.at(-1)).toContain("rm -f /to/.gitkeep");
    expect(argv.at(-1)).toContain("chmod -R a+rwX /to");
  });

  it("exports the volume read-only into a host folder", () => {
    const argv = volumeExportArgv("app-dev-db-data", "/tmp/snapshot");
    expect(argv).toContain("app-dev-db-data:/from:ro");
    expect(argv).toContain("/tmp/snapshot:/to");
  });
});
