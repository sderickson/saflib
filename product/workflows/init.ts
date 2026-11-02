import {
  defineWorkflow,
  step,
  CopyStepMachine,
  CommandStepMachine,
  TransformFileStepMachine,
  CdStepMachine,
  getPackageName,
  parsePackageName,
} from "@saflib/workflows";
import { isEmbeddedProductMonorepo } from "@saflib/monorepo";
import {
  findOutermostWorkspaceRoot,
  makeProductInitLineReplace,
  productScriptsDir,
  skipGoldenStubPath,
  toProductMonorepoDevCompose,
  type InitProductWorkflowContext,
} from "@saflib/product-workflows/shared";
import {
  templatesProductRoot,
  templatesPlatformRoot,
  templatesScaffoldRoot,
  resolveDeployDir,
  getDeployDirName,
} from "@saflib/templates";
import path from "node:path";
import { existsSync } from "node:fs";

const input = [
  {
    name: "name",
    description: "Name of the new product",
    exampleValue: "foo",
  },
  {
    name: "domain",
    description: "Domain of the new product",
    exampleValue: "example.com",
  },
  {
    name: "productOnly",
    type: "flag" as const,
    description:
      "Copy only the golden product tree (skip deploy/scaffold/kratos). Used by CI smoke tests.",
  },
] as const;

export const InitProductWorkflowDefinition = defineWorkflow<
  typeof input,
  InitProductWorkflowContext
