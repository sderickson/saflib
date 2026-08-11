import fs from "node:fs";
import path from "node:path";
import { parseAsyncVuePageTarget } from "./parse-async-vue.ts";
import { listGateSpas, spaClientDir } from "./paths.ts";

export interface SpaRouteCatalogEntry {
  routeKey: string;
  pathPattern: string;
  asyncVueFile: string;
  pageVueFiles: string[];
  componentName: string;
}

export interface SpaRouteCatalog {
  spa: string;
  spaPackageDir: string;
  routerFile: string;
  routes: SpaRouteCatalogEntry[];
}

function extractWorkflowSection(
  content: string,
  area: string,
): string | undefined {
  const begin = `BEGIN WORKFLOW AREA ${area}`;
  const end = `END WORKFLOW AREA`;
  const start = content.indexOf(begin);
  if (start === -1) return undefined;
  const from = content.indexOf("\n", start) + 1;
  const endIdx = content.indexOf(end, from);
  if (endIdx === -1) return undefined;
  return content.slice(from, endIdx);
}

function parsePageImports(section: string, spaDir: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /import\s+(\w+)\s+from\s+["'](\.[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const name = m[1];
    const rel = m[2];
    const abs = path.resolve(spaDir, rel);
    map.set(name, abs);
  }
  return map;
}

/** Extract literal path from `path:` field value (best-effort). */
function pathPatternFromExpr(expr: string): string {
  const trimmed = expr.trim();
  const str = trimmed.match(/^["']([^"']+)["']$/);
  if (str) return str[1];
  const segment = trimmed.match(/accountPathSegment\(\s*accountLinks\.(\w+)\.path\s*\)/);
  if (segment) return `accountLinks.${segment[1]}`;
  const link = trimmed.match(/(\w+Links)\.(\w+)\.path/);
  if (link) return `${link[1]}.${link[2]}`;
  return trimmed;
}

interface ParsedRouteNode {
  pathPattern: string;
  componentName?: string;
  children: ParsedRouteNode[];
}

function parseRouteNodes(section: string): ParsedRouteNode[] {
  const nodes: ParsedRouteNode[] = [];
  const re =
    /\{\s*path:\s*([^,]+),\s*(?:[^}]*?component:\s*(\w+))?[^}]*?(?:children:\s*\[([\]]|[^\]]*)\])?[^}]*\}/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const pathPattern = pathPatternFromExpr(m[1]);
    const componentName = m[2] ?? undefined;
    const childrenBlock = m[3];
    const children: ParsedRouteNode[] = [];
    if (childrenBlock && childrenBlock !== "]") {
      children.push(...parseRouteNodes(childrenBlock));
    }
    nodes.push({ pathPattern, componentName, children });
  }
  return nodes;
}

function flattenRoutes(
  nodes: ParsedRouteNode[],
  prefix: string,
  importMap: Map<string, string>,
  spa: string,
  root: string,
  ancestorPageVues: string[],
  out: SpaRouteCatalogEntry[],
): void {
  for (const node of nodes) {
    const pathPattern = prefix
      ? `${prefix}/${node.pathPattern}`.replace(/\/+/g, "/")
      : node.pathPattern;
    let chain = [...ancestorPageVues];
    if (node.componentName && importMap.has(node.componentName)) {
      const asyncVueFile = importMap.get(node.componentName)!;
      const pageVue = parseAsyncVuePageTarget(asyncVueFile);
      if (pageVue) {
        chain = [...chain, pageVue];
      }
      const relAsync = path
        .relative(root, asyncVueFile)
        .replace(/\\/g, "/");
      out.push({
        routeKey: `${spa}:${relAsync}`,
        pathPattern,
        asyncVueFile: relAsync,
        pageVueFiles: chain.map((p) => path.relative(root, p).replace(/\\/g, "/")),
        componentName: node.componentName,
      });
    }
    if (node.children.length > 0) {
      flattenRoutes(
        node.children,
        pathPattern,
        importMap,
        spa,
        root,
        chain,
        out,
      );
    }
  }
}

/** Build route catalog for a gate SPA from its `router.ts`. */
export function analyzeSpaRouter(
  root: string,
  spa: string,
): SpaRouteCatalog | undefined {
  const relDir = spaClientDir(root, spa);
  if (!relDir) return undefined;
  const spaDir = path.join(root, relDir);
  const routerFile = path.join(spaDir, "router.ts");
  if (!fs.existsSync(routerFile)) return undefined;

  const content = fs.readFileSync(routerFile, "utf8");
  const importsSection = extractWorkflowSection(content, "page-imports FOR vue/add-view");
  const routesSection = extractWorkflowSection(content, "page-routes FOR vue/add-view");

  const importMap = new Map<string, string>();
  if (importsSection) {
    for (const [k, v] of parsePageImports(importsSection, spaDir)) {
      importMap.set(k, v);
    }
  }
  // Auth SPA: imports outside workflow block + kratos additionalRoutes
  for (const [k, v] of parsePageImports(content, spaDir)) {
    if (!importMap.has(k)) importMap.set(k, v);
  }

  const routes: SpaRouteCatalogEntry[] = [];

  if (routesSection) {
    const routeNodes = parseRouteNodes(routesSection);
    flattenRoutes(routeNodes, "", importMap, spa, root, [], routes);
  }

  const additionalMatch = content.match(
    /additionalRoutes:\s*\[([\s\S]*?)\]\s*,?\s*(?:\/\/|})/,
  );
  if (additionalMatch) {
    const routeNodes = parseRouteNodes(additionalMatch[1]);
    flattenRoutes(routeNodes, "", importMap, spa, root, [], routes);
  }

  if (routes.length === 0 && importMap.size === 0) return undefined;

  return {
    spa,
    spaPackageDir: relDir,
    routerFile: path.relative(root, routerFile).replace(/\\/g, "/"),
    routes,
  };
}

export { listGateSpas } from "./paths.ts";
