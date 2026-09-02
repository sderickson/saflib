# integrations/init

## Source

[init-integration.ts](https://github.com/sderickson/saflib/blob/main/integrations/workflows/init-integration.ts)

## Usage

```bash
npm exec saf-workflow kickoff integrations/init <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

Kicking off workflow integrations/init

- Upsert 11 templates.
- Upsert 12 templates.
- Change working directory to service/integrations/stripe
- Run `touch .env`
- Install the SDK package for the **stripe** integration and declare its secrets.
- Run `npm exec saf-env generate`
- Run `npm install`
- Update **client.ts** to implement the integration client.
- Update **calls/ping.ts** to make a real read-only API call through the scoped client.
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff integrations/init <name>

Initialize a third-party integration from the base stub and weave configure into
   service dependencies

Arguments:
  name        Kebab-case integration name (e.g. 'stripe'). Creates service/integrations/{name} and weaves configure into common/dependencies.
              Example: "stripe"

```
