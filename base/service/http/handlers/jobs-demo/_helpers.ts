/** In-memory failure counters for jobs-demo step-b retry simulation. */
const stepBFailuresByKey = new Map<string, number>();

export function demoFailureKey(body: {
  dedupeKey?: string | null;
  concurrencyKey?: string | null;
}): string {
  return body.dedupeKey ?? body.concurrencyKey ?? "default";
}

export function recordDemoFailure(key: string): number {
  const next = (stepBFailuresByKey.get(key) ?? 0) + 1;
  stepBFailuresByKey.set(key, next);
  return next;
}

export function resetDemoFailureCountersForTests(): void {
  stepBFailuresByKey.clear();
}

export const demoStepCCompletions: string[] = [];

export function recordDemoStepCCompletion(id: string): void {
  demoStepCCompletions.push(id);
}

export function resetDemoStepCCompletionsForTests(): void {
  demoStepCCompletions.length = 0;
}
