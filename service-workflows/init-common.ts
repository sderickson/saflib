import path from "node:path";
import {
  defineWorkflow,
  step,
  parsePackageName,
  makeLineReplace,
  runCopyStep,
  runCdStep,
  runCommandStep,
  type CopyStepInput,
  type CdStepInput,
  type CommandStepInput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot } from "@saflib/templates";

const sourceDir = path.join(templatesProductRoot, "service", "common");

interface InitCommonInput {
  /** The name of the shared service package to create (e.g., 'example-service-common'). */
  name: string;
  /** The path to the target directory which houses all service packages. */
  path: string;
}

interface InitCommonWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

/**
 * Ported from `service/workflows/init-common.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 *
 * @deprecated Prefer product/init (copies base service/common) and domain
 * offshoot init workflows. Offshoots reuse the parent common package.
 *
 * KNOWN BROKEN against the current `base/service/common` templates,
 * independent of this port: `dependencies.ts` has a `__integration-name__`
 * placeholder inside a `WORKFLOW AREA integration-imports FOR
 * integrations/init` block — a token only `integrations/init` ever
 * supplies, not this workflow's own context. A fresh (never-copied-before)
 * `service/init-common` run hits the copy step's full-file
 * placeholder substitution, which throws "Missing replacement for
 * __integration-name__". The old XState engine's `makeLineReplace` has
 * the identical throw-on-missing behavior, so this reproduces there too —
 * it's a template/workflow coupling issue predating this port, not
 * introduced by it. Not wired into the registry until that's resolved.
 */
export const InitCommonWorkflowDefinition = defineWorkflow<
  InitCommonInput,
  InitCommonWorkflowContext
>({
  id: "service/init-common",

  description:
    "[deprecated] Create a shared service-common package — prefer product/init",

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "The name of the shared service package to create (e.g., 'example-service-common')",
      },
      path: {
        type: "string",
        description:
          "The path to the target directory which houses all service packages.",
      },
    },
    required: ["name", "path"],
  },

  context: ({ input, cwd }) => ({
    ...parsePackageName(input.name, {
      requiredSuffix: "-service-common",
    }),
    targetDir: path.join(cwd, input.path),
  }),

  steps: [
    step<CopyStepInput, InitCommonWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        context: path.join(sourceDir, "context.ts"),
        dependencies: path.join(sourceDir, "dependencies.ts"),
        envSchema: path.join(sourceDir, "env.schema.json"),
        index: path.join(sourceDir, "index.ts"),
        packageJson: path.join(sourceDir, "package.json"),
        tsconfig: path.join(sourceDir, "tsconfig.json"),
        vitestConfig: path.join(sourceDir, "vitest.config.js"),
      },
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step<CdStepInput, InitCommonWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.targetDir,
    })),

    step<CommandStepInput, InitCommonWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
    })),

    step<CommandStepInput, InitCommonWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install"],
    })),

    step<CommandStepInput, InitCommonWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["test"],
    })),
  ],
});

export default InitCommonWorkflowDefinition;
