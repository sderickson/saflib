import { describe, expect, it } from "vitest";
import { annotateSpecInventoryJobEdges } from "./annotate-spec-inventory-jobs.ts";
import type { PackageSpecInventory } from "./spec-inventory-build.ts";

function emptyOp(operation_id: string) {
  return {
    operation_id,
    method: "post",
    path: `/${operation_id}`,
    summary: null,
    tags: [] as string[],
    yaml_path: `routes/${operation_id}.yaml`,
    route_stem: operation_id,
    handler: null,
    request: null,
    fake: null,
    handler_tests: [] as { full_name: string }[],
    request_schemas: [] as string[],
    response_schemas: [] as string[],
    used_by: [] as PackageSpecInventory["entities"][number]["operations"][number]["used_by"],
  };
}

describe("annotateSpecInventoryJobEdges", () => {
  it("sets enqueues and reverse enqueued_by from the trigger map", () => {
    const inventory: PackageSpecInventory = {
      entities: [
        {
          key: "matters",
          label: "matters",
          presence: "routes",
          resource: "matters",
          schema: null,
          used_by_packages: [],
          operations: [
            emptyOp("uploadResourceMatters"),
            emptyOp("autoClaimBacklogMatters"),
            emptyOp("extractFormDataMatterResource"),
          ],
        },
      ],
    };

    annotateSpecInventoryJobEdges(inventory, {
      uploadResourceMatters: ["autoClaimBacklogMatters"],
      autoClaimBacklogMatters: [
        "autoClaimBacklogMatters",
        "extractFormDataMatterResource",
      ],
      "cron:recoverySweep": ["autoClaimBacklogMatters"],
    });

    const byId = Object.fromEntries(
      inventory.entities[0]!.operations.map((o) => [o.operation_id, o]),
    );

    expect(byId.uploadResourceMatters!.enqueues).toEqual([
      "autoClaimBacklogMatters",
    ]);
    expect(byId.uploadResourceMatters!.enqueued_by).toEqual([]);

    expect(byId.autoClaimBacklogMatters!.enqueues).toEqual([
      "autoClaimBacklogMatters",
      "extractFormDataMatterResource",
    ]);
    expect(byId.autoClaimBacklogMatters!.enqueued_by).toEqual([
      "autoClaimBacklogMatters",
      "cron:recoverySweep",
      "uploadResourceMatters",
    ]);

    expect(byId.extractFormDataMatterResource!.enqueues).toEqual([]);
    expect(byId.extractFormDataMatterResource!.enqueued_by).toEqual([
      "autoClaimBacklogMatters",
    ]);
  });
});
