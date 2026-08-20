import { defineWorkflow } from "@saflib/workflows";
import {
  expandLiveTestSet,
  getLiveTestSet,
  liveTestSets,
  listLiveTestSetNames,
  setupLiveTestSteps,
  teardownLiveTestSteps,
  type LiveTestContext,
  type LiveTestSet,
  type LiveTestStep,
} from "./sets.ts";

export type BuildLiveTestOptions = {
  /** Set names to run. Omit or empty → all sets. */
  sets?: string[];
};

function resolveSets(names: string[] | undefined): LiveTestSet[] {
  if (!names || names.length === 0) {
    return liveTestSets;
  }
  const resolved: LiveTestSet[] = [];
  for (const name of names) {
    const set = getLiveTestSet(name);
    if (!set) {
      const known = listLiveTestSetNames().join(", ");
      throw new Error(`Unknown live-test set "${name}". Known: ${known}`);
    }
    resolved.push(set);
  }
  return resolved;
}

/**
 * Build a script-mode workflow: init tmp → selected sets (each with assert +
 * typecheck) → teardown.
 */
export function buildLiveTestWorkflow(options: BuildLiveTestOptions = {}) {
  const selected = resolveSets(options.sets);
  const setLabels = selected.map((s) => s.name).join(", ");

  const steps: LiveTestStep[] = [
    ...setupLiveTestSteps(),
    ...selected.flatMap(expandLiveTestSet),
    ...teardownLiveTestSteps(),
  ];

  return defineWorkflow<readonly [], LiveTestContext>({
    id: "saflib/live-test",
    description: `Live-test workflow sets on a disposable product copy (${setLabels}).`,
    input: [] as const,
    context: () => ({}),
    sourceUrl: import.meta.url,
    templateFiles: {},
    docFiles: {},
    steps,
  });
}
