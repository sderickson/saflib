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

- Add foo/** and deploy workspaces in package.json
- Run `npm exec prettier -- package.json --write`
- Upsert 380 templates.
- Run `node --experimental-strip-types --disable-warning=ExperimentalWarning workflows/strip-stub-tsconfig-refs.ts foo`
- Upsert 422 templates.
- Upsert 435 templates.
- Rewrite base/dev compose volumes for product monorepo layout
- Run `mv deploy/remote-assets/env.foo.secrets deploy/remote-assets/.env.foo.secrets`
- Change working directory to ../..
- Run `npm exec saf-monorepo -- lock-prune --yes --root .`
- Run `npm install`
- Run `node --experimental-strip-types --disable-warning=ExperimentalWarning saflib/product/workflows/regenerate-product-env.ts saflib/product/foo`
- Change working directory to saflib/product/foo/dev
- Run `touch ./.env`
- Change working directory to ../..
- Run `npm exec saf-imports tsconfig generate -- --write`
- Run `node --experimental-strip-types --disable-warning=ExperimentalWarning workflows/reset-product-db-migrations.ts foo/service/db`
- Change working directory to foo/service/db
- Run `npm run generate`
- Change working directory to ../../../../..
- Run `npm exec saf-monorepo -- lock-prune --yes --root .`
- Run `npm install`
- Run `node --experimental-strip-types --disable-warning=ExperimentalWarning saflib/product/workflows/generate-product-specs.ts saflib/product/foo`
- Change working directory to saflib/product/deploy
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
