/**
 * Package issues from the working tree — no git commit scan or sqlite.
 */
import { analyzeWorkdirPackage, type PackageIssue } from "@saflib/imports";

export interface WorkdirPackageIssuesOptions {
  repo_root: string;
  /** Limit walk to this prefix (e.g. `product`). Empty = whole repo. */
  product_root?: string;
  package_name: string;
  /** When true (default), include monorepo layout + LoC findings. */
  includeLayout?: boolean;
}

export interface WorkdirPackageIssuesResult {
  package_name: string;
  directory: string;
  product_root: string;
  source: "workdir";
  issueCount: number;
  issues: PackageIssue[];
  export_count: number;
}

/**
 * Scan the working tree under product_root and list issues for one package.
 */
export async function collectWorkdirPackageIssues(
  options: WorkdirPackageIssuesOptions,
): Promise<WorkdirPackageIssuesResult> {
  const product_root = (options.product_root ?? "").replace(/^\/+|\/+$/g, "");
  const analyzed = await analyzeWorkdirPackage({
    monorepoRoot: options.repo_root,
    productRoot: product_root || undefined,
    packageName: options.package_name,
    includeLayout: options.includeLayout,
    includeExportsCheck: false,
  });

  if (!analyzed) {
    return {
      package_name: options.package_name,
      directory: "",
      product_root,
      source: "workdir",
      issueCount: 0,
      issues: [],
      export_count: 0,
    };
  }

  return {
    package_name: analyzed.packageName,
    directory: analyzed.packageRepoPath,
    product_root,
    source: "workdir",
    issueCount: analyzed.issues.length,
    issues: analyzed.issues,
    export_count: analyzed.exportCount,
  };
}
