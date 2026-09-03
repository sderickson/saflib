# vue/add-static-site

## Source

[add-static-site.ts](https://github.com/sderickson/saflib/blob/main/vue/workflows/add-static-site.ts)

## Usage

```bash
npm exec saf-workflow kickoff vue/add-static-site <productName> <subdomainName>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 13 templates.
- Upsert 14 templates.
- Upsert 16 templates.
- Change working directory to product-name/clients/docs
- Run `npm install`
- Change working directory to product-name/clients/docs
- Run `npm exec saf-imports tsconfig generate -- --write`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff vue/add-static-site <productName> <subdomainName>

Create a new SAF-powered static website using VitePress and Vuetify

Arguments:
  productName Name of the new or existing product (e.g. 'product-name')
              Example: "product-name"
  subdomainNameName of the new subdomain for the static site (e.g. 'docs')
              Example: "docs"

```
