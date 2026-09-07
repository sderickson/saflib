# saf-create

```
Usage: saf-create [options] <name> <domain>

Bootstrap a new SAF monorepo in a git repository (add saflib submodule, then run product/init).

Requires Node.js 26+ (runs TypeScript via --experimental-strip-types).

Arguments:
  name                 Product name in kebab-case (example: my-app)
  domain               Primary domain (example: example.com)

Options:
  --org <name>         npm scope for @org/product packages (default: product name)
  --saflib-ref <ref>   Branch, tag, or commit to check out in saflib (default: main)
  --force              Continue when product/, deploy/, or .github/ already exist
  -h, --help           Show help

Install from GitHub (saflib is a monorepo — use curl, not npx subpaths):

  curl -fsSL https://raw.githubusercontent.com/sderickson/saflib/main/product/create/saf-create.sh -o /tmp/saf-create.sh
  chmod +x /tmp/saf-create.sh
  /tmp/saf-create.sh my-app example.com --saflib-ref main

Pin a branch for both the script sources and the saflib submodule:

  REF=2026-09-02-doc-updates
  curl -fsSL "https://raw.githubusercontent.com/sderickson/saflib/${REF}/product/create/saf-create.sh" -o /tmp/saf-create.sh
  chmod +x /tmp/saf-create.sh
  /tmp/saf-create.sh my-app example.com --saflib-ref "${REF}"

  (--saflib-ref selects the download ref too; set SAFLIB_CREATE_REF when they differ.)

Source: https://github.com/sderickson/saflib/tree/main/product/create
```
