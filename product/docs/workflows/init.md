# product/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/product/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff product/init <name> <domain> [--productOnly]
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Add foo/** to workspaces in package.json
- Run `npm exec prettier -- package.json --write`
- Upsert 379 templates.
- Run `node --experimental-strip-types --disable-warning=ExperimentalWarning /Users/scotterickson/src/saf-2025/saflib/product/workflows/strip-stub-tsconfig-refs.ts /Users/scotterickson/src/saf-2025/saflib/product/foo`
- Upsert 419 templates.
- Upsert 425 templates.
- Rewrite base/dev compose volumes for product monorepo layout
- Run `mv /Users/scotterickson/src/saf-2025/saflib/product/deploy/remote-assets/env.foo.secrets /Users/scotterickson/src/saf-2025/saflib/product/deploy/remote-assets/.env.foo.secrets`
- Change working directory to ../..
- Run `npm install`
- Run `node --experimental-strip-types --disable-warning=ExperimentalWarning /Users/scotterickson/src/saf-2025/saflib/product/workflows/regenerate-product-env.ts /Users/scotterickson/src/saf-2025/saflib/product/foo`
- Change working directory to foo/dev
- Run `touch ./.env`
- Change working directory to
- Run `npm exec saf-imports tsconfig generate -- --write`
- Run `node --experimental-strip-types --disable-warning=ExperimentalWarning /Users/scotterickson/src/saf-2025/saflib/product/workflows/reset-product-db-migrations.ts /Users/scotterickson/src/saf-2025/saflib/product/foo/service/db`
- Change working directory to foo/service/db
- Run `npm run generate`
- Change working directory to
- Run `node --experimental-strip-types --disable-warning=ExperimentalWarning /Users/scotterickson/src/saf-2025/saflib/product/workflows/generate-product-specs.ts /Users/scotterickson/src/saf-2025/saflib/product/foo`
- Change working directory to deploy
- Run `npm run regen-kratos-secrets`
- Run `npm run generate`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff product/init <name> <domain> [--productOnly]

Create a new product

Arguments:
  name        Name of the new product
              Example: "foo"
  domain      Domain of the new product
              Example: "example.com"
  productOnly Copy only the golden product tree (skip deploy/scaffold/kratos). Used by CI smoke tests. (optional flag)

```
