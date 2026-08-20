/**
 * Assert Phase 1 vertical-slice scaffolds exist under a product/init copy.
 * Usage: node assert-phase1-scaffold.ts <productName>
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const saflibRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const product = process.argv[2];
if (!product) {
  console.error("Usage: assert-phase1-scaffold.ts <productName>");
  process.exit(1);
}

const root = path.join(saflibRoot, product);
const required = [
  "service/spec/schemas/todo.yaml",
  "service/spec/routes/todo/list.yaml",
  "service/db/schemas/todo.ts",
  "service/db/queries/todo/list.ts",
  "service/http/handlers/todo/list.ts",
  "service/http/handlers/todo/index.ts",
  "service/sdk/requests/todo/list.ts",
  "service/sdk/requests/todo/create.ts",
  "clients/app/pages/todos-list/TodosList.vue",
  "clients/app/pages/todos-list/TodosListAsync.vue",
];

const missing = required.filter((rel) => !existsSync(path.join(root, rel)));
if (missing.length > 0) {
  console.error(
    `Phase 1 scaffold missing under ${product}/:\n${missing.map((m) => `  - ${m}`).join("\n")}`,
  );
  process.exit(1);
}

console.log(`Phase 1 scaffold OK under ${product}/ (${required.length} paths)`);
