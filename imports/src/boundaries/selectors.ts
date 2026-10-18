export interface PackageForSelector {
  name: string;
  /** Absolute package directory. */
  dir: string;
  /** Repo-relative package directory, `/`-separated. */
  relDir: string;
  /** `package.json` `saf.kind`, when set. */
  kind?: string;
}

function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i += 1;
      } else {
        re += "[^/]*";
      }
    } else {
      re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

/**
 * Match a package against a selector:
 * - `kind:<k>` — `package.json` `saf.kind` equals `<k>`
 * - `dir:<glob>` — repo-relative package directory matches the glob
 * - anything else — package name glob (`*` within a segment, `**` across)
 */
export function matchesPackageSelector(
  selector: string,
  pkg: PackageForSelector,
): boolean {
  if (selector.startsWith("kind:")) {
    return pkg.kind === selector.slice("kind:".length);
  }
  if (selector.startsWith("dir:")) {
    return globToRegExp(selector.slice("dir:".length)).test(pkg.relDir);
  }
  return globToRegExp(selector).test(pkg.name);
}
