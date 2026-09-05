# saf-docs print

```
Usage: saf-docs print [options] [command]

List all packages in the monorepo.

Options:
  -h, --help                                     display help for command

Commands:
  @__organization-name__/deploy                  Docker compose setup for building and deploying __Organization Name__ products to __domain-name__
  @fixture/npm-script-child                      <Missing description>
  @fixture/npm-script-nested                     <Missing description>
  @fixture/npm-script-root                       <Missing description>
  @fixture/offshoot-spec                         <Missing description>
  @fixture/parent-spec                           <Missing description>
  @fixture/pkg-a                                 <Missing description>
  @fixture/pkg-b                                 <Missing description>
  @fixture/pkg-c                                 <Missing description>
  @fixture/vue-app                               <Missing description>
  @saflib/analytics-http                         In-memory product event ring buffer and Express routes
  @saflib/analytics-sdk                          TanStack Query hooks for product event capture and admin viewing
  @saflib/analytics-service                      Server-side analytics abstraction with in-memory implementation for tests
  @saflib/analytics-spec                         OpenAPI specification for product event capture and admin viewing
  @saflib/analytics-vue                          Client product event logger and admin events page
  @saflib/audit-db                               Append-only hash-chained audit database for SAF products.
  @saflib/audit-http                             Hash-chained audit HTTP recorder and admin list routes
  @saflib/audit-sdk                              TanStack Query hooks for audit log admin browse
  @saflib/audit-spec                             OpenAPI specification for hash-chained audit log admin browse
  @saflib/audit-vue                              Admin audit log browse page
  @saflib/backup-cron                            Cron service for the backup service
  @saflib/backup-http                            HTTP server for the backup service
  @saflib/backup-sdk                             Tanstack queries and shared components for backup service
  @saflib/backup-service-common                  Shared types and utilities for the backup service
  @saflib/backup-spec                            API specs for the backup service
  @saflib/base-__integration-name__-integration  Golden integration stub for Base (expansion via integrations/add-call)
  @saflib/base-__offshoot-name__-db              Offshoot schemas for Base __offshoot-name__; composed into the parent db SQLite
  @saflib/base-__offshoot-name__-http            Offshoot Express router for Base __offshoot-name__; mounted by parent http
  @saflib/base-__offshoot-name__-sdk             Offshoot TanStack fakes for Base __offshoot-name__; woven into parent sdk
  @saflib/base-__offshoot-name__-spec            Offshoot OpenAPI for Base __offshoot-name__; parent spec $refs into this package
  @saflib/base-__offshoot-name__-test            Shared factories for Base __offshoot-name__ models used in unit tests (SPA, HTTP, SDK fakes)
  @saflib/base-__static-subdomain-name__-static  Static __subdomain-name__ site for Base using VitePress + Vuetify
  @saflib/base-__subdomain-name__-spa            <Missing description>
  @saflib/base-account-spa                       <Missing description>
  @saflib/base-admin-spa                         <Missing description>
  @saflib/base-app-spa                           <Missing description>
  @saflib/base-audit                             Audit slice for the base golden product
  @saflib/base-auth-spa                          <Missing description>
  @saflib/base-clients                           Vite setup to build all base clients
  @saflib/base-clients-common                    Shared look-and-feel and utilities for web clients
  @saflib/base-cron                              Cron service for the base product
  @saflib/base-db                                Database package for base.
  @saflib/base-dev                               Docker compose setup for dev environment
  @saflib/base-email                             Email templates for the base product
  @saflib/base-http                              HTTP server for the base service
  @saflib/base-jobs                              Jobs slice for the base golden product
  @saflib/base-kratos-handlers                   Shared Kratos webhook handlers for base (email courier callbacks + action handler)
  @saflib/base-links                             Links for the templates app client
  @saflib/base-monolith                          <Missing description>
  @saflib/base-root-static                       Static root site for Base using VitePress + Vuetify
  @saflib/base-sdk                               Tanstack queries and shared components for base service
  @saflib/base-security                          <Missing description>
  @saflib/base-service-common                    Shared types and utilities for the base service
  @saflib/base-spec                              API specs for the base service
  @saflib/base-test                              Shared factories for core service models used in unit tests (SPA, HTTP, SDK fakes). Offshoot-specific helpers live in each offshoot's *-test package.
  @saflib/commander                              Shared commander utilities for SAF CLI applications
  @saflib/cron-db                                Db and queries for the cron service
  @saflib/cron-http                              Cron service
  @saflib/cron-spec                              Shared OpenAPI specification for the cron service
  @saflib/cron-vue                               Admin frontend for the cron service
  @saflib/dev-site-db                            Database package for dev-site.
  @saflib/dev-site-docker                        Runnable Docker image for dev-site (API + SPA on one port)
  @saflib/dev-site-docker-app                    Vite build target for the shared dev-site Docker image
  @saflib/dev-site-docker-http                   HTTP entrypoint for the shared dev-site Docker image
  @saflib/dev-site-http                          Dev-site orchestration — scan/store/diff static analysis + Express routes + saf-dev-site CLI
  @saflib/dev-site-spec                          API specs for the dev-site service
  @saflib/dev-site-vue                           Vue pages/widgets for browsing static-analysis commit snapshots
  @saflib/dev-tools                              Development utilities for SAF packages
  @saflib/docker                                 Dockerfile generation and build metadata for SAF deployments
  @saflib/docs                                   Documentation generation for SAF packages
  @saflib/drizzle                                Tools, docs, and workflows for using drizzle + better-sqlite3
  @saflib/email-service                          EmailService abstract types, in-memory mock store, and Express mock email routes
  @saflib/email-spec                             Testing endpoint for email sends
  @saflib/email-vue                              Test frontend for the email service
  @saflib/env                                    Specify, share, and enforce environment variables
  @saflib/errors-http                            In-memory reported-error ring buffer and Express error routes
  @saflib/errors-sdk                             TanStack Query hooks for error capture and admin viewing
  @saflib/errors-service                         Server-side error reporting abstraction with in-memory implementation for development and tests
  @saflib/errors-spec                            OpenAPI specification for error capture and admin viewing
  @saflib/errors-vue                             Client error reporting helpers, smoke widgets, and admin Errors page
  @saflib/express                                Shared Express.js utilities for SAF services
  @saflib/git                                    Thin git plumbing wrappers (log / ls-tree / cat-file) — no checkout required
  @saflib/grpc                                   gRPC servicer utilities
  @saflib/imports                                SAF import-graph measurement and enforcement tooling
  @saflib/integrations                           Workflows and templates for initializing third-party integration packages
  @saflib/jobs-db                                Database package for jobs.
  @saflib/jobs-http                              Async jobs runtime, HTTP surfaces, and enqueue client
  @saflib/jobs-spec                              API specs for the jobs service
  @saflib/jobs-vue                               Admin frontend for the jobs service
  @saflib/links                                  Simple library for defining and working with links across subdomains, clients, and services
  @saflib/monorepo                               Library and docs for projects which use the SAF monorepo structure and conventions
  @saflib/node                                   Reusable Node.js utilities
  @saflib/node-log-http                          Development Winston ring buffer and Express routes for log viewing
  @saflib/node-log-sdk                           TanStack Query hooks for development log viewing
  @saflib/node-log-spec                          OpenAPI specification for development log viewing
  @saflib/node-log-vue                           Admin page for viewing development server logs
  @saflib/node-metrics-http                      Prometheus text parsing and Express routes for metrics admin viewing
  @saflib/node-metrics-sdk                       TanStack Query hooks for parsed Prometheus metrics admin viewing
  @saflib/node-metrics-spec                      OpenAPI specification for parsed Prometheus metrics admin viewing
  @saflib/node-metrics-vue                       Admin page for browsing parsed Prometheus metrics
  @saflib/notify                                 In-process change-event pub/sub and SSE stream helpers
  @saflib/object-store                           Object store library for file storage operations
  @saflib/openapi                                Shared dependencies for generating OpenAPI specs in SAF projects
  @saflib/ory-kratos-http                        Dedicated HTTP courier endpoint service for Ory Kratos.
  @saflib/ory-kratos-sdk                         Ory Kratos browser flows, session queries, and MSW fakes (TanStack Query + Frontend API).
  @saflib/ory-kratos-spa                         <Missing description>
  @saflib/parser                                 Syntactic TypeScript helpers — extractExports / extractTestCases / extractDrizzleTables (no type-checker)
  @saflib/playwright                             Playwright testing utilities for SAF applications
  @saflib/processes                              Templates and workflows for building and maintaining SAF projects
  @saflib/product                                Package for product workflows
  @saflib/saflib                                 Full-featured web application framework using my preferred libraries and services.
  @saflib/sdk                                    For creating service-specific SDK packages
  @saflib/secret-store                           Abstract secret store with env-backed implementation and package secrets.json manifests
  @saflib/security                               Playwright security harness and HTTP helpers for SAF product regression suites
  @saflib/service                                Workflows and utilities for bootstrapping and initializing services
  @saflib/templates                              Path helpers for the golden SAF product at saflib/base (and deploy/), used as the copy source for product/init.
  @saflib/utils                                  Utility functions for SAF monorepo
  @saflib/vendors-azure                          Azure Blob Storage-backed ObjectStore adapter
  @saflib/vendors-brevo                          Brevo-backed EmailService adapter and process-level configure helpers
  @saflib/vendors-gcs                            Google Cloud Storage-backed ObjectStore adapter
  @saflib/vendors-infisical                      Infisical-backed SecretStore adapter and process-level configure helpers
  @saflib/vendors-loki                           Winston Loki transport helper for sending logs to a Loki instance
  @saflib/vendors-posthog                        PostHog-backed AnalyticsService adapter and process-level configure helpers
  @saflib/vendors-posthog-client                 Posthog for web clients
  @saflib/vendors-sentry-client                  Sentry Vue/browser adapters for SPA createApp callbacks
  @saflib/vendors-sentry-node                    Sentry Node adapters: service init, Vite source-map upload plugin, and env schema
  @saflib/vite                                   Shared Vite config and plugins for multi-SPA SAF client build packages
  @saflib/vitest                                 Library common testing dependencies and helpers
  @saflib/vue                                    All-in-one set of helper methods and documents for creating Vue SPAs for SAF applications
  @saflib/workflows                              Workflow engine and utilities for SAF
  @saflib/workflows-cli                          Project-specific workflows using @saflib/workflows
  @saflib/xstate                                 Shared logic and workflows for XState
  mini-monorepo                                  <Missing description>
  saflib-workflows                               Workflow engine and utilities for SAF
  template-package                               TODO: Add package description
  template-package-grpc-client                   gRPC client for __service-name__ service
  template-package-grpc-proto                    Protocol buffer definitions and generated code for __service-name__ service
  template-package-grpc-server                   gRPC server for the __service-name__ service
```
