/**
 * Map between external lib camelCase types (@saflib/imports, monorepo, git) and
 * snake_case OpenAPI / CommitPackageDetail wire shapes.
 */
import type { ImportUsedBy, PackageIssue, PackageDetailForIssues } from "@saflib/imports";

export type ApiUsedBy = {
  package_name: string;
  file_path: string;
  repo_path: string;
};

export type ApiPackageIssue = {
  kind: PackageIssue["kind"];
  title: string;
  name: string;
  kind_label: string;
  file_path: string;
  repo_path: string;
};

export function toApiUsedBy(u: ImportUsedBy): ApiUsedBy {
  return {
    package_name: u.packageName,
    file_path: u.filePath,
    repo_path: u.repoPath,
  };
}

export function toApiUsedByList(
  rows: ImportUsedBy[] | undefined | null,
): ApiUsedBy[] {
  return (rows ?? []).map(toApiUsedBy);
}

export function toApiPackageIssue(i: PackageIssue): ApiPackageIssue {
  return {
    kind: i.kind,
    title: i.title,
    name: i.name,
    kind_label: i.kindLabel,
    file_path: i.filePath,
    repo_path: i.repoPath,
  };
}

export function toApiPackageIssues(rows: PackageIssue[]): ApiPackageIssue[] {
  return rows.map(toApiPackageIssue);
}

export function toApiRename(r: {
  fromPath: string;
  toPath: string;
  score: number;
}): {
  from_path: string;
  to_path: string;
  score: number;
} {
  return { from_path: r.fromPath, to_path: r.toPath, score: r.score };
}

function isApiUsedBy(u: ApiUsedBy | ImportUsedBy): u is ApiUsedBy {
  return "package_name" in u;
}

function isApiPackageIssue(
  i: PackageIssue | ApiPackageIssue,
): i is ApiPackageIssue {
  return "kind_label" in i;
}

function toLibUsedBy(u: ApiUsedBy | ImportUsedBy): ImportUsedBy {
  if (isApiUsedBy(u)) {
    return {
      packageName: u.package_name,
      filePath: u.file_path,
      repoPath: u.repo_path,
    };
  }
  return u;
}

function toLibPackageIssue(i: PackageIssue | ApiPackageIssue): PackageIssue {
  if (isApiPackageIssue(i)) {
    return {
      kind: i.kind,
      title: i.title,
      name: i.name,
      kindLabel: i.kind_label,
      filePath: i.file_path,
      repoPath: i.repo_path,
    };
  }
  return i;
}

/** Adapt snake_case package detail into collectPackageIssues input. */
export function toPackageDetailForIssues(detail: {
  package_name: string;
  directory?: string;
  product_root?: string;
  exports?: Array<{
    name: string;
    kind: string;
    file_path: string;
    used_by?: Array<ApiUsedBy | ImportUsedBy> | null;
  }>;
  db_inventory?: {
    entities: Array<{
      entity: string;
      queries: Array<{
        file_name: string;
        file_path: string;
        export_name?: string | null;
        used_by?: Array<ApiUsedBy | ImportUsedBy> | null;
      }>;
    }>;
  };
  layout_issues?: Array<PackageIssue | ApiPackageIssue>;
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
    layoutIssues: detail.layout_issues?.map(toLibPackageIssue),
    publicExportFilePaths: detail.public_export_file_paths,
  };
}
