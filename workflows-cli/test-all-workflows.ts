/**
 * @deprecated Prefer `npm run live-test` in `@saflib/workflows-cli`.
 *
 * Kept so older `saf-workflow run-scripts ./workflows-cli/test-all-workflows.ts`
 * invocations still exercise the full live-test suite.
 */
import { buildLiveTestWorkflow } from "./live-test/build.ts";

export const LiveTestAllWorkflowDefinition = buildLiveTestWorkflow();
export default LiveTestAllWorkflowDefinition;
