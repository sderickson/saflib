import type { ComposerFunctionOptions } from "./xstate.ts";

type FactoryFunction<T extends Record<string, any>> = (
  options: T & ComposerFunctionOptions,
) => Record<string, any>;

type FactoryTuple<T extends Record<string, any>> = [
  FactoryFunction<T>,
  Omit<T, keyof ComposerFunctionOptions>,
];

/**
 * Creates a chain of XState machine states from an array of factory functions.
 *
 * This helper simplifies creating sequential workflows by automatically handling
 * state naming and transitions. Instead of manually specifying stateName and
 * nextStateName for each factory, this function generates them automatically.
 *
 * @example
 * // Instead of this verbose approach:
 * states: {
 *   ...useTemplateStateFactory({
 *     stateName: "copyTemplate",
 *     nextStateName: "updateLoader",
 *   }),
 *   ...updateTemplateFileFactory({
 *     filePath: "loader.ts",
 *     promptMessage: "Update the loader",
 *     stateName: "updateLoader",
 *     nextStateName: "runTests",
 *   }),
 *   ...runTestsFactory({
 *     filePath: "test.ts",
 *     stateName: "runTests",
 *     nextStateName: "done",
 *   }),
 *   done: { type: "final" }
 * }
 *
 * // You can use this concise approach:
 * const { initial, states } = createChain([
 *   [useTemplateStateFactory, {}],
 *   [updateTemplateFileFactory, {
 *     filePath: "loader.ts",
 *     promptMessage: "Update the loader"
 *   }],
 *   [runTestsFactory, { filePath: "test.ts" }],
 * ]);
 *
 * @param factories Array of tuples, each containing a factory function and its options
 * @returns Object with initial state name and states object
 */
export function createChain<T extends readonly FactoryTuple<any>[]>(
  factories: T,
): {
  initial: string;
  states: Record<string, any>;
} {
  if (factories.length === 0) {
    throw new Error("At least one factory function is required");
  }

  const states: Record<string, any> = {
    done: {
      type: "final",
    },
  };

  let nextStateName = "done";

  // Work backward through the array
  for (let i = factories.length - 1; i >= 0; i--) {
    const [factory, options] = factories[i];
    const stateName = `step${i + 1}`;

    const stateObject = factory({
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
