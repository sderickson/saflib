import fs from "node:fs";
import path from "node:path";

export interface SideEffectFlag {
  rule: string;
  file: string;
  detail?: string;
}

export interface SideEffectScanResult {
  packageDir: string;
  packageName: string;
  flags: SideEffectFlag[];
  suggestedSideEffects: false | string[];
  safeForFalse: "yes" | "no" | "review";
}

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "coverage",
  "fixtures",
]);

function walkSourceFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walkSourceFiles(full, out);
    } else if (/\.(ts|tsx|vue|js|mjs|cjs)$/.test(ent.name)) {
      out.push(full);
    }
  }
}

function scanFileContent(filePath: string, content: string): SideEffectFlag[] {
  const flags: SideEffectFlag[] = [];
  const rel = path.basename(filePath);
  if (/\.(css|scss)$/.test(filePath)) return flags;

  if (/import\s+["'][^"']+\.(css|scss)["']/.test(content)) {
    flags.push({ rule: "css-import", file: filePath });
  }
  if (/declare\s+module\s/.test(content) && !filePath.endsWith(".d.ts")) {
    flags.push({ rule: "declare-module", file: filePath });
  }
  if (/vue-query-register/.test(filePath) || /vue-query-register/.test(content)) {
    flags.push({ rule: "vue-query-register", file: filePath });
  }
  if (rel === "font-imports.ts" || rel === "posthog-init.ts") {
    flags.push({ rule: "known-init", file: filePath, detail: rel });
  }
  if (rel === "index.ts" && /import\s+["']\.\/vue-query-register/.test(content)) {
    flags.push({ rule: "index-registration", file: filePath });
  }
  if (/^(globalThis|window)\.\w+\s*=/.test(content)) {
    flags.push({ rule: "global-assign", file: filePath });
  }
  return flags;
}

function buildSuggestion(
  packageDir: string,
  flags: SideEffectFlag[],
): false | string[] {
  if (flags.length === 0) return false;

  const entries = new Set<string>();
  for (const f of flags) {
    if (f.rule === "css-import" || f.file.match(/\.(css|scss)$/)) {
      entries.add("**/*.css");
      entries.add("**/*.scss");
    }
    if (f.rule === "known-init" && f.detail === "font-imports.ts") {
      entries.add("./font-imports.ts");
    }
    if (f.rule === "declare-module" || f.rule === "vue-query-register" || f.rule === "index-registration") {
      const rel = path.relative(packageDir, f.file).replace(/\\/g, "/");
      if (!rel.startsWith("..")) {
        entries.add(`./${rel}`);
      }
    }
  }
  if (entries.size === 0) return false;
  return [...entries].sort();
}

export function scanPackageSideEffects(
  packageDir: string,
  packageName: string,
): SideEffectScanResult {
  const files: string[] = [];
  walkSourceFiles(packageDir, files);
  const flags: SideEffectFlag[] = [];
  for (const file of files) {
    if (file.endsWith(".d.ts")) continue;
    const content = fs.readFileSync(file, "utf8");
    for (const f of scanFileContent(file, content)) {
      flags.push({
        ...f,
        file: path.relative(packageDir, f.file).replace(/\\/g, "/"),
      });
    }
  }

  const suggested = buildSuggestion(packageDir, flags);
  let safeForFalse: "yes" | "no" | "review" = "yes";
  if (suggested === false) safeForFalse = "yes";
  else if (
    flags.some((f) => f.rule === "declare-module" || f.rule === "global-assign")
  ) {
    safeForFalse = "review";
  } else if (flags.length > 0) {
    safeForFalse = "no";
  }

  return {
    packageDir,
    packageName,
    flags,
    suggestedSideEffects: suggested,
    safeForFalse,
  };
}
