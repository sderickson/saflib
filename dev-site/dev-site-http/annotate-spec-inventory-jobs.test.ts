import { describe, expect, it } from "vitest";
import { annotateSpecInventoryJobEdges } from "./annotate-spec-inventory-jobs.ts";
import type { PackageSpecInventory } from "./spec-inventory-build.ts";

function emptyOp(operationId: string) {
  return {
    operationId,
    method: "post",
    path: `/${operationId}`,
    summary: null,
    tags: [] as string[],
    yamlPath: `routes/${operationId}.yaml`,
    routeStem: operationId,
    handler: null,
    request: null,
    fake: null,
    handlerTests: [] as { fullName: string }[],
    requestSchemas: [] as string[],
    responseSchemas: [] as string[],
    usedBy: [] as PackageSpecInventory["entities"][number]["operations"][number]["usedBy"],
  };
}

describe("annotateSpecInventoryJobEdges", () => {
  it("sets enqueues and reverse enqueuedBy from the trigger map", () => {
    const inventory: PackageSpecInventory = {
      packageName: "@pathclerk/daemon-spec",
      entities: [
        {
          key: "matters",
          label: "matters",
          presence: "routes",
          resource: "matters",
          schema: null,
          usedByPackages: [],
          operations: [
            emptyOp("uploadResourceMatters"),
            emptyOp("autoClaimBacklogMatters"),
            emptyOp("ocrMatterResource"),
          ],
        },
      ],
    };

    annotateSpecInventoryJobEdges(inventory, {
      uploadResourceMatters: ["autoClaimBacklogMatters"],
      autoClaimBacklogMatters: [
        "autoClaimBacklogMatters",
        "ocrMatterResource",
      ],
      "cron:recoverySweep": ["autoClaimBacklogMatters"],
    });

    const byId = Object.fromEntries(
      inventory.entities[0]!.operations.map((o) => [o.operationId, o]),
    );

    expect(byId.uploadResourceMatters!.enqueues).toEqual([
      "autoClaimBacklogMatters",
    ]);
    expect(byId.uploadResourceMatters!.enqueuedBy).toEqual([]);

    expect(byId.autoClaimBacklogMatters!.enqueues).toEqual([
      "autoClaimBacklogMatters",
      "ocrMatterResource",
    ]);
    expect(byId.autoClaimBacklogMatters!.enqueuedBy).toEqual([
      "autoClaimBacklogMatters",
      "cron:recoverySweep",
      "uploadResourceMatters",
    ]);

    expect(byId.ocrMatterResource!.enqueues).toEqual([]);
    expect(byId.ocrMatterResource!.enqueuedBy).toEqual([
      "autoClaimBacklogMatters",
    ]);
  });
});
