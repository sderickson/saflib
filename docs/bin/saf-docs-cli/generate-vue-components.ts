import type { ComponentMeta, EventMeta, ExposeMeta, PropertyMeta, SlotMeta } from "vue-component-meta";
import { createChecker } from "vue-component-meta";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";
import { getVueComponentMetaTsconfig, isVuePackage } from "./generate-typedoc-vue.ts";

export interface GenerateVueComponentDocsOptions {
  packageDir: string;
  packageJson: { scripts?: Record<string, string> };
}

export interface DefinedModel {
  name: string;
  prop: PropertyMeta;
  event?: EventMeta;
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function formatDefault(value: string | undefined): string {
  if (value === undefined || value === "") {
    return "—";
  }
  return `\`${escapeTableCell(value)}\``;
}

function renderTable(headers: string[], rows: string[][]): string {
  if (!rows.length) {
    return "";
  }
  const header = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`)
    .join("\n");
  return [header, separator, body].join("\n");
}

export function findDefinedModels(meta: ComponentMeta): DefinedModel[] {
  const models: DefinedModel[] = [];
  for (const prop of meta.props.filter((entry) => !entry.global)) {
    const updateEvent = meta.events.find(
      (event) => event.name === `update:${prop.name}`,
    );
    if (updateEvent || prop.name === "modelValue") {
      models.push({ name: prop.name, prop, event: updateEvent });
    }
  }
  return models;
}

export function extractComponentDescriptionFromSource(
  componentPath: string,
): string {
  const content = readFileSync(componentPath, "utf-8");
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    return "";
  }
  const blockComment = scriptMatch[1].match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (!blockComment) {
    return "";
  }
  return blockComment[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean)
    .join(" ");
}

export function renderComponentMarkdown(
  meta: ComponentMeta,
  componentName: string,
  sourcePath: string,
  sourceDescription = "",
): string {
  const lines: string[] = [
    `**@saflib/vue**`,
    "",
    "---",
    "",
    `# ${componentName}`,
    "",
  ];

  const description = meta.description?.trim() || sourceDescription.trim();
  if (description) {
    lines.push(description, "");
  }

  lines.push(`Source: \`${sourcePath}\``, "");

  const models = findDefinedModels(meta);
  const modelNames = new Set(models.map((model) => model.name));
  const props = meta.props.filter(
    (prop) => !prop.global && !modelNames.has(prop.name),
  );

  if (models.length) {
    lines.push("## Models", "");
    lines.push(
      renderTable(
        ["Name", "Type", "Default", "Required", "Description"],
        models.map(({ prop }) => [
          prop.name,
          prop.type || "—",
          formatDefault(prop.default),
          prop.required ? "yes" : "no",
          prop.description || "—",
        ]),
      ),
      "",
    );
  }

  if (props.length) {
    lines.push("## Props", "");
    lines.push(
      renderTable(
        ["Name", "Type", "Default", "Required", "Description"],
        props.map((prop) => [
          prop.name,
          prop.type || "—",
          formatDefault(prop.default),
          prop.required ? "yes" : "no",
          prop.description || "—",
        ]),
      ),
      "",
    );
  }

  const modelEventNames = new Set(
    models
      .map((model) => model.event?.name)
      .filter((name): name is string => Boolean(name)),
  );
  const events = meta.events.filter((event) => !modelEventNames.has(event.name));

  if (events.length) {
    lines.push("## Emits", "");
    lines.push(
      renderTable(
        ["Name", "Payload", "Description"],
        events.map((event) => [
          event.name,
          event.type || event.signature || "—",
          event.description || "—",
        ]),
      ),
      "",
    );
  }

  if (meta.slots.length) {
    lines.push("## Slots", "");
    lines.push(
      renderTable(
        ["Name", "Bindings", "Description"],
        meta.slots.map((slot: SlotMeta) => [
          slot.name,
          slot.type || "—",
          slot.description || "—",
        ]),
      ),
      "",
    );
  }

  if (meta.exposed.length) {
    lines.push("## Exposed", "");
    lines.push(
      renderTable(
        ["Name", "Type", "Description"],
        meta.exposed.map((exposed: ExposeMeta) => [
          exposed.name,
          exposed.type || "—",
          exposed.description || "—",
        ]),
      ),
      "",
    );
  }

