# Writing Spec Project Checklists

This guide explains how to create implementation checklists for the `spec-project` workflow that can be executed by AI agents.

## Checklist Format

Use this exact format for your checklist:

```markdown
# Implementation Checklist: [project-name]

The agent should find the first unchecked workflow, run it, and check it off. Each workflow should be run in the context of the [project-name] project.

To run a workflow with the workflow tool:

- `cd` to the Path to Run In
- run `npm exec saf-workflow kickoff <Workflow Command>`

Then do everything it tells you to.

| Step | Workflow Command                              | Path to Run In      | Status |
| ---- | --------------------------------------------- | ------------------- | ------ |
| 1    | add-workflow custom-workflow-name             | saflib/workflows    | [ ]    |
| 2    | update-schema                                 | dbs/main            | [ ]    |
| 3    | add-queries ./queries/table-name/operation.ts | dbs/main            | [ ]    |
| 4    | custom-workflow-name                          | appropriate/package | [ ]    |
```

## Key Principles

### 1. Use Only Available Workflows

Only use workflows that actually exist. Check the available workflows by running:

```bash
npm exec saf-workflow kickoff help
```

Common available workflows include:

- `add-workflow <name>` - Create new custom workflows
- `update-schema` - Update database schema
- `add-queries <path>` - Add database queries
- `update-spec` - Update OpenAPI specs
- `add-route <path>` - Add Express routes

### 2. Use Relative Paths

Paths should be relative to the main project directory (e.g., `saflib`), not absolute paths:

- ✅ `dbs/main`
- ✅ `saflib/workflows`
- ✅ `services/api`
- ❌ `/Users/username/src/saflib/dbs/main`

### 3. Run Workflows in Correct Package Directories

Each workflow should run in the package directory where it needs to make changes:

- **add-workflow**: Run in `saflib/workflows` (where workflow definitions are stored)
- **update-schema**: Run in `dbs/main` (where schema files are)
- **add-queries**: Run in `dbs/main` (where query files are)
- **update-spec**: Run in `specs/apis` or `specs/rpcs` (where spec files are)
- **add-route**: Run in `services/api` (where route handlers are)

### 4. Be Specific with add-queries

For `add-queries`, specify the exact file path:

- ✅ `add-queries ./queries/scheduled-reports/create.ts`
- ✅ `add-queries ./queries/users/update-profile.ts`
- ❌ `add-queries dbs/main`

### 5. Think Through Database Operations

Consider what database operations your project needs:

- **create.ts** - Creating new records
- **list.ts** - Listing records with filters
- **update.ts** - Updating existing records
- **get-by-id.ts** - Getting specific records
- **delete.ts** - Removing records

### 6. Logical Sequence

Order your workflows logically:

1. **Create custom workflows first** (if needed)
2. **Update database schema** (add tables/fields)
3. **Add database queries** (for new tables)
4. **Update specs** (API/gRPC definitions)
5. **Add handlers/routes** (implementation)
6. **Add state machines** (business logic)

## Example Breakdown

For a project that adds email notifications:

```markdown
| Step | Workflow Command                                    | Path to Run In   | Status |
| ---- | --------------------------------------------------- | ---------------- | ------ |
| 1    | add-workflow update-grpc-spec                       | saflib/workflows | [ ]    |
| 2    | add-workflow add-grpc-handler                       | saflib/workflows | [ ]    |
| 3    | update-schema                                       | dbs/main         | [ ]    |
| 4    | add-queries ./queries/email-notifications/create.ts | dbs/main         | [ ]    |
| 5    | add-queries ./queries/email-notifications/list.ts   | dbs/main         | [ ]    |
| 6    | update-grpc-spec                                    | specs/rpcs       | [ ]    |
| 7    | add-grpc-handler                                    | services/api     | [ ]    |
```

This sequence:

1. Creates custom workflows needed
2. Updates database schema for new email notification features
3. Adds database queries for the new tables
4. Updates gRPC specifications
5. Implements the handlers using the custom workflow

## Common Mistakes to Avoid

1. **Using non-existent workflows** - Always check what workflows are available
2. **Wrong paths** - Make sure workflows run in the correct package directories
3. **Absolute paths** - Use relative paths from the project root
4. **Vague add-queries** - Specify exact file paths, not just directories
5. **Poor sequencing** - Create dependencies before things that use them
6. **Missing database operations** - Think through all CRUD operations needed

## Testing Your Checklist

Before finalizing, verify:

- [ ] All workflow commands exist and are spelled correctly
- [ ] All paths are relative and point to correct package directories
- [ ] Database queries cover all needed operations
- [ ] Sequence makes logical sense (dependencies before dependents)
- [ ] Custom workflows are created before being used
