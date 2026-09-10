import type { PackageSpecInventory } from "./spec-inventory-build.ts";

/** Caller → targets (same shape as `@saflib/jobs-http` TriggerMap / productTriggerMap). */
export type JobTriggerMap = Readonly<Record<string, readonly string[]>>;

/**
 * Annotate spec inventory operations with job graph edges from a product
 * trigger map (e.g. `productTriggerMap`). Mutates operations in place.
 */
export function annotateSpecInventoryJobEdges(
  inventory: PackageSpecInventory,
  triggerMap: JobTriggerMap,
): void {
  const enqueued_by = new Map<string, string[]>();
  for (const [caller, targets] of Object.entries(triggerMap)) {
    for (const target of targets) {
      let list = enqueued_by.get(target);
      if (!list) {
        list = [];
        enqueued_by.set(target, list);
      }
      if (!list.includes(caller)) list.push(caller);
    }
  }
  for (const list of enqueued_by.values()) {
    list.sort((a, b) => a.localeCompare(b));
  }

  for (const entity of inventory.entities) {
    for (const op of entity.operations) {
      const id = op.operation_id;
      const forwards = triggerMap[id];
      op.enqueues = forwards?.length
        ? [...forwards].sort((a, b) => a.localeCompare(b))
        : [];
      op.enqueued_by = enqueued_by.get(id) ?? [];
    }
  }
}
