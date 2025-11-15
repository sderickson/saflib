# openapi/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/openapi/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff openapi/init <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **openapi.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/openapi.yaml)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/package.json)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/index.ts)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/tsconfig.json)
  - Upsert **index.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/events/index.yaml)
  - Upsert **login.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/events/login.yaml)
  - Upsert **signup.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/events/signup.yaml)
  - Upsert **signup_view.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/events/signup_view.yaml)
  - Upsert **verify_email.yaml** from [template](https://github.com/sderickson/saflib/blob/main/openapi/workflows/templates/events/verify_email.yaml)
- Change working directory to specs/example
- Run `npm exec saf-specs generate`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff openapi/init <name> <path>

Create an OpenAPI package

Arguments:
  name        The name of the API spec package to create (e.g., 'user-spec' or 'analytics-spec')
              Example: "example-spec"
  path        The path to the target directory for the API spec package (e.g., './specs/example')
              Example: "./specs/example"

```