>({
  id: "product/init",

  description: "Create a new product",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const packageName = getPackageName(input.cwd);
    const packageInfo = parsePackageName(packageName);

    return {
      productName: input.name,
      sharedPackagePrefix: `@${packageInfo.organizationName}/${input.name}`,
      organizationName: packageInfo.organizationName,
      packageName: "PACKAGE_NAME_UNUSED",
      serviceName: input.name,
      domainName: input.domain,
      escapedDomainName: input.domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      productOnly: input.productOnly ?? false,
      embeddedProductMonorepo: isEmbeddedProductMonorepo(input.cwd),
      platformExists: existsSync(path.join(resolveDeployDir(input.cwd), "package.json")),
    };
  },

  // Copied via per-step templateFiles overrides (product, deploy, scaffold).
  templateFiles: {},

  docFiles: {},

  versionControl: {
    allowPaths: ({ context }) => [
      `**/${context.productName}/**`,
      `./package.json`,
      `./${getDeployDirName()}/**`,
      `./.github/**`,
    ],
    commitEachStep: true,
  },

  steps: [
    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(context.cwd, "package.json"),
      description: `Add ${context.productName}/** and deploy workspaces, and scope saf-imports boundaries to the product, in package.json`,
      transform: (content: string) => {
        const pkg = JSON.parse(content);
        const workspaces = Array.from(
          new Set([
            ...pkg.workspaces,
            `${context.productName}/**`,
            `${getDeployDirName()}/**`,
          ]),
        );
        workspaces.sort();
        pkg.workspaces = workspaces;
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
        if (isEmbeddedProductMonorepo(context.cwd)) {
          pkg.scripts.preinstall ??=
            "node --experimental-strip-types --disable-warning=ExperimentalWarning saflib/monorepo/bin/lock-prune-run.ts --yes";
        }
        return JSON.stringify(pkg, null, 2) + "\n";
      },
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "prettier", "--", "package.json", "--write"],
    })),
    step(CopyStepMachine, ({ context }) => ({
      name: context.productName,
      targetDir: path.join(context.cwd, context.productName),
      templateFiles: { product: templatesProductRoot },
      lineReplace: makeProductInitLineReplace(context),
      // Keep expansion stubs (__subdomain-name__, __group-name__, …) in base only.
      // Both globs: dir trees (`__/…`) and stub filenames (`__…__-links.ts`).
      // Suite docs under base/product/docs are for the golden template itself — products
      // should not inherit them.
      skipSourcePath: skipGoldenStubPath,
    })),
    // lineReplace drops stub `"path"` lines but can leave empty `{ }` objects in
    // multi-line tsconfig references; strip those before npm install / saf-imports.
    step(CommandStepMachine, ({ context }) => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        path.join(productScriptsDir, "strip-stub-tsconfig-refs.ts"),
        path.join(context.cwd, context.productName),
      ],
    })),
    // Relative paths out of the product still have the golden tree's depth.
    step(CommandStepMachine, ({ context }) => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        path.join(productScriptsDir, "fix-product-relative-paths.ts"),
        path.join(context.cwd, context.productName),
        context.embeddedProductMonorepo ? "1" : "0",
      ],
    })),
    // The platform deploy (edge + Kratos) is shared by every product; create it
    // only for the repo's first product. Each product's own deploy came with
    // the product copy above (<product>/deploy).
    step(
      CopyStepMachine,
      ({ context }) => ({
        name: context.productName,
        targetDir: resolveDeployDir(context.cwd),
        templateFiles: { deploy: templatesPlatformRoot },
        lineReplace: makeProductInitLineReplace(context),
      }),
      { skipIf: ({ context }) => context.productOnly || context.platformExists },
    ),
    step(
      CopyStepMachine,
      ({ context }) => ({
        name: context.productName,
        targetDir: context.cwd,
        templateFiles: { scaffold: templatesScaffoldRoot },
        lineReplace: makeProductInitLineReplace(context),
      }),
      { skipIf: ({ context }) => context.productOnly },
    ),
    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(context.cwd, "vitest.config.ts"),
      description: `Add ${context.productName} vitest projects to root vitest.config.ts`,
      transform: (content: string) => {
        const projectLine = `      "${context.productName}/**/vitest.config.{ts,js,mts,mjs}",`;
        return content.replace(
          /\/\/ BEGIN WORKFLOW AREA test-product-dependencies FOR product\/init\n([\s\S]*?)\/\/ END WORKFLOW AREA/,
          `// BEGIN WORKFLOW AREA test-product-dependencies FOR product/init\n${projectLine}\n      // END WORKFLOW AREA`,
        );
      },
    }), { skipIf: ({ context }) => !existsSync(path.join(context.cwd, "vitest.config.ts")) }),
    // Golden product compose mounts the whole saflib root; rewrite for product-beside-saflib.
    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(
        context.cwd,
        context.productName,
        "dev",
        "docker-compose.yaml",
      ),
      description: "Rewrite base/product/dev compose for product monorepo layout",
      transform: (content: string) =>
        toProductMonorepoDevCompose(content),
    })),
    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(
        context.cwd,
        context.productName,
        "dev",
        "docker-compose.dev-site.yaml",
      ),
      description: "Rewrite base/product/dev dev-site compose for product monorepo layout",
      transform: (content: string) =>
        toProductMonorepoDevCompose(content),
    })),
    // Product scaffold may include repo-root CI; never keep them in @saflib/saflib.
    step(
      CommandStepMachine,
      () => ({
        command: "rm",
        args: [
          "-rf",
          ".github/workflows/playwright.yml",
          ".github/workflows/typecheck.yml",
          ".github/workflows/push.yml",
          ".github/workflows/security.yml",
          ".github/actions/setup-node-deps",
        ],
      }),
      {
        skipIf: ({ context }) =>
          context.productOnly ||
          getPackageName(context.cwd) !== "@saflib/saflib",
      },
    ),
    step(
      CommandStepMachine,
      ({ context }) => ({
        command: "mv",
        args: [
          path.join(
            context.cwd,
            context.productName,
            "deploy",
            "remote-assets",
            `env.${context.productName}.secrets`,
          ),
          path.join(
            context.cwd,
            context.productName,
            "deploy",
            "remote-assets",
            `.env.${context.productName}.secrets`,
          ),
        ],
      }),
    ),
    step(CdStepMachine, ({ context }) => ({
      // Nested monorepos (host product → saflib): install at the outermost
      // workspace root so new product packages are linked for typecheck.
      path: findOutermostWorkspaceRoot(context.originalWorkingDirectory),
    })),
    step(
      CommandStepMachine,
      ({ context }) => ({
        command: "npm",
        args: [
          "exec",
          "saf-monorepo",
          "--",
          "lock-prune",
          "--yes",
          "--root",
          findOutermostWorkspaceRoot(context.originalWorkingDirectory),
        ],
      }),
      {
        skipIf: ({ context }) =>
          !isEmbeddedProductMonorepo(
            findOutermostWorkspaceRoot(context.originalWorkingDirectory),
          ),
      },
    ),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),
    // Refresh env.ts under the new product only (stub packages like
    // __integration-name__ were omitted from the copy). Do not run
    // workspace-wide generate-all — that rewrites unrelated packages.
    step(CommandStepMachine, ({ context }) => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        path.join(productScriptsDir, "regenerate-product-env.ts"),
        path.join(context.originalWorkingDirectory, context.productName),
      ],
    })),
    step(CdStepMachine, ({ context }) => {
      return {
        path: `./${context.productName}/dev`,
      };
    }),
    step(CommandStepMachine, () => ({
      command: "touch",
      args: ["./.env"],
    })),
    step(CdStepMachine, ({ context }) => ({
      // Cd paths are resolved from originalWorkingDirectory, not the current cwd.
      path: context.originalWorkingDirectory,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: [
        "exec",
        "saf-imports",
        "tsconfig",
        "generate",
        "--",
        "--write",
      ],
    })),
    // Drop golden stub-table migrations and regenerate a baseline from the
    // schemas that actually shipped (stubs were skipSourceGlob'd).
    step(CommandStepMachine, ({ context }) => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        path.join(productScriptsDir, "reset-product-db-migrations.ts"),
        path.join(
          context.originalWorkingDirectory,
          context.productName,
          "service/db",
        ),
      ],
    })),
    step(CdStepMachine, ({ context }) => ({
      path: `./${context.productName}/service/db`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),
    step(CdStepMachine, ({ context }) => ({
      path: findOutermostWorkspaceRoot(context.originalWorkingDirectory),
    })),
    // Product packages were copied after the first install; refresh so new
    // workspace devDependencies (e.g. openapi-typescript on spec) are linked.
    step(
      CommandStepMachine,
      ({ context }) => ({
        command: "npm",
        args: [
          "exec",
          "saf-monorepo",
          "--",
          "lock-prune",
          "--yes",
          "--root",
          findOutermostWorkspaceRoot(context.originalWorkingDirectory),
        ],
      }),
      {
        skipIf: ({ context }) =>
          !isEmbeddedProductMonorepo(
            findOutermostWorkspaceRoot(context.originalWorkingDirectory),
          ),
      },
    ),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),
    // CopyStep skips dist/; generate OpenAPI types/JSON for each saf.kind=spec package.
    step(CommandStepMachine, ({ context }) => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        path.join(productScriptsDir, "generate-product-specs.ts"),
        path.join(context.originalWorkingDirectory, context.productName),
      ],
    })),
    step(
      CdStepMachine,
      () => ({
        path: `./${getDeployDirName()}`,
      }),
      { skipIf: ({ context }) => context.productOnly || context.platformExists },
    ),
    step(
      CommandStepMachine,
      () => ({
        command: "npm",
        args: ["run", "regen-kratos-secrets"],
      }),
      { skipIf: ({ context }) => context.productOnly || context.platformExists },
    ),
    step(
      CommandStepMachine,
      () => ({
        command: "npm",
        args: ["run", "generate"],
      }),
      { skipIf: ({ context }) => context.productOnly || context.platformExists },
    ),
  ],
});

export default InitProductWorkflowDefinition;
