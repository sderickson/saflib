/**
 * Browser-safe adapters between OpenAPI snake_case package detail and
 * `@saflib/imports/issues` camelCase collectors.
 */
import type {
  PackageDetailForIssues,
  PackageIssue,
} from "@saflib/imports/issues";

type ApiUsedBy = {
  package_name: string;
  file_path: string;
  repo_path: string;
};

type ApiPackageIssue = {
  kind: PackageIssue["kind"];
  title: string;
  name: string;
  kind_label: string;
  file_path: string;
  repo_path: string;
};

function toLibUsedBy(u: ApiUsedBy): {
  packageName: string;
  filePath: string;
  repoPath: string;
} {
  return {
    packageName: u.package_name,
    filePath: u.file_path,
    repoPath: u.repo_path,
  };
}

/** Adapt snake_case commit package detail into collectPackageIssues input. */
export function toPackageDetailForIssues(detail: {
  package_name: string;
  directory?: string;
  product_root?: string;
  exports?: Array<{
    name: string;
    kind: string;
    file_path: string;
    used_by?: ApiUsedBy[] | null;
  }>;
  db_inventory?: {
    entities: Array<{
      entity: string;
      queries: Array<{
        file_name: string;
        file_path: string;
        export_name?: string | null;
        used_by?: ApiUsedBy[] | null;
      }>;
    }>;
  };
  layout_issues?: ApiPackageIssue[];
  public_export_file_paths?: string[];
}): PackageDetailForIssues {
  return {
    packageName: detail.package_name,
    directory: detail.directory,
    productRoot: detail.product_root,
    exports: detail.exports?.map((e) => ({
      name: e.name,
      kind: e.kind,
      filePath: e.file_path,
      usedBy: (e.used_by ?? []).map(toLibUsedBy),
    })),
    dbInventory: detail.db_inventory
      ? {
          entities: detail.db_inventory.entities.map((ent) => ({
            entity: ent.entity,
            queries: ent.queries.map((q) => ({
              fileName: q.file_name,
              filePath: q.file_path,
              exportName: q.export_name,
              usedBy: (q.used_by ?? []).map(toLibUsedBy),
            })),
          })),
        }
      : undefined,
    layoutIssues: detail.layout_issues?.map((i) => ({
      kind: i.kind,
      title: i.title,
      name: i.name,
      kindLabel: i.kind_label,
      filePath: i.file_path,
      repoPath: i.repo_path,
    })),
    publicExportFilePaths: detail.public_export_file_paths,
  };
}
