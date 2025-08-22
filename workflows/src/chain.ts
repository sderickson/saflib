/**
 * Currently not used. Might decide to remove it, or dust it off. Let me see if I can get
 * the more verbose approach to work fine.
 */

import type { ComposerFunctionOptions } from "./xstate.ts";

type ComposerFunction<T extends Record<string, any>> = (
  options: T & ComposerFunctionOptions,
) => Record<string, any>;

type ComposerTuple<T extends Record<string, any>> = [
  ComposerFunction<T>,
  Omit<T, keyof ComposerFunctionOptions>,
];

/**
 * Creates a chain of XState machine states from an array of composer functions.
 *
 * This helper simplifies creating sequential workflows by automatically handling
 * state naming and transitions. Instead of manually specifying stateName and
 * nextStateName for each composer, this function generates them automatically.
 *
 * @example
 * // Instead of this verbose approach:
 * states: {
 *   ...useTemplateStateComposer({
 *     stateName: "copyTemplate",
 *     nextStateName: "updateLoader",
 *   }),
 *   ...updateTemplateFileComposer({
 *     filePath: "loader.ts",
 *     promptMessage: "Update the loader",
 *     stateName: "updateLoader",
 *     nextStateName: "runTests",
 *   }),
 *   ...runTestsComposer({
 *     filePath: "test.ts",
 *     stateName: "runTests",
 *     nextStateName: "done",
 *   }),
 *   done: { type: "final" }
 * }
 *
 * // You can use this concise approach:
 * const { initial, states } = createChain([
 *   [useTemplateStateComposer, {}],
 *   [updateTemplateFileComposer, {
 *     filePath: "loader.ts",
 *     promptMessage: "Update the loader"
 *   }],
 *   [runTestsComposer, { filePath: "test.ts" }],
 * ]);
 *
 * @param factories Array of tuples, each containing a composer function and its options
 * @returns Object with initial state name and states object
 */
export function createChain<T extends readonly ComposerTuple<any>[]>(
  factories: T,
): {
  initial: string;
  states: Record<string, any>;
} {
  if (factories.length === 0) {
    throw new Error("At least one composer function is required");
  }

  const states: Record<string, any> = {
    done: {
      type: "final",
    },
  };

  let nextStateName = "done";

  // Work backward through the array
  for (let i = factories.length - 1; i >= 0; i--) {
    const [composer, options] = factories[i];
    const stateName = `step${i + 1}`;

    const stateObject = composer({
      ...options,
      stateName,
      nextStateName,
    } as any);

    Object.assign(states, stateObject);
    nextStateName = stateName;
  }

  return {
    initial: `step1`,
    states,
  };
}
