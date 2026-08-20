/**
 * @deprecated Prefer {@link ./test-phase1-vertical-slice.ts}.
 *
 * The old “run every workflow after product/init” harness was brittle and slow:
 * SPA/service inits stacked on each other, and failures were hard to localize.
 * Phase 1 CI now copies `saflib/base` via `product/init`, exercises the
 * vertical-slice add-* workflows on that disposable product, then deletes it.
 */
export {
  TestPhase1VerticalSliceDefinition,
  TestPhase1VerticalSliceDefinition as TestAllWorkflowsDefinition,
} from "./test-phase1-vertical-slice.ts";
export { default } from "./test-phase1-vertical-slice.ts";
