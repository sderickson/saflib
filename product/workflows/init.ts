import {
  defineWorkflow,
  step,
  CopyStepMachine,
  CommandStepMachine,
  TransformFileStepMachine,
  CdStepMachine,
  getPackageName,
  parsePackageName,
  makeLineReplace,
  type ParsePackageNameOutput,
} from "@saflib/workflows";
import { kebabCaseToPascalCase, kebabCaseToSnakeCase } from "@saflib/utils";
import {
  templatesProductRoot,
  templatesDeployRoot,
  templatesScaffoldRoot,
  resolveDeployDir,
  getDeployDirName,
} from "@saflib/templates";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

/**
 * Walk up from `start` and return the outermost directory whose package.json
 * declares `workspaces`. Nested installs (e.g. saflib inside a host monorepo) must
 * run `npm install` at that root so new product packages get linked.
 */
export function findOutermostWorkspaceRoot(start: string): string {
  let dir = path.resolve(start);
  let found = dir;
  while (true) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          workspaces?: unknown;
        };
        if (Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0) {
          found = dir;
        }
      } catch {
        // ignore invalid package.json
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return found;
}

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

interface InitProductWorkflowContext extends ParsePackageNameOutput {
  productName: string;
  domainName: string;
  productOnly: boolean;
}

/** Frozen golden-product name under saflib (`saflib/base`). */
const SOURCE_PRODUCT_NAME = "base";
const SOURCE_PACKAGE_PREFIX = `@saflib/${SOURCE_PRODUCT_NAME}`;
const SOURCE_DOMAIN = "example.com";

/**
 * Rewrite saflib-root volume mounts (`../..:/app` + anonymous node_modules)
 * to the product-beside-saflib shape (product clients/sdk + `saflib/`).
 * Context stays `../..`.
 */
