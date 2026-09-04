# vue/add-spa

## Source

[add-spa.ts](../../workflows/add-spa.ts)

## Usage

```bash
npm exec saf-workflow kickoff vue/add-spa <productName> <subdomainName>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 40 templates.
- Upsert 41 templates.
- Add admin to CLIENT_SUBDOMAINS in product-name/dev/env.dev
- Add admin to CLIENT_SUBDOMAINS in deploy/env.product-name.prod-local
- Change working directory to product-name/clients/admin
- Run `npm install`
- Change working directory to product-name/clients/build
- Run `npm install @saflib/product-name-admin-spa`
- Change working directory to product-name/clients/build
- Run `npm exec saf-imports tsconfig generate -- --write`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff vue/add-spa <productName> <subdomainName>

Create a new SAF-powered frontend SPA using Vue, Vue-Router, and Tanstack Query

Arguments:
  productName Name of the new or existing product (e.g. 'product-name')
              Example: "product-name"
  subdomainNameName of the new subdomain (e.g. 'admin')
              Example: "admin"

```
