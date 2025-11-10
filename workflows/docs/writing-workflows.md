# Writing Workflows

Best practices notes. In flux.

- Templates
  - Should work
  - Should be structured like the expected structure.
  - Should pass type checks
  - Should include a stub or basic usage.
  - Should include tests.
  - Should be written for a process you've done at least a few times and refined at least somewhat.
  - Should be written while you're doing that process.

- One-off workflows
  - Start by doing test workflows for groups of related workflows, and project workflows for just a single area (like adding a bunch of database tables/queries)
  - Run the workflow with npm exec saf-workflow run-scripts ./path/to/workflow.ts and make sure it runs all the way through, and the generated files are what you expect
  - Prefer grouping workflows, e.g. add a table, then the queries for it, then the next table, then the next queries, etc.
