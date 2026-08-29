import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertNoRootResponseBodies,
  findRootResponseBodyViolations,
} from "./no-root-response-bodies.ts";

function withTempPackage(
  setup: (root: string) => void,
  run: (root: string) => void,
): void {
  const root = mkdtempSync(path.join(tmpdir(), "no-root-response-"));
  try {
    setup(root);
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("findRootResponseBodyViolations", () => {
  it("passes keyed envelope responses", () => {
    withTempPackage(
      (root) => {
        mkdirSync(path.join(root, "routes", "recipes"), { recursive: true });
        writeFileSync(
          path.join(root, "routes", "recipes", "get.yaml"),
          `
getRecipe:
  operationId: getRecipe
  responses:
    "200":
      content:
        application/json:
          schema:
            type: object
            required: [recipe]
            properties:
              recipe:
                $ref: "../../schemas/recipe.yaml"
`,
        );
      },
      (root) => {
        expect(findRootResponseBodyViolations(root)).toEqual([]);
        expect(() => assertNoRootResponseBodies(root)).not.toThrow();
      },
    );
  });

  it("flags bare $ref at success root", () => {
    withTempPackage(
      (root) => {
        mkdirSync(path.join(root, "routes"), { recursive: true });
        writeFileSync(
          path.join(root, "routes", "get.yaml"),
          `
getRecipe:
  operationId: getRecipe
  responses:
    "200":
      content:
        application/json:
          schema:
            $ref: "../schemas/recipe.yaml"
    "404":
      content:
        application/json:
          schema:
            $ref: "pkg:@saflib/openapi/schemas/error.yaml"
`,
        );
      },
      (root) => {
        const violations = findRootResponseBodyViolations(root);
        expect(violations).toHaveLength(1);
        expect(violations[0]?.allowKey).toBe("getRecipe:200");
        expect(() => assertNoRootResponseBodies(root)).toThrow(/getRecipe:200/);
      },
    );
  });

  it("flags root arrays", () => {
    withTempPackage(
      (root) => {
        mkdirSync(path.join(root, "routes"), { recursive: true });
        writeFileSync(
          path.join(root, "routes", "list.yaml"),
          `
get:
  operationId: listRecipes
  responses:
    "200":
      content:
        application/json:
          schema:
            type: array
            items:
              $ref: "../schemas/recipe.yaml"
`,
        );
      },
      (root) => {
        expect(findRootResponseBodyViolations(root)[0]?.allowKey).toBe(
          "listRecipes:200",
        );
      },
    );
  });

  it("honors allowlist and fails on unused allow entries", () => {
    withTempPackage(
      (root) => {
        mkdirSync(path.join(root, "routes"), { recursive: true });
        writeFileSync(
          path.join(root, "routes", "get.yaml"),
          `
getRecipe:
  operationId: getRecipe
  responses:
    "200":
      content:
        application/json:
          schema:
            $ref: "../schemas/recipe.yaml"
`,
        );
      },
      (root) => {
        expect(() =>
          assertNoRootResponseBodies(root, {
            allow: ["getRecipe:200"],
          }),
        ).not.toThrow();
        expect(() =>
          assertNoRootResponseBodies(root, {
            allow: ["getRecipe:200", "ghost:200"],
          }),
        ).toThrow(/Unused root-response allowlist/);
      },
    );
  });

  it("allows empty object success bodies", () => {
    withTempPackage(
      (root) => {
        mkdirSync(path.join(root, "routes"), { recursive: true });
        writeFileSync(
          path.join(root, "routes", "ok.yaml"),
          `
noop:
  operationId: noop
  responses:
    "200":
      content:
        application/json:
          schema:
            type: object
            additionalProperties: false
            properties: {}
`,
        );
      },
      (root) => {
        expect(findRootResponseBodyViolations(root)).toEqual([]);
      },
    );
  });
});