function toProductMonorepoDevCompose(
  content: string,
  productName: string,
): string {
  const productMounts = [
    `      - ../../${productName}/clients/:/app/${productName}/clients/`,
    `      - ../../saflib/:/app/saflib/`,
    `      - ../../${productName}/service/sdk/:/app/${productName}/service/sdk/`,
  ].join("\n");
  const monolithMounts = [
    `      - ../../${productName}/service/db/data:/app/${productName}/service/db/data`,
    `      - ../../${productName}/service/cron/data:/app/${productName}/service/cron/data`,
    `      - ../../${productName}/service/jobs/data:/app/${productName}/service/jobs/data`,
  ].join("\n");

  let out = content.replace(
    /volumes:\n(?:[ \t]*#[^\n]*\n)*[ \t]*- \.\.\/\.\.:\/app\n[ \t]*- \/app\/node_modules\n([ \t]*command: npm run dev)/,
    `volumes:\n${productMounts}\n$1`,
  );
  out = out.replace(
    new RegExp(
      `(  ${productName}-monolith:[\\s\\S]*?volumes:\\n)(?:[ \\t]*#[^\\n]*\\n)*[ \\t]*- \\.\\.\\/\\.\\.:\\/app\\n[ \\t]*- \\/app\\/node_modules\\n`,
    ),
    `$1${monolithMounts}\n`,
  );
  return out;
}

/**
 * Live-host lines that still point at expansion stubs skipped by
 * skipSourceGlobs (paths matching __stub-name__). Dropping them keeps
 * package.json / tsconfig / schema barrels valid after stub packages/files
 * themselves are omitted.
 */
export function isSkippedStubRefLine(line: string): boolean {
  if (!/__[a-zA-Z][a-zA-Z0-9_-]*__/.test(line)) return false;
  // package.json dependency on a skipped stub package
  if (/^\s*"@[^"]*__[^"]*"\s*:/.test(line)) return true;
  // tsconfig project reference (single- or multi-line `"path"` entry)
  if (/"path"\s*:\s*"[^"]*__[^"]*"/.test(line)) return true;
  if (/^\s*\{\s*"path"\s*:\s*"[^"]*__[^"]*"\s*\}\s*,?\s*$/.test(line)) {
    return true;
  }
  // import/export of skipped stub modules (e.g. schemas/__group-name__.ts)
  if (/^\s*(export|import)\b/.test(line)) return true;
  return false;
}

export function makeProductInitLineReplace(context: InitProductWorkflowContext) {
  const placeholderReplace = makeLineReplace(context);
  const dockerFrom = `saflib-${SOURCE_PRODUCT_NAME}`;
  const dockerTo = `${context.organizationName}-${context.productName}`;
  const pascal = kebabCaseToPascalCase(context.productName);
  const snakeUpper = kebabCaseToSnakeCase(context.productName).toUpperCase();
  const sourcePascal = kebabCaseToPascalCase(SOURCE_PRODUCT_NAME);
  const sourceSnakeUpper =
    kebabCaseToSnakeCase(SOURCE_PRODUCT_NAME).toUpperCase();

  return (line: string) => {
    // Drop the co-located SPA stub from CLIENT_SUBDOMAINS before placeholder
    // replace (init has no subdomainName; add-spa appends real names later).
    let prepared = line;
    if (/^\s*CLIENT_SUBDOMAINS=/.test(prepared)) {
      prepared = prepared.replace(/,__subdomain-name__/g, "");
    }

    // Vite define — looks like a placeholder but is a framework constant.
    if (prepared.includes("__VUE_PROD_DEVTOOLS__")) {
      return finishProductInitLineReplace(prepared, context, {
        dockerFrom,
        dockerTo,
        pascal,
        snakeUpper,
        sourcePascal,
        sourceSnakeUpper,
      });
    }

    if (isSkippedStubRefLine(prepared)) {
      return "";
    }

    // Generated Dockerfiles list stub package paths for base's own builds;
    // drop those segments before placeholder replace so unknown __tokens__
    // in COPY lines do not warn.
    if (/^\s*COPY\b/.test(prepared)) {
      prepared = prepared
        .split(/\s+/)
        .filter((tok) => !/__[a-zA-Z][a-zA-Z0-9_-]*__/.test(tok))
        .join(" ");
    }

    // Unknown __tokens__ in comments / SQL stay literal when not dropped above —
    // product/init has no integrationName/groupName/etc. Stub migrations are
    // wiped and regenerated after install (see reset-product-db-migrations).
    let out: string;
    try {
      out = placeholderReplace(prepared);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Missing replacement")
      ) {
        out = prepared;
      } else {
        throw error;
      }
    }

    return finishProductInitLineReplace(out, context, {
      dockerFrom,
      dockerTo,
      pascal,
      snakeUpper,
      sourcePascal,
      sourceSnakeUpper,
    });
  };
}

