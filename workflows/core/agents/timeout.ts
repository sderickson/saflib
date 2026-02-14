/**
 * In-memory timeout tracker.
 * Other parts of the system add time or reset it, and adding time returns if we're over.
 * The timeout tracks routine workflows (not complex ones).
 * More info here: https://workflows.saf-demo.online/#routine-workflows
 */

let workflowTimeMs = 0;
const MAX_WORKFLOW_TIME_MS = 1000 * 150; // I generally find workflows that run over this number need some work

export const addTimeMs = (timeMs: number): boolean => {
  workflowTimeMs += timeMs;
  return workflowTimeMs > MAX_WORKFLOW_TIME_MS;
};

export const resetTimeMs = () => {
  workflowTimeMs = 0;
};

export const getTimeMs = () => {
  return workflowTimeMs;
};

export const getPercentTimeUsed = () => {
  return (workflowTimeMs / MAX_WORKFLOW_TIME_MS) * 100;
};
