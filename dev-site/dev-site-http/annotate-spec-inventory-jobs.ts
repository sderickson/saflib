import type { PackageSpecInventory } from "./spec-inventory-build.ts";

/** Caller → targets (same shape as `@saflib/jobs` TriggerMap / daemonTriggerMap). */
export type JobTriggerMap = Readonly<Record<string, readonly string[]>>;

/**
 * Annotate spec inventory operations with job graph edges from a product
 * trigger map (e.g. `daemonTriggerMap`). Mutates operations in place.
 */
export function annotateSpecInventoryJobEdges(
  inventory: PackageSpecInventory,
  triggerMap: JobTriggerMap,
): void {
  const enqueuedBy = new Map<string, string[]>();
  for (const [caller, targets] of Object.entries(triggerMap)) {
    for (const target of targets) {
      let list = enqueuedBy.get(target);
      if (!list) {
        list = [];
        enqueuedBy.set(target, list);
      }
      if (!list.includes(caller)) list.push(caller);
    }
  }
  for (const list of enqueuedBy.values()) {
    list.sort((a, b) => a.localeCompare(b));
  }

  for (const entity of inventory.entities) {
    for (const op of entity.operations) {
      const id = op.operationId;
      const forwards = triggerMap[id];
      op.enqueues = forwards?.length
        ? [...forwards].sort((a, b) => a.localeCompare(b))
        : [];
      op.enqueuedBy = enqueuedBy.get(id) ?? [];
    }
  }
}
