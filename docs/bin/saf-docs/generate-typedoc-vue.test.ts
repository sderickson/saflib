import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupEmittedDeclarationArtifacts,
  isEmittedDeclarationArtifact,
} from "./generate-typedoc-vue.ts";

describe("isEmittedDeclarationArtifact", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("matches emitted TypeScript declarations", () => {
    tempDir = mkdtempSync(join(tmpdir(), "saf-docs-cleanup-"));
    const tsPath = join(tempDir, "index.ts");
    writeFileSync(tsPath, "export const x = 1;\n");
    writeFileSync(join(tempDir, "index.d.ts"), "export declare const x: 1;\n");

    expect(isEmittedDeclarationArtifact(join(tempDir, "index.d.ts"))).toBe(
      true,
    );
    expect(isEmittedDeclarationArtifact(join(tempDir, "index.d.ts.map"))).toBe(
      true,
    );
  });

  it("matches emitted Vue SFC declarations", () => {
    tempDir = mkdtempSync(join(tmpdir(), "saf-docs-cleanup-"));
    writeFileSync(join(tempDir, "Widget.vue"), "<template></template>\n");
    writeFileSync(
      join(tempDir, "Widget.vue.d.ts"),
      "declare const _default: unknown;\n",
    );

    expect(isEmittedDeclarationArtifact(join(tempDir, "Widget.vue.d.ts"))).toBe(
      true,
    );
  });

  it("keeps hand-written ambient declarations", () => {
    tempDir = mkdtempSync(join(tmpdir(), "saf-docs-cleanup-"));
    writeFileSync(join(tempDir, "assets.d.ts"), 'declare module "*.css";\n');

    expect(isEmittedDeclarationArtifact(join(tempDir, "assets.d.ts"))).toBe(
      false,
    );
  });
});

describe("cleanupEmittedDeclarationArtifacts", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("removes dist/types and emitted declarations next to source", () => {
    tempDir = mkdtempSync(join(tmpdir(), "saf-docs-cleanup-"));
    writeFileSync(
      join(tempDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { outDir: "./dist/types" },
      }),
    );
    writeFileSync(join(tempDir, "index.ts"), "export const x = 1;\n");
    writeFileSync(join(tempDir, "index.d.ts"), "export declare const x: 1;\n");
    writeFileSync(join(tempDir, "assets.d.ts"), 'declare module "*.css";\n');

    const outDir = join(tempDir, "dist/types");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.d.ts"), "export declare const x: 1;\n");

    cleanupEmittedDeclarationArtifacts(tempDir);

    expect(existsSync(join(tempDir, "index.d.ts"))).toBe(false);
    expect(existsSync(join(outDir, "index.d.ts"))).toBe(false);
    expect(existsSync(join(tempDir, "assets.d.ts"))).toBe(true);
  });
});
