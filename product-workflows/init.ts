import path from "node:path";
import { existsSync } from "node:fs";
import {
  defineWorkflow,
  step,
  stepSkipIf,
  getPackageName,
  parsePackageName,
  runCopyStep,
  runCdStep,
  runCommandStep,
  runTransformFileStep,
  type CopyStepInput,
  type CdStepInput,
  type CommandStepInput,
  type TransformFileStepInput,
} from "@saflib/new-workflows";
import { isEmbeddedProductMonorepo } from "@saflib/monorepo";
import {
  templatesProductRoot,
  templatesPlatformRoot,
  templatesScaffoldRoot,
  resolveDeployDir,
  getDeployDirName,
} from "@saflib/templates";
import {
  findOutermostWorkspaceRoot,
  makeProductInitLineReplace,
  productScriptsDir,
  skipGoldenStubPath,
  toProductMonorepoDevCompose,
  type InitProductWorkflowContext,
} from "./shared.ts";

interface InitProductInput {
  /** Product name in kebab-case (e.g. `notes`). */
  name: string;
  /** The product's domain (e.g. `notes.example.com`). */
  domain: string;
  /** Copy only the product tree (skip the platform deploy and repo scaffold). */
  productOnly?: boolean;
}

interface InitProductContext extends InitProductWorkflowContext {
  /** Repo root the workflow started in. */
  cwd: string;
  /** Outermost workspace root (where installs run when saflib is nested). */
  installRoot: string;
}

type C = InitProductContext;

const nodeScript = (script: string, ...args: string[]): CommandStepInput => ({
  command: "node",
  args: [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    path.join(productScriptsDir, script),
    ...args,
  ],
});

/*
 * The engine rebuilds `context` before every step, so repo-level setup (the
 * platform deploy, scaffold, Kratos secrets) is decided per step from the
 * filesystem: each runs for a repo's first product and is skipped once done.
 */
const skipPlatformCopy = ({ context }: { context: C }) =>
  context.productOnly || context.platformExists;

const skipScaffold = ({ context }: { context: C }) =>
  context.productOnly || existsSync(path.join(context.cwd, ".github", "workflows"));

const skipKratosSecrets = ({ context }: { context: C }) =>
  context.productOnly ||
  !context.platformExists ||
  existsSync(path.join(resolveDeployDir(context.cwd), "remote-assets", ".env.kratos.secrets"));

const lockPrune = ({ context }: { context: C }): CommandStepInput => ({
  command: "npm",
  args: ["exec", "saf-monorepo", "--", "lock-prune", "--yes", "--root", context.installRoot],
});

/**
 * Creates a product from the golden templates: `base/product` becomes
 * `<name>/` (including its own deploy, `<name>/deploy`), and for a repo's first
 * product, `base/platform` becomes the shared platform deploy (`deploy/`: edge
 * Caddy + Kratos) and the repo scaffold (CI, root configs) is applied.
 */
