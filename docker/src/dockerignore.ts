import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

interface Rule {
  regex: RegExp;
  negate: boolean;
}

function patternToRegex(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        // `**/` matches zero or more directories; a trailing `**` matches anything.
        if (pattern[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

/**
 * Matches context-relative paths against `.dockerignore` rules, following
 * Docker's semantics closely enough for auditing: patterns are anchored at the
 * context root, `**` spans directories, `!` re-includes, the last matching
 * rule wins, and a rule matching a directory excludes everything under it.
 */
export class DockerIgnore {
  private readonly rules: Rule[];

  constructor(contents: string) {
    this.rules = contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
      .map((line) => {
        const negate = line.startsWith("!");
        const raw = (negate ? line.slice(1) : line).trim();
        const cleaned = path.posix
          .normalize(raw)
          .replace(/^\/+/, "")
          .replace(/\/+$/, "");
        return { regex: patternToRegex(cleaned), negate };
      });
  }

  static fromContextDir(contextDir: string): DockerIgnore {
    const file = path.join(contextDir, ".dockerignore");
    return new DockerIgnore(existsSync(file) ? readFileSync(file, "utf8") : "");
  }

  /** `true` if `relativePath` (posix, context-relative) is excluded. */
  ignores(relativePath: string): boolean {
    const clean = relativePath.replace(/^\.\//, "").replace(/\/+$/, "");
    const segments = clean.split("/");
    const candidates = segments.map((_, i) =>
      segments.slice(0, i + 1).join("/"),
    );
    let ignored = false;
    for (const rule of this.rules) {
      if (candidates.some((candidate) => rule.regex.test(candidate))) {
        ignored = !rule.negate;
      }
    }
    return ignored;
  }
}
