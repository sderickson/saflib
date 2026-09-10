# saf-workflow source

```
Usage: saf-workflow source [options] [command]

Print the GitHub url for a workflow.

Options:
  -h, --help              display help for command

Commands:
  service/add-store       Add an ObjectStore property to a service-common
                          package's context.
  service/init-common     [deprecated] Create a shared service-common package —
                          prefer product/init
  openapi/init            Scaffold an offshoot OpenAPI package (and sibling test
                          factories package) and weave path $refs into the
                          parent spec
  openapi/schema          Work on an OpenAPI schema
  openapi/route           Work on an OpenAPI route
  openapi/add-event       Add a new event to an existing OpenAPI specification
                          package
  drizzle/update-schema   Update a drizzle/sqlite3 schema.
  drizzle/add-query       Add a new query to a database built off the
                          drizzle-sqlite3 package.
  drizzle/init            Scaffold an offshoot db package and weave its schemas
                          into the parent db (no second monolith)
  express/add-handler     Add a route handler, group router, slim test, and
                          routers.ts mount. Run openapi/route and saf-specs
                          generate first.
  express/init            Scaffold an offshoot Express http package and weave
                          its barrel router into the parent http app
  email/add-template      Add email template infrastructure and templates to a
                          project.
  env/add-var             Add a new environment variable to the schema and
                          generate the corresponding TypeScript types
  monorepo/add-package    Creates a new TypeScript package according to monorepo
                          best practices.
  monorepo/add-export     Add new exports (functions, classes, interfaces) to
                          packages
  commander/add-cli       Create  a new CLI with Commander.js, accessible
                          through npm exec
  commander/add-command   Create a new CLI command and add it to an existing
                          Commander.js CLI
  grpc/init-server        Create a new gRPC service package
  grpc/add-handler        Implement a gRPC handler for a service
  grpc/init-proto         Create a new protocol buffer package
  grpc/add-proto          Add a new RPC to a proto file
  grpc/init-client        Initialize a new gRPC client package
  grpc/add-rpc            Add a new RPC client to a gRPC client package
  cron/init               Ensure the product cron package exists (http/monolith
                          cron wiring ships with product/init)
  cron/add-job            Add a new cron job to the service.
  jobs/init               Ensure the product jobs package exists (http/monolith
                          jobs wiring ships with product/init)
  jobs/add-job            Add a trigger-map edge (and optional cron: key) to the
                          product jobs offshoot
  integrations/add-call   Add a new call to an integration package with
                          implementation, mock, and bin script
  integrations/init       Initialize a third-party integration from the base
                          stub and weave configure into service dependencies
  sentry/init             Wire up Sentry for Vue source maps and Node; align
                          CI/Docker with build secrets
  sdk/init                Scaffold an offshoot SDK package and register it on
                          the parent sdk
  sdk/add-query           Add a new API query to the SDK
  sdk/add-mutation        Add a new API mutation to the SDK
  sdk/add-component       Create a new component in the SDK package
  vue/add-e2e-test        Create a new E2E test in a SAF-powered Vue SPA, using
                          a template and renaming placeholders.
  vue/add-view            Create a new page, dialog, or other view in a
                          SAF-powered Vue SPA, using a template and renaming
                          placeholders.
  vue/add-spa             Create a new SAF-powered frontend SPA using Vue,
                          Vue-Router, and Tanstack Query
  vue/add-static-site     Create a new SAF-powered static website using
                          VitePress and Vuetify
  workflows/add-workflow  Create a new workflow and adds it to the CLI tool.
                          Stops after setup to wait for implementation
                          requirements.
  processes/spec-project  Write a product/technical specification for a project.
  product/init            Create a new product
  help [command]          display help for command
```
