import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  CdStepMachine,
  TransformFileStepMachine,
  type OffshootInitContext,
  resolveOffshootInitContext,
  makeOffshootLineReplace,
  parentLayerPackageJsonPath,
} from "@saflib/workflows";
import { offshootStubRoot, templatesProductRoot } from "@saflib/templates";
import path from "node:path";

const offshootHttpRoot = path.join(offshootStubRoot, "http");
/**
 * Live composition-root file (offshoot import/mount areas only). Offshoot
 * routers mount in `service/monolith`, never in the product's http package.
 */
const compositionHttpLive = path.join(
  templatesProductRoot,
  "service/monolith/http.ts",
);

/** The product's composition root, which mounts every feature router. */
function compositionDir(context: OffshootInitContext): string {
  return path.join(context.productRoot, "service", "monolith");
}

const input = [
  {
    name: "name",
    description:
      "Kebab-case offshoot name (e.g. 'dossier'). Creates {product}/{name}/http and mounts its router in the composition root (service/monolith).",
    exampleValue: "dossier",
  },
] as const;

interface ExpressInitWorkflowContext extends OffshootInitContext {}

export const ExpressInitWorkflowDefinition = defineWorkflow<
  typeof input,
  ExpressInitWorkflowContext
>({
  id: "express/init",

  description:
    "Scaffold an offshoot Express http package and mount its barrel router in the composition root",

  checklistDescription: ({ offshootPackageName }) =>
    `Init offshoot http ${offshootPackageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) =>
    resolveOffshootInitContext({
      cwd: input.cwd,
      offshootName: input.name,
      layer: "http",
    }),

  templateFiles: {
    http: path.join(offshootHttpRoot, "http.ts"),
    routers: path.join(offshootHttpRoot, "routers.ts"),
    index: path.join(offshootHttpRoot, "index.ts"),
    packageJson: path.join(offshootHttpRoot, "package.json"),
    tsconfig: path.join(offshootHttpRoot, "tsconfig.json"),
    vitestConfig: path.join(offshootHttpRoot, "vitest.config.js"),
    compositionHttp: compositionHttpLive,
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.offshootName,
      targetDir: context.targetDir,
      templateFiles: {
        offshootHttp: offshootHttpRoot,
      },
      lineReplace: makeOffshootLineReplace(context),
      // Handler expansion stubs live under service/http; grow with add-handler.
      skipSourceGlobs: ["**/handlers/__group-name__/**"],
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.offshootName,
      targetDir: compositionDir(context),
      templateFiles: {
        compositionHttp: compositionHttpLive,
      },
      lineReplace: makeOffshootLineReplace(context),
      skipUnlessPathExists: parentLayerPackageJsonPath(compositionDir(context)),
    })),

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: parentLayerPackageJsonPath(compositionDir(context)),
      description: `Add ${context.offshootPackageName} dependency to the composition root`,
      skipIfMissing: true,
      transform: (content: string) => {
        const pkg = JSON.parse(content);
        pkg.dependencies = pkg.dependencies ?? {};
        pkg.dependencies[context.offshootPackageName] = "*";
        return JSON.stringify(pkg, null, 2) + "\n";
      },
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});
