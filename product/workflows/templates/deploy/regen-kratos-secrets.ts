import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomFillSync } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

function randomSecret24B64(): string {
  const buf = Buffer.allocUnsafe(24);
  randomFillSync(buf);
  return buf.toString("base64");
}

const outPath = join(__dirname, "remote-assets", ".env.kratos.secrets");

const content = `# Kratos secrets for prod-local (these override the secrets: block in kratos.yml)
SECRETS_COOKIE=${randomSecret24B64()}
SECRETS_CIPHER=${randomSecret24B64()}
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, content, "utf8");
console.log(`Wrote ${outPath}`);