  return lines.join("\n").trimEnd() + "\n";
}

function walkVueFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkVueFiles(fullPath, out);
      continue;
    }
    if (entry.name.endsWith(".vue")) {
      out.push(fullPath);
    }
  }
}

export function discoverVueComponentFiles(packageDir: string): string[] {
  const files: string[] = [];
  for (const dirName of ["components", "pages"]) {
    const dirPath = join(packageDir, dirName);
    if (existsSync(dirPath)) {
      walkVueFiles(dirPath, files);
    }
  }
  return files.sort();
}

export function cleanStaleTypedocComponentDirs(componentsRefDir: string): void {
  if (!existsSync(componentsRefDir)) {
    return;
  }
  for (const entry of readdirSync(componentsRefDir)) {
    const fullPath = join(componentsRefDir, entry);
    if (entry.endsWith(".vue") && statSync(fullPath).isDirectory()) {
      rmSync(fullPath, { recursive: true, force: true });
    }
  }
}

export function renderComponentsIndex(
  components: { name: string; description: string }[],
): string {
  const lines = [
    "**@saflib/vue**",
    "",
    "---",
    "",
    "# Components",
    "",
    "| Component | Description |",
    "| --- | --- |",
    ...components.map(
      ({ name, description }) =>
        `| [${name}](${name}.md) | ${escapeTableCell(description || "—")} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

export function patchVueRefIndex(packageDir: string): void {
  const indexPath = join(packageDir, "docs/ref/index.md");
  if (!existsSync(indexPath)) {
    return;
  }

  const content = readFileSync(indexPath, "utf-8");
  const lines = content.split("\n");
  const filtered = lines.filter(
    (line) =>
      !line.includes("| [components/") || line.includes("| [Components]("),
  );

  const modulesHeader = "| Module";
  const insertAt = filtered.findIndex((line) => line.startsWith(modulesHeader));
  if (insertAt === -1) {
    writeFileSync(indexPath, filtered.join("\n"));
    return;
  }

  let end = insertAt + 1;
  while (end < filtered.length && filtered[end].startsWith("|")) {
    end += 1;
  }

  const hasComponentsLink = filtered
    .slice(insertAt, end)
    .some((line) => line.includes("[Components](components/index.md)"));

  if (!hasComponentsLink) {
    filtered.splice(
      end,
      0,
      "| [Components](components/index.md) | Vue single-file components. |",
    );
  }

  writeFileSync(indexPath, filtered.join("\n"));
}

export function generateVueComponentDocs(
  options: GenerateVueComponentDocsOptions,
): void {
  const { packageDir, packageJson } = options;
  if (!isVuePackage(packageDir, packageJson)) {
    return;
  }

  const tsconfigPath = getVueComponentMetaTsconfig(packageDir);
  if (!tsconfigPath) {
    console.warn("Skipping Vue component docs: no suitable tsconfig found");
    return;
  }

  const componentFiles = discoverVueComponentFiles(packageDir);
  if (!componentFiles.length) {
    return;
  }

  console.log("\nGenerating Vue component docs...");
  const checker = createChecker(tsconfigPath, { schema: true });
  const componentsRefDir = join(packageDir, "docs/ref/components");
  cleanStaleTypedocComponentDirs(componentsRefDir);
  mkdirSync(componentsRefDir, { recursive: true });

  const indexEntries: { name: string; description: string }[] = [];

  for (const componentPath of componentFiles) {
    const componentName = basename(componentPath, ".vue");
    const meta = checker.getComponentMeta(componentPath);
    const sourcePath = relative(packageDir, componentPath);
    const sourceDescription =
      extractComponentDescriptionFromSource(componentPath);
    const markdown = renderComponentMarkdown(
      meta,
      componentName,
      sourcePath,
      sourceDescription,
    );
    const outputPath = join(componentsRefDir, `${componentName}.md`);
    writeFileSync(outputPath, markdown);
    indexEntries.push({
      name: componentName,
      description: meta.description?.trim() || sourceDescription,
    });
    console.log(`- ${sourcePath}`);
  }

  writeFileSync(
    join(componentsRefDir, "index.md"),
    renderComponentsIndex(indexEntries),
  );
}
