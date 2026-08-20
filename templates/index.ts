import path from "node:path";
import { fileURLToPath } from "node:url";

/** Root of the checked-in baseline product (clients, service, deploy, …). */
export const templatesRoot = path.dirname(fileURLToPath(import.meta.url));