function finishProductInitLineReplace(
  out: string,
  context: InitProductWorkflowContext,
  names: {
    dockerFrom: string;
    dockerTo: string;
    pascal: string;
    snakeUpper: string;
    sourcePascal: string;
    sourceSnakeUpper: string;
  },
): string {
  const {
    dockerFrom,
    dockerTo,
    pascal,
    snakeUpper,
    sourcePascal,
    sourceSnakeUpper,
  } = names;

  // Preserve the thin @saflib/templates package name / path (do not treat
  // "templates" lines as exempt from /base/ → /product/ path renames —
  // monolith Dockerfiles mention both).
  const preserveTemplates =
    out.includes("@saflib/templates") || out.includes("saflib/templates/");

  let result = preserveTemplates
    ? out
    : out.split(SOURCE_PACKAGE_PREFIX).join(context.sharedPackagePrefix);
  result = result
    .split("@saflib/deploy")
    .join(`@${context.organizationName}/deploy`);
  result = result.split(dockerFrom).join(dockerTo);
  result = result.split(SOURCE_DOMAIN).join(context.domainName);

  // Path / token renames — avoid bare "base" (database, based, …).
  result = result.replaceAll(
    `/${SOURCE_PRODUCT_NAME}/`,
    `/${context.productName}/`,
  );
  result = result.replaceAll(
    `./${SOURCE_PRODUCT_NAME}/`,
    `./${context.productName}/`,
  );
  result = result.replaceAll(
    `${SOURCE_PRODUCT_NAME}-`,
    `${context.productName}-`,
  );
  result = result.replaceAll(
    `/${SOURCE_PRODUCT_NAME}-`,
    `/${context.productName}-`,
  );
  result = result.replaceAll(`${sourceSnakeUpper}_`, `${snakeUpper}_`);
  result = result.replaceAll(sourcePascal, pascal);

  result = result.replace(
    new RegExp(`\\b${SOURCE_PRODUCT_NAME}\\b`, "g"),
    context.productName,
  );
  result = result.replace(
    new RegExp(`\\b${sourceSnakeUpper}\\b`, "g"),
    snakeUpper,
  );

  return result;
}

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
      productOnly: input.productOnly ?? false,
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
      description: `Add ${context.productName}/** to workspaces in package.json`,
      transform: (content: string) => {
        const pkg = JSON.parse(content);
        const workspaces = Array.from(
          new Set([...pkg.workspaces, `${context.productName}/**`]),
        );
        workspaces.sort();
        pkg.workspaces = workspaces;
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
      skipSourceGlobs: ["**/__*__/**", "**/__*__*"],
    })),
    // lineReplace drops stub `"path"` lines but can leave empty `{ }` objects in
    // multi-line tsconfig references; strip those before npm install / saf-imports.
    step(CommandStepMachine, ({ context }) => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        path.join(import.meta.dirname, "strip-stub-tsconfig-refs.ts"),
        path.join(context.cwd, context.productName),
      ],
    })),
    step(
      CopyStepMachine,
      ({ context }) => {
        const deployTarget = resolveDeployDir(context.cwd);
        // checklist/dry never write; keep the step for checklist text.
        // script/print/run must not upsert onto the golden deploy tree.
        if (
          path.resolve(templatesDeployRoot) === path.resolve(deployTarget) &&
          context.runMode !== "checklist" &&
          context.runMode !== "dry"
        ) {
          throw new Error(
            `Refusing to upsert deploy onto its own golden tree (${deployTarget}). ` +
              `Set SAF_DEPLOY_DIR to a disposable directory (e.g. tmp-deploy) when ` +
              `running product/init from the saflib repo root.`,
          );
        }
        return {
          name: context.productName,
          targetDir: deployTarget,
          templateFiles: { deploy: templatesDeployRoot },
          lineReplace: makeProductInitLineReplace(context),
        };
      },
      { skipIf: ({ context }) => context.productOnly },
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
    // Golden product compose mounts the whole saflib root; rewrite for product-beside-saflib.
    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(
        context.cwd,
        context.productName,
        "dev",
        "docker-compose.yaml",
      ),
      description: "Rewrite base/dev compose volumes for product monorepo layout",
      transform: (content: string) =>
        toProductMonorepoDevCompose(content, context.productName),
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
            resolveDeployDir(context.cwd),
            "remote-assets",
            `env.${context.productName}.secrets`,
          ),
          path.join(
            resolveDeployDir(context.cwd),
            "remote-assets",
            `.env.${context.productName}.secrets`,
          ),
        ],
      }),
      { skipIf: ({ context }) => context.productOnly },
    ),
    step(CdStepMachine, ({ context }) => ({
      // Nested monorepos (host product → saflib): install at the outermost
      // workspace root so new product packages are linked for typecheck.
      path: findOutermostWorkspaceRoot(context.originalWorkingDirectory),
    })),
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
        path.join(import.meta.dirname, "regenerate-product-env.ts"),
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
        path.join(import.meta.dirname, "reset-product-db-migrations.ts"),
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
      path: context.originalWorkingDirectory,
    })),
    // CopyStep skips dist/; generate OpenAPI types/JSON for each saf.kind=spec package.
    step(CommandStepMachine, ({ context }) => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        path.join(import.meta.dirname, "generate-product-specs.ts"),
        path.join(context.originalWorkingDirectory, context.productName),
      ],
    })),
    step(
      CdStepMachine,
      () => ({
        path: `./${getDeployDirName()}`,
      }),
      { skipIf: ({ context }) => context.productOnly },
    ),
    step(
      CommandStepMachine,
      () => ({
        command: "npm",
        args: ["run", "regen-kratos-secrets"],
      }),
      { skipIf: ({ context }) => context.productOnly },
    ),
    step(
      CommandStepMachine,
      () => ({
        command: "npm",
        args: ["run", "generate"],
      }),
      { skipIf: ({ context }) => context.productOnly },
    ),
  ],
});

export default InitProductWorkflowDefinition;
