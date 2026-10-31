import {
  demoStepCCompletions,
  stepBFailuresByKey,
} from "./_helpers.state.ts";

export function resetDemoFailureCountersForTests(): void {
  stepBFailuresByKey.clear();
}

export function resetDemoStepCCompletionsForTests(): void {
  demoStepCCompletions.length = 0;
}
