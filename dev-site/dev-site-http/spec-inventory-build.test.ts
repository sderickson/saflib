import { describe, expect, it } from "vitest";
import {
  buildSpecInventoryFromFiles,
  singularizeStem,
  stemsMatch,
  toKebabStem,
} from "./spec-inventory-build.ts";

describe("stem linking", () => {
  it("normalizes PascalCase and snake to kebab", () => {
    expect(toKebabStem("Matter")).toBe("matter");
    expect(toKebabStem("MatterResource")).toBe("matter-resource");
    expect(toKebabStem("matter_resource")).toBe("matter-resource");
  });

  it("singularizes light plurals", () => {
    expect(singularizeStem("matters")).toBe("matter");
    expect(singularizeStem("matter-resources")).toBe("matter-resource");
    expect(singularizeStem("parties")).toBe("party");
  });

  it("matches schema names to route folders", () => {
    expect(stemsMatch("Matter", "matters")).toBe(true);
    expect(stemsMatch("MatterResource", "matter-resources")).toBe(true);
    expect(stemsMatch("FormSummary", "forms")).toBe(false);
    expect(stemsMatch("Error", "admin")).toBe(false);
  });
});

describe("buildSpecInventoryFromFiles", () => {
  it("classifies object / both / routes and sorts alphabetically", () => {
    const files = new Map<string, string>([
      [
        "openapi.yaml",
        `
openapi: 3.1.0
paths:
  /matters:
    post:
      $ref: "./routes/matters/create.yaml#/createMatter"
  /matters/everything:
    get:
      $ref: "./routes/matters/list-everything.yaml#/listMattersEverything"
  /admin/test-error:
    post:
      $ref: "./routes/admin/test-error.yaml#/postAdminTestError"
components:
  schemas:
    Matter:
      $ref: "./schemas/matter.yaml"
    Importer:
      $ref: "./schemas/importer.yaml"
    Error:
      $ref: "./schemas/error.yaml"
    ProductEvent:
      $ref: "./events/index.yaml"
`,
      ],
      [
        "routes/matters/create.yaml",
        `
createMatter:
  summary: Create a matter
  operationId: createMatter
  tags:
    - email-verified
  requestBody:
    content:
      application/json:
        schema:
          type: object
          properties:
            name:
              type: string
  responses:
    "201":
      content:
        application/json:
          schema:
            $ref: "../../openapi.yaml#/components/schemas/Matter"
`,
      ],
      [
        "routes/matters/list-everything.yaml",
        `
listMattersEverything:
  operationId: listMattersEverything
  tags:
    - email-verified
    - mfa-required
  responses:
    "200":
      content:
        application/json:
          schema:
            type: object
            properties:
              matters:
                type: array
                items:
                  $ref: "../../openapi.yaml#/components/schemas/Matter"
              importers:
                type: array
                items:
                  $ref: "../../openapi.yaml#/components/schemas/Importer"
`,
      ],
      [
        "routes/admin/test-error.yaml",
        `
postAdminTestError:
  summary: Trigger error
  operationId: postAdminTestError
  responses:
    "500":
      content:
        application/json:
          schema:
            $ref: "../../schemas/error.yaml"
`,
      ],
      [
        "schemas/matter.yaml",
        `
type: object
description: A case/matter
properties:
  id:
    type: string
    description: Short id
  name:
    type: string
`,
      ],
      [
        "schemas/importer.yaml",
        `
type: object
properties:
  id:
    type: string
`,
      ],
      [
        "schemas/error.yaml",
        `
type: object
properties:
  message:
    type: string
`,
      ],
      [
        "events/index.yaml",
        `
type: object
properties:
  type:
    type: string
`,
      ],
    ]);

    const inv = buildSpecInventoryFromFiles(files);
    const byLabel = Object.fromEntries(inv.entities.map((e) => [e.label, e]));

    expect(inv.entities.map((e) => e.label)).toEqual([
      "admin",
      "Error",
      "Importer",
      "Matter",
    ]);

    expect(byLabel.Matter?.presence).toBe("both");
    expect(byLabel.Matter?.resource).toBe("matters");
    expect(byLabel.Matter?.operations.map((o) => o.operationId)).toEqual([
      "createMatter",
      "listMattersEverything",
    ]);
    expect(byLabel.Matter?.schema?.properties.map((p) => p.name)).toEqual([
      "id",
      "name",
    ]);
    expect(byLabel.Matter?.schema?.referencedByOperations).toEqual([
      "createMatter",
      "listMattersEverything",
    ]);

    const create = byLabel.Matter?.operations.find(
      (o) => o.operationId === "createMatter",
    );
    expect(create?.tags).toEqual(["email-verified"]);
    expect(create?.routeStem).toBe("matters/create");
    expect(create?.requestSchemas).toEqual([]);
    expect(create?.responseSchemas).toEqual(["Matter"]);

    const listAll = byLabel.Matter?.operations.find(
      (o) => o.operationId === "listMattersEverything",
    );
    expect(listAll?.tags).toEqual(["email-verified", "mfa-required"]);
    expect(listAll?.responseSchemas).toEqual(["Importer", "Matter"]);

    expect(byLabel.Error?.presence).toBe("object");
    expect(byLabel.Error?.operations).toEqual([]);

    expect(byLabel.admin?.presence).toBe("routes");
    expect(byLabel.admin?.schema).toBeNull();
    expect(byLabel.admin?.operations.map((o) => o.operationId)).toEqual([
      "postAdminTestError",
    ]);

    // events/ schemas are excluded from business objects
    expect(byLabel.ProductEvent).toBeUndefined();
  });

  it("returns empty when openapi.yaml missing", () => {
    expect(buildSpecInventoryFromFiles(new Map()).entities).toEqual([]);
  });
});
