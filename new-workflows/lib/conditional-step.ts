import { step } from "./engine.ts";
import type { StepFn, WorkflowStep } from "./types.ts";

const SKIP_MARKER = Symbol("workflow-step-skip");

/**
 * Wraps a step so it's a no-op success when `skipIf` is true, evaluated
 * against the same built `context: C` a step's `input()` builder already
 * receives — a boolean parsed from input (e.g. `!context.upload`), or a
 * filesystem check. Ported from the old engine's `step(Machine, input,
 * { skipIf })` third argument (see `workflows/core/make.ts`); the new
 * engine's steps are plain `{kind, input, run}` triples with no such
 * option built in, so this is a combinator around `step()` rather than an
 * engine feature. Some primitives (`runCopyStep`'s `skipUnlessPathExists`,
 * `runTransformFileStep`'s `skipIfMissing`) already cover the narrower
 * "skip if a path doesn't exist" case internally; reach for this instead
 * when the condition depends on parsed input/context, not just a path.
 */
export function stepSkipIf<Input, C>(
  skipIf: (arg: { context: C }) => boolean,
  kind: string,
  fn: StepFn<Input>,
  input: (arg: { context: C }) => Input,
): WorkflowStep<C> {
  const inner = step<Input, C>(kind, fn, input);
  return {
    kind: inner.kind,
    input: (arg) => (skipIf(arg as { context: C }) ? SKIP_MARKER : inner.input(arg)),
    run: async (rawInput, ctx) => {
      if (rawInput === SKIP_MARKER) return { status: "success" };
      return inner.run(rawInput, ctx);
    },
  };
}
