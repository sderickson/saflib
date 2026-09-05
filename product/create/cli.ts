import { parseArgs } from "node:util";
import { runBootstrap, resolveOrganizationName } from "./bootstrap.ts";
import {
  CREATE_SOURCE_URL,
  DEFAULT_SAFLIB_REF,
  DEFAULT_SAFLIB_REPO,
} from "./constants.ts";
import { MIN_NODE_MAJOR, assertNodeVersion } from "./version.ts";

export { assertNodeVersion };

export function printHelp(): void {
  console.log(`Usage: saf-create [options] <name> <domain>

Bootstrap a new SAF monorepo in a git repository (add saflib submodule, then run product/init).

Requires Node.js ${MIN_NODE_MAJOR}+ (runs TypeScript via --experimental-strip-types).

Arguments:
  name                 Product name in kebab-case (example: my-app)
  domain               Primary domain (example: example.com)

Options:
  --org <name>         npm scope for @org/product packages (default: product name)
  --saflib-repo <url>  Git URL for the saflib submodule (default: ${DEFAULT_SAFLIB_REPO})
  --saflib-ref <ref>   Branch, tag, or commit to check out in saflib (default: ${DEFAULT_SAFLIB_REF})
  --force              Continue when product/, deploy/, or .github/ already exist
  --product-only       Pass --productOnly through to product/init
  -h, --help           Show help

Install from GitHub (saflib is a monorepo — use curl, not npx subpaths):

  curl -fsSL https://raw.githubusercontent.com/sderickson/saflib/main/product/create/saf-create.sh -o /tmp/saf-create.sh
  chmod +x /tmp/saf-create.sh
  /tmp/saf-create.sh my-app example.com --saflib-ref main

Pin a branch for both the script sources and the saflib submodule:

  REF=2026-09-02-doc-updates
  curl -fsSL "https://raw.githubusercontent.com/sderickson/saflib/\${REF}/product/create/saf-create.sh" -o /tmp/saf-create.sh
  chmod +x /tmp/saf-create.sh
  /tmp/saf-create.sh --create-ref "\${REF}" my-app example.com --saflib-ref "\${REF}"

Source: ${CREATE_SOURCE_URL}
`);
}

export function main(argv: string[]): void {
  assertNodeVersion();

  const { values, positionals } = parseArgs({
    args: argv.slice(2),
    options: {
      org: { type: "string" },
      "saflib-repo": { type: "string", default: DEFAULT_SAFLIB_REPO },
      "saflib-ref": { type: "string", default: DEFAULT_SAFLIB_REF },
      force: { type: "boolean", default: false },
      "product-only": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    return;
  }

  const [name, domain] = positionals;
  if (!name || !domain) {
    printHelp();
    process.exit(1);
  }

  try {
    runBootstrap({
      cwd: process.cwd(),
      productName: name,
      domain,
      organizationName: resolveOrganizationName(name, values.org),
      saflibRepo: values["saflib-repo"],
      saflibRef: values["saflib-ref"],
      force: values.force,
      productOnly: values["product-only"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
