import { addErrorCollector } from "@saflib/node";

/**
 * Register a no-op collector so {@link defaultErrorReporter} and
 * {@link queryWrapper} do not print expected error stacks to stderr during tests.
 * Suites that assert on logging can register their own collector afterward.
 */
addErrorCollector(() => {});
