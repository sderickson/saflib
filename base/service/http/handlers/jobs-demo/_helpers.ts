import {
  demoStepCCompletions,
  stepBFailuresByKey,
} from "./_helpers.state.ts";

export function demoFailureKey(body: {
  dedupe_key?: string | null;
  concurrency_key?: string | null;
}): string {
  return body.dedupe_key ?? body.concurrency_key ?? "default";
}

export function recordDemoFailure(key: string): number {
  const next = (stepBFailuresByKey.get(key) ?? 0) + 1;
  stepBFailuresByKey.set(key, next);
  return next;
}

export { demoStepCCompletions } from "./_helpers.state.ts";

export function recordDemoStepCCompletion(id: string): void {
  demoStepCCompletions.push(id);
}
