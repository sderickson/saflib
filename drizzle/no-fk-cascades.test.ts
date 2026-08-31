import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertNoFkCascades,
  findFkCascadeViolations,
} from "./no-fk-cascades.ts";

function withTempPackage(
  setup: (root: string) => void,
  run: (root: string) => void,
): void {
  const root = mkdtempSync(path.join(tmpdir(), "no-fk-cascades-"));
  try {
    setup(root);
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("findFkCascadeViolations", () => {
  it("passes a clean package", () => {
    withTempPackage(
      (root) => {
        mkdirSync(path.join(root, "migrations"), { recursive: true });
        mkdirSync(path.join(root, "schemas"), { recursive: true });
        writeFileSync(
          path.join(root, "migrations", "0000.sql"),
          "FOREIGN KEY (`a`) REFERENCES `b`(`id`) ON UPDATE no action ON DELETE no action\n",
        );
        writeFileSync(
          path.join(root, "schemas", "thing.ts"),
          `export const t = text("x").references(() => other.id);\n`,
        );
      },
      (root) => {
        expect(findFkCascadeViolations(root)).toEqual([]);
        expect(() => assertNoFkCascades(root)).not.toThrow();
      },
    );
  });

  it("flags ON DELETE CASCADE in migrations", () => {
    withTempPackage(
      (root) => {
        mkdirSync(path.join(root, "migrations"), { recursive: true });
        writeFileSync(
          path.join(root, "migrations", "0001.sql"),
          "\tFOREIGN KEY (`a`) REFERENCES `b`(`id`) ON DELETE CASCADE\n",
        );
      },
      (root) => {
        const violations = findFkCascadeViolations(root);
        expect(violations).toHaveLength(1);
        expect(violations[0]?.file).toBe(path.join("migrations", "0001.sql"));
        expect(violations[0]?.line).toBe(1);
        expect(() => assertNoFkCascades(root)).toThrow(/FK CASCADE is not allowed/);
      },
    );
  });

  it("flags onDelete cascade in schemas", () => {
    withTempPackage(
      (root) => {
        mkdirSync(path.join(root, "schemas"), { recursive: true });
        writeFileSync(
          path.join(root, "schemas", "child.ts"),
          [
            `parent_id: text("parent_id")`,
            `  .references(() => parent.id, { onDelete: "cascade" }),`,
            ``,
          ].join("\n"),
        );
      },
      (root) => {
        const violations = findFkCascadeViolations(root);
        expect(violations).toHaveLength(1);
        expect(violations[0]?.file).toBe(path.join("schemas", "child.ts"));
        expect(violations[0]?.line).toBe(2);
      },
    );
  });

  it("scans root schema.ts (cron-style packages)", () => {
    withTempPackage(
      (root) => {
        writeFileSync(
          path.join(root, "schema.ts"),
          `id: text("id").references(() => t.id, { onUpdate: 'cascade' })\n`,
        );
      },
      (root) => {
        expect(findFkCascadeViolations(root)).toHaveLength(1);
      },
    );
  });

  it("ignores migrations/meta and *.test.ts", () => {
    withTempPackage(
      (root) => {
        mkdirSync(path.join(root, "migrations", "meta"), { recursive: true });
        mkdirSync(path.join(root, "schemas"), { recursive: true });
        writeFileSync(
          path.join(root, "migrations", "meta", "0000_snapshot.json"),
          `"onDelete": "cascade"\n`,
        );
        writeFileSync(
          path.join(root, "schemas", "notes.test.ts"),
          `// onDelete: "cascade" in a comment for docs\n`,
        );
      },
      (root) => {
        expect(findFkCascadeViolations(root)).toEqual([]);
      },
    );
  });
});