export const InitProductWorkflowDefinition = defineWorkflow<InitProductInput, C>({
  id: "product/init",

  description: "Create a new product (and, for a repo's first product, its platform deploy)",

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Product name in kebab-case (e.g. notes)",
      },
      domain: {
        type: "string",
        description: "The product's domain (e.g. notes.example.com)",
      },
      productOnly: {
        type: "boolean",
        description:
          "Copy only the product tree (skip the platform deploy and repo scaffold). Used by CI smoke tests.",
      },
    },
    required: ["name", "domain"],
  },

  context: ({ input, cwd }) => {
    const packageInfo = parsePackageName(getPackageName(cwd));
    return {
      cwd,
      installRoot: findOutermostWorkspaceRoot(cwd),
      productName: input.name,
      sharedPackagePrefix: `@${packageInfo.organizationName}/${input.name}`,
      organizationName: packageInfo.organizationName,
      packageName: "PACKAGE_NAME_UNUSED",
      serviceName: input.name,
      domainName: input.domain,
      productOnly: input.productOnly ?? false,
      embeddedProductMonorepo: isEmbeddedProductMonorepo(cwd),
      platformExists: existsSync(path.join(resolveDeployDir(cwd), "package.json")),
    };
  },

  steps: [
    step<TransformFileStepInput, C>("transform-file", runTransformFileStep, ({ context }) => ({
      filePath: path.join(context.cwd, "package.json"),
      description: `Add ${context.productName}/** and ${getDeployDirName()}/** workspaces, and scope saf-imports boundaries to the product`,
      transform: (content: string) => {
        const pkg = JSON.parse(content);
        pkg.workspaces = Array.from(
          new Set([...pkg.workspaces, `${context.productName}/**`, `${getDeployDirName()}/**`]),
        ).sort();
        // `saf-imports boundaries` (run in CI) checks the product's packages;
        // saflib's own packages are import targets only.
        pkg.safImports ??= {};
        pkg.safImports.boundaries ??= {};
        pkg.safImports.boundaries.scope ??= [];
        const productScope = `dir:${context.productName}/**`;
        if (!pkg.safImports.boundaries.scope.includes(productScope)) {
          pkg.safImports.boundaries.scope.push(productScope);
        }
        pkg.scripts ??= {};
        if (context.embeddedProductMonorepo) {
          pkg.scripts.preinstall ??=
            "node --experimental-strip-types --disable-warning=ExperimentalWarning saflib/monorepo/bin/lock-prune-run.ts --yes";
        }
        return JSON.stringify(pkg, null, 2) + "\n";
      },
    })),

    step<CommandStepInput, C>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "prettier", "--", "package.json", "--write"],
    })),

    step<CopyStepInput, C>("copy", runCopyStep, ({ context }) => ({
      templateFiles: { product: templatesProductRoot },
      name: context.productName,
      targetDir: path.join(context.cwd, context.productName),
      lineReplace: makeProductInitLineReplace(context),
      // Expansion stubs (__subdomain-name__, __group-name__, …) stay in the
      // golden tree: dir trees (`__/…`) and stub filenames (`__…__-links.ts`).
      // The golden tree's own docs aren't the product's.
      skipSourcePath: skipGoldenStubPath,
    })),

    // Dropped stub `"path"` lines can leave empty `{ }` objects in tsconfig
    // references; strip those before npm install / saf-imports.
    step<CommandStepInput, C>("command", runCommandStep, ({ context }) =>
      nodeScript("strip-stub-tsconfig-refs.ts", path.join(context.cwd, context.productName)),
    ),

    // Relative paths out of the product still have the golden tree's depth.
    step<CommandStepInput, C>("command", runCommandStep, ({ context }) =>
      nodeScript(
        "fix-product-relative-paths.ts",
        path.join(context.cwd, context.productName),
        context.embeddedProductMonorepo ? "1" : "0",
      ),
    ),

    stepSkipIf<CopyStepInput, C>(skipPlatformCopy, "copy", runCopyStep, ({ context }) => ({
      templateFiles: { deploy: templatesPlatformRoot },
      name: context.productName,
      targetDir: resolveDeployDir(context.cwd),
      lineReplace: makeProductInitLineReplace(context),
    })),

    stepSkipIf<CopyStepInput, C>(skipScaffold, "copy", runCopyStep, ({ context }) => ({
      templateFiles: { scaffold: templatesScaffoldRoot },
      name: context.productName,
      targetDir: context.cwd,
      lineReplace: makeProductInitLineReplace(context),
    })),

    step<TransformFileStepInput, C>("transform-file", runTransformFileStep, ({ context }) => ({
      filePath: path.join(context.cwd, "vitest.config.ts"),
      skipIfMissing: true,
      description: `Add ${context.productName} vitest projects to root vitest.config.ts`,
      transform: (content: string) => {
        const projectLine = `      "${context.productName}/**/vitest.config.{ts,js,mts,mjs}",`;
        if (content.includes(projectLine)) return content;
        return content.replace(
          /(\/\/ BEGIN WORKFLOW AREA test-product-dependencies FOR product\/init\n)/,
          `$1${projectLine}\n`,
        );
      },
    })),

    step<TransformFileStepInput, C>("transform-file", runTransformFileStep, ({ context }) => ({
      filePath: path.join(context.cwd, context.productName, "dev", "docker-compose.yaml"),
      description: "Rewrite the dev compose for the product monorepo layout",
      transform: toProductMonorepoDevCompose,
    })),

    step<TransformFileStepInput, C>("transform-file", runTransformFileStep, ({ context }) => ({
      filePath: path.join(context.cwd, context.productName, "dev", "docker-compose.dev-site.yaml"),
      description: "Rewrite the dev-site compose for the product monorepo layout",
      transform: toProductMonorepoDevCompose,
    })),

    step<CommandStepInput, C>("command", runCommandStep, ({ context }) => {
      const remoteAssets = path.join(context.cwd, context.productName, "deploy", "remote-assets");
      return {
        command: "mv",
        args: [
          path.join(remoteAssets, `env.${context.productName}.secrets`),
          path.join(remoteAssets, `.env.${context.productName}.secrets`),
        ],
      };
    }),

    // Nested monorepos (product repo → saflib): install at the outermost
    // workspace root so the new product's packages are linked.
    step<CdStepInput, C>("cd", runCdStep, ({ context }) => ({ path: context.installRoot })),

    stepSkipIf<CommandStepInput, C>(
      ({ context }) => !isEmbeddedProductMonorepo(context.installRoot),
      "command",
      runCommandStep,
      lockPrune,
    ),

    step<CommandStepInput, C>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install"],
    })),

    // Refresh env.ts under the new product only (stub packages were omitted
    // from the copy); workspace-wide generate-all would rewrite other packages.
    step<CommandStepInput, C>("command", runCommandStep, ({ context }) =>
      nodeScript("regenerate-product-env.ts", path.join(context.cwd, context.productName)),
    ),

    step<CommandStepInput, C>("command", runCommandStep, ({ context }) => ({
      command: "touch",
      args: [path.join(context.cwd, context.productName, "dev", ".env")],
    })),

    step<CdStepInput, C>("cd", runCdStep, ({ context }) => ({ path: context.cwd })),

    step<CommandStepInput, C>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-imports", "tsconfig", "generate", "--", "--write"],
    })),

    // Drop the golden stub tables' migrations and regenerate a baseline from
    // the schemas that actually shipped.
    step<CommandStepInput, C>("command", runCommandStep, ({ context }) =>
      nodeScript(
        "reset-product-db-migrations.ts",
        path.join(context.cwd, context.productName, "service", "db"),
      ),
    ),

    step<CdStepInput, C>("cd", runCdStep, ({ context }) => ({
      path: path.join(context.cwd, context.productName, "service", "db"),
    })),

    step<CommandStepInput, C>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    // The product's packages were copied after the first install; refresh so
    // their own devDependencies (e.g. openapi-typescript on spec) are linked.
    step<CdStepInput, C>("cd", runCdStep, ({ context }) => ({ path: context.installRoot })),

    stepSkipIf<CommandStepInput, C>(
      ({ context }) => !isEmbeddedProductMonorepo(context.installRoot),
      "command",
      runCommandStep,
      lockPrune,
    ),

    step<CommandStepInput, C>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install"],
    })),

    // The copy skips dist/; generate OpenAPI types/JSON for each spec package.
    step<CommandStepInput, C>("command", runCommandStep, ({ context }) =>
      nodeScript("generate-product-specs.ts", path.join(context.cwd, context.productName)),
    ),

    stepSkipIf<CdStepInput, C>(skipKratosSecrets, "cd", runCdStep, ({ context }) => ({
      path: resolveDeployDir(context.cwd),
    })),

    stepSkipIf<CommandStepInput, C>(skipKratosSecrets, "command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "regen-kratos-secrets"],
    })),

    step<CdStepInput, C>("cd", runCdStep, ({ context }) => ({ path: context.cwd })),

    step<CommandStepInput, C>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-docker", "--", "generate"],
    })),
  ],
});

export default InitProductWorkflowDefinition;
