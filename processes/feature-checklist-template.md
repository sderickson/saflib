# Writing Feature Checklists

This is a template for adding features. Whenever a new feature is added, follow this checklist.

### Planning Phase

- [ ] Set up a new branch in the monorepo
  - [ ] Checkout the `main` branch
  - [ ] Pull the latest changes
  - [ ] Create a new branch with the current date and the name of the feature, e.g. `2025-03-23-auth-library`

- [ ] Write specification
  - [ ] Make a copy of the [./feature-spec-template.md](./feature-spec-template.md) document, put it in `/notes/<branch-name>/spec.md`
  - [ ] Fill in each section
- [ ] **Review Point**

- [ ] Update checklist
  - [ ] Update the checkbox contents for what is necessary for this feature based on the spec
  - [ ] Break down complex tasks into smaller, manageable subtasks
- [ ] **Review Point**

- [ ] Add Documentation to plan
  - [ ] Review what `.md` files are in /saflib
  - [ ] Add any that are relevant to the implementation. Docs should be reviewed before implementation.
  - [ ] Note any missing platform documentation needs. If there are gaps, add a TODO to create a doc in an appropraite `/saflib/\*/docs` folder after implementation. Even for existing docs, have a checkbox for making any necessary updates if guidance was required.
  - [ ] **Review Point**

### Implementation Phase

Each implementation section should follow this pattern:

```markdown
## {Component} Layer

- [ ] Implementation Task
  - [ ] Write tests
  - [ ] Implement feature
  - [ ] Run tests
  - [ ] Verify package exports
    - [ ] Check index.ts exports all new types, functions, and errors
    - [ ] Verify exports are properly typed
  - [ ] Update/add docs
  - [ ] **Review Point**
```

For example:

```markdown
## Database Layer

- [ ] Implement Schema Changes
  - [ ] Review [schema.md](/saflib/drizzle-sqlite3/docs/schema.md)
  - [ ] Add table definitions
  - [ ] Generate migrations
  - [ ] Update schema.md if needed
  - [ ] **Review Point**
```

Start at the lowest level and work your way up. For example, have one task for the database layer, one to create a stub API layer, and one to integrate the two.

### Testing Phase

- [ ] Test end-to-end
  - [ ] Create production docker images by running `npm run build` from `/deploy/prod`
  - [ ] Run `npm run test` in /tests/e2e and make sure existing tests still pass
  - [ ] Create test in /tests/e2e/specs for new user flow happy path
  - [ ] Run to make sure it works
  - [ ] **Review Point**

- [ ] Make sure everything still works
  - [ ] Run `npm run test`
  - [ ] Run `npm run lint`
  - [ ] Run `npm run format`
  - [ ] **Review Point**

### Final Documentation Review

- [ ] Review all documentation changes
  - [ ] Check that all platform changes are documented
  - [ ] Check that all product changes are documented
  - [ ] Verify documentation matches implementation
  - [ ] Check for any missing documentation that should be created
  - [ ] **Review Point**
