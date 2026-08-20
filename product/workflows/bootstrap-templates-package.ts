/**
 * One-shot bootstrap (already run). Kept for history only — the source of truth is
 * now `saflib/base/` + `saflib/deploy/` (see `@saflib/templates` copy-root).
 * Do not re-run without updating destinations to that layout.
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeLineReplace } from "@saflib/workflows";
import { processFileContent } from "../../workflows/core/steps/copy/rename-next-file.ts";
import { transformName } from "../../workflows/core/steps/copy/utils.ts";

const saflibRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outRoot = path.join(saflibRoot, "templates");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "playwright-report",
  "test-results",
]);

const SKIP_PATH_SEGMENTS = new Set([
  "__group-name__",
  "__target-name__",
  "__TargetName__",
  "__query-name__",
  "__mutation-name__",
  "__target_name__",
]);

const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".vue",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonnet",
  ".yaml",
  ".yml",
  ".md",
  ".scss",
  ".css",
  ".html",
  ".mts",
  ".sql",
  ".gitignore",
  ".dockerignore",
  ".sh",
  ".Caddyfile",
  ".template",
]);

interface CopyOpts {
  src: string;
  dest: string;
  workflowId: string;
  context: Record<string, unknown>;
  name?: string;
  extraReplace?: (line: string) => string;
  skipBasenames?: Set<string>;
  skipDirs?: Set<string>;
}

function isProbablyText(filePath: string): boolean {
  const ext = path.extname(filePath);
  const base = path.basename(filePath);
  if (TEXT_EXT.has(ext)) return true;
  if (base.startsWith(".") && !base.includes(".")) return true;
  if (["Caddyfile", "Dockerfile", "Dockerfile.template"].includes(base)) {
    return true;
  }
  if (base.startsWith("env.") || base.startsWith(".env")) return true;
  return ext === "";
}

function isExpansionStubSegment(segment: string): boolean {
  if (SKIP_PATH_SEGMENTS.has(segment)) return true;
  if (!segment.includes("__")) return false;
  const allowed = [
    "__product-name__",
    "__ProductName__",
    "__product_name__",
    "__subdomain-name__",
    "__SubdomainName__",
    "__static-subdomain-name__",
    "__organization-name__",
    "__domain-name__",
  ];
  return !allowed.some((token) => segment.includes(token));
}

function walkFiles(
  dir: string,
  skipBasenames?: Set<string>,
  skipDirs?: Set<string>,
): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) {
    throw new Error(`Missing template dir: ${dir}`);
  }
  const entries = readdirSync(dir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath, entry.name);
    const rel = path.relative(dir, full);
    const parts = rel.split(path.sep);
    if (parts.some((p) => SKIP_DIR_NAMES.has(p) || skipDirs?.has(p))) continue;
    if (parts.some((p) => isExpansionStubSegment(p))) continue;
    if (skipBasenames?.has(path.basename(full))) continue;
    out.push(full);
  }
  return out;
}

function copyTree(opts: CopyOpts) {
  const lineReplaceInner = makeLineReplace(opts.context);
  const lineReplace = (line: string) => {
    const extra = opts.extraReplace ? opts.extraReplace(line) : line;
    return lineReplaceInner(extra);
  };

  const files = statSync(opts.src).isDirectory()
    ? walkFiles(opts.src, opts.skipBasenames, opts.skipDirs)
    : [opts.src];

  for (const sourcePath of files) {
    const rel = statSync(opts.src).isDirectory()
      ? path.relative(opts.src, sourcePath)
      : path.basename(sourcePath);
    const relDir = path.dirname(rel);
    const transformedDir =
      relDir === "." ? "" : lineReplace(relDir.split(path.sep).join("/"));
    const destName = transformName(
      path.basename(sourcePath),
      opts.name,
      lineReplace,
    );
    const destPath = path.join(opts.dest, transformedDir, destName);
    mkdirSync(path.dirname(destPath), { recursive: true });

    if (!isProbablyText(sourcePath)) {
      writeFileSync(destPath, readFileSync(sourcePath));
      continue;
    }

    const content = readFileSync(sourcePath, "utf8");
    const updated = processFileContent({
      contentLines: content.split("\n"),
      name: opts.name,
      lineReplace,
      workflowId: opts.workflowId,
    });
    writeFileSync(destPath, updated.join("\n"));
  }
}

const productName = "templates";
const domainName = "example.com";
const organizationName = "saflib";
const sharedPackagePrefix = "@saflib/templates";

const baseCtx = {
  productName,
  domainName,
  organizationName,
  sharedPackagePrefix,
  serviceName: productName,
  packageName: `${sharedPackagePrefix}-unused`,
};

function spaCtx(subdomainName: string) {
  return {
    ...baseCtx,
    subdomainName,
    staticSubdomainName: subdomainName,
    spaPackageName: `${sharedPackagePrefix}-${subdomainName}-spa`,
    staticPackageName: `${sharedPackagePrefix}-${subdomainName}-static`,
    linksPackageName: `${sharedPackagePrefix}-links`,
    commonPackageName: `${sharedPackagePrefix}-clients-common`,
    serviceSpecName: `${sharedPackagePrefix}-spec`,
    serviceSdkName: `${sharedPackagePrefix}-sdk`,
  };
}

function extraSpaReplace(subdomainName: string, kind: "spa" | "static") {
  return (line: string) => {
    let next = line.replaceAll(
      "template-package-clients-common",
      `${sharedPackagePrefix}-clients-common`,
    );
    next = next.replaceAll("template-package-spec", `${sharedPackagePrefix}-spec`);
    next = next.replaceAll("template-package-links", `${sharedPackagePrefix}-links`);
    next = next.replaceAll("template-package-sdk", `${sharedPackagePrefix}-sdk`);
    if (kind === "spa") {
      next = next.replaceAll(
        '"template-package-spa"',
        `"${sharedPackagePrefix}-${subdomainName}-spa"`,
      );
    } else {
      next = next.replaceAll(
        '"template-package-static"',
        `"${sharedPackagePrefix}-${subdomainName}-static"`,
      );
    }
    return next;
  };
}

function vueTemplate(rel: string) {
  return path.join(saflibRoot, "vue/workflows/template", rel);
}

mkdirSync(outRoot, { recursive: true });

copyTree({
  src: path.join(saflibRoot, "openapi/workflows/templates"),
  dest: path.join(outRoot, "service/spec"),
  workflowId: "openapi/init",
  context: { ...baseCtx, packageName: `${sharedPackagePrefix}-spec` },
  skipDirs: new Set(["dist", "routes"]),
});

copyTree({
  src: path.join(saflibRoot, "drizzle/workflows/templates"),
  dest: path.join(outRoot, "service/db"),
  workflowId: "drizzle/init",
  context: { ...baseCtx, packageName: `${sharedPackagePrefix}-db` },
  skipDirs: new Set(["migrations", "schemas", "queries"]),
});
mkdirSync(path.join(outRoot, "service/db/data"), { recursive: true });
writeFileSync(path.join(outRoot, "service/db/data/.gitkeep"), "");

copyTree({
  src: path.join(saflibRoot, "sdk/workflows/templates"),
  dest: path.join(outRoot, "service/sdk"),
  workflowId: "sdk/init",
  context: {
    ...baseCtx,
    packageName: `${sharedPackagePrefix}-sdk`,
    reversePath: "../../..",
  },
  skipBasenames: new Set([
    "App.vue",
    "main.ts",
    "index.html",
    "vite.config.ts",
    "Dockerfile.template",
    "docker-compose.yaml",
    ".dockerignore",
  ]),
  skipDirs: new Set(["requests"]),
});

copyTree({
  src: path.join(saflibRoot, "service/workflows/common-templates"),
  dest: path.join(outRoot, "service/common"),
  workflowId: "service/init-common",
  context: { ...baseCtx, packageName: `${sharedPackagePrefix}-service-common` },
  name: productName,
  skipBasenames: new Set(["env.ts"]),
});

copyTree({
  src: path.join(saflibRoot, "express/workflows/templates"),
  dest: path.join(outRoot, "service/http"),
  workflowId: "express/init",
  context: { ...baseCtx, packageName: `${sharedPackagePrefix}-http` },
  skipDirs: new Set(["routes"]),
});

copyTree({
  src: path.join(
    saflibRoot,
    "product/workflows/templates/__product-name__",
  ),
  dest: outRoot,
  workflowId: "product/init",
  context: baseCtx,
  name: productName,
  skipBasenames: new Set(["env.ts", "env.schema.combined.json"]),
});

copyTree({
  src: path.join(saflibRoot, "product/workflows/templates/deploy"),
  dest: path.join(outRoot, "deploy"),
  workflowId: "product/init",
  context: baseCtx,
  name: productName,
});

copyTree({
  src: path.join(saflibRoot, "product/workflows/templates/.github"),
  dest: path.join(outRoot, ".github"),
  workflowId: "product/init",
  context: baseCtx,
  name: productName,
});

copyTree({
  src: vueTemplate("common"),
  dest: path.join(outRoot, "clients/common"),
  workflowId: "vue/add-spa",
  context: spaCtx("app"),
  extraReplace: extraSpaReplace("app", "spa"),
});

copyTree({
  src: vueTemplate("build"),
  dest: path.join(outRoot, "clients/build"),
  workflowId: "vue/add-spa",
  context: spaCtx("app"),
  extraReplace: extraSpaReplace("app", "spa"),
});

const spas = ["admin", "app", "auth", "account"] as const;
for (const subdomainName of spas) {
  copyTree({
    src: vueTemplate("__subdomain-name__"),
    dest: path.join(outRoot, "clients", subdomainName),
    workflowId: "vue/add-spa",
    context: spaCtx(subdomainName),
    extraReplace: extraSpaReplace(subdomainName, "spa"),
    name: productName,
  });
  copyTree({
    src: vueTemplate("links/__subdomain-name__-links.ts"),
    dest: path.join(outRoot, "clients/links"),
    workflowId: "vue/add-spa",
    context: spaCtx(subdomainName),
    extraReplace: extraSpaReplace(subdomainName, "spa"),
  });
  const spaHtmlDir = vueTemplate("build/__subdomain-name__");
  if (existsSync(spaHtmlDir)) {
    copyTree({
      src: spaHtmlDir,
      dest: path.join(outRoot, "clients/build", subdomainName),
      workflowId: "vue/add-spa",
      context: spaCtx(subdomainName),
      extraReplace: extraSpaReplace(subdomainName, "spa"),
    });
  }
}

copyTree({
  src: vueTemplate("__static-subdomain-name__"),
  dest: path.join(outRoot, "clients/root"),
  workflowId: "vue/add-static-site",
  context: spaCtx("root"),
  extraReplace: extraSpaReplace("root", "static"),
  name: productName,
});
copyTree({
  src: vueTemplate("links/__subdomain-name__-links.ts"),
  dest: path.join(outRoot, "clients/links"),
  workflowId: "vue/add-static-site",
  context: spaCtx("root"),
  extraReplace: extraSpaReplace("root", "static"),
});

copyTree({
  src: vueTemplate("links/package.json"),
  dest: path.join(outRoot, "clients/links"),
  workflowId: "vue/add-spa",
  context: spaCtx("app"),
  extraReplace: extraSpaReplace("app", "spa"),
});
copyTree({
  src: vueTemplate("links/tsconfig.json"),
  dest: path.join(outRoot, "clients/links"),
  workflowId: "vue/add-spa",
  context: spaCtx("app"),
  extraReplace: extraSpaReplace("app", "spa"),
});

writeFileSync(
  path.join(outRoot, "clients/links/index.ts"),
  `// BEGIN WORKFLOW AREA subdomain-links FOR vue/add-spa vue/add-static-site
export { adminLinks } from "./admin-links.ts";
export { appLinks } from "./app-links.ts";
export { authLinks } from "./auth-links.ts";
export { accountLinks } from "./account-links.ts";
export { rootLinks } from "./root-links.ts";
// END WORKFLOW AREA
`,
);

writeFileSync(
  path.join(outRoot, "package.json"),
  JSON.stringify(
    {
      name: "@saflib/templates",
      saf: { kind: "lib" },
      description:
        "Baseline SAF product (apps, auth, admin, account, static site, service) used as the copy source for product/init.",
      private: true,
      type: "module",
      exports: {
        ".": "./index.ts",
      },
      scripts: {
        typecheck: "echo 'typecheck lives in nested product packages'",
      },
      dependencies: {
        "@saflib/workflows": "*",
      },
      sideEffects: false,
    },
    null,
    2,
  ) + "\n",
);

writeFileSync(
  path.join(outRoot, "index.ts"),
  `import path from "node:path";

/** Root of the checked-in baseline product (clients, service, deploy, …). */
export const templatesRoot = path.dirname(new URL(import.meta.url).pathname);
`,
);

console.log(`Wrote baseline product to ${outRoot}`);
