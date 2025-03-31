# Checklist Generation Guide

## Overview

This guide provides a comprehensive approach to generating feature implementation checklists. A well-structured checklist ensures:

- Consistent implementation quality
- Proper consideration of all architectural layers
- Complete test coverage
- Thorough documentation updates
- Clear review points for team collaboration

## Documentation References

Before creating a checklist, review the [doc-outline.md](./doc-outline.md) to understand all available documentation. Each layer has specific documentation that should be referenced. Examples include, but are not limited to:

### Platform Documentation

- Authentication: [auth-architecture.md](../auth-service/docs/auth-architecture.md)
- Database: [schema.md](../drizzle-sqlite3/docs/02-schema.md)
- API: [adding-routes.md](../node-express/docs/02-adding-routes.md)
- Frontend: [forms.md](../vue-spa/docs/05-forms.md)

### Development Documentation

- Vue Component Testing: [component-testing.md](../vue-spa-dev/docs/component-testing.md)
- Tanstack Query Testing: [query-testing.md](../vue-spa-dev/docs/query-testing.md)
- API Route Testing: [testing-middleware.md](../node-express-dev/docs/01-test-routes.md)

## Checklist Structure

Every feature checklist should follow this basic structure:

### Planning Phase

- [ ] Set up a new branch in the monorepo

  - [ ] Checkout the `main` branch
  - [ ] Pull the latest changes
  - [ ] Create a new branch with the current date and feature name

- [ ] Write specification
  - [ ] Make a copy of the feature-spec-template.md
  - [ ] Fill in each section
- [ ] **Review Point**

- [ ] Update checklist
  - [ ] Update checkbox contents based on spec
  - [ ] Break down complex tasks into subtasks
- [ ] **Review Point**

- [ ] Add Documentation to plan
  - [ ] Review relevant docs from [doc-outline.md](./doc-outline.md)
  - [ ] Note any missing platform documentation needs
  - [ ] **Review Point**

### Implementation Phase

Implementation tasks should be organized by architectural layer, starting from the smallest level and integrating up. Each layer should include:

1. Implementation tasks
2. Testing tasks
3. Documentation updates
4. Review points

### Testing Phase

- [ ] Test end-to-end

  - [ ] Create production docker images
  - [ ] Run existing e2e tests
  - [ ] Create new e2e tests
  - [ ] **Review Point**

- [ ] Make sure everything still works
  - [ ] Run `npm run test`
  - [ ] Run `npm run lint`
  - [ ] Run `npm run format`
  - [ ] **Review Point**

### Final Documentation Review

- [ ] Review all documentation changes
  - [ ] Check platform changes in relevant docs from [doc-outline.md](./doc-outline.md)
  - [ ] Check product changes
  - [ ] Verify documentation matches implementation
  - [ ] **Review Point**

## Implementation Order and Layers

Features should be implemented following this layer order:

1. **API Spec Layer**

   - Update OpenAPI specifications
   - Generate updated types
   - Reference: [update-spec.md](../openapi-specs/docs/03-updates.md)

2. **Database Layer**

   - Schema changes
   - Query implementations
   - Reference: [schema.md](../drizzle-sqlite3/docs/02-schema.md)

3. **API Layer**

   - Endpoint implementations
   - Middleware updates
   - Reference: [adding-routes.md](../node-express/docs/02-adding-routes.md)

4. **Frontend Layer**
   - TanStack Query implementations
   - Component implementations
   - Page implementations
   - References:
     - [using-queries.md](../vue-spa/docs/04-using-queries.md)
     - [forms.md](../vue-spa/docs/05-forms.md
     - [writing-components.md](../vue-spa/docs/02-writing-components.md)

## Layer-Specific Guidelines

### API Spec Layer

- Always start with API spec updates
- Include request/response types
- Document error cases
- Generate and verify types
- Testing: Verify type generation
- Documentation: [updates.md](../openapi-specs/docs/03-updates.md)

### Database Layer

- Review existing schema
- Add necessary indexes
- Implement queries
- Testing: Unit tests for queries
- Documentation: [schema.md](../drizzle-sqlite3/docs/02-schema.md)

### API Layer

- Implement endpoints
- Add middleware if needed
- Add logging
- Testing: Middleware and endpoint tests
- Documentation: [testing-middleware.md](../node-express-dev/docs/03-test-middleware.md)

### Frontend Layer

1. TanStack Query Layer

   - Implement queries/mutations
   - Add error handling
   - Testing: [query-testing.md](../vue-spa-dev/docs/query-testing.md)

2. Component Layer

   - Implement base components
   - Add form validation
   - Testing: [component-testing.md](../vue-spa-dev/docs/component-testing.md)

3. Page Layer
   - Implement page components
   - Add loading states
   - Testing: [component-testing.md](../vue-spa-dev/docs/component-testing.md)

## Common Pitfalls to Avoid

1. **Missing Layers**

   - Don't skip the API spec layer
   - Don't implement frontend before backend
   - Don't implement components before queries

2. **Incomplete Testing**

   - Each layer needs its own tests
   - Include both unit and integration tests
   - Don't forget e2e tests

3. **Documentation Gaps**

   - Update all relevant documentation from [doc-outline.md](./doc-outline.md)
   - Include both platform and product docs
   - Document breaking changes

4. **Review Points**
   - Add review points after each major task
   - Include specific review criteria
   - Don't skip review points

## Example Checklist

Here's an example of a properly structured checklist for a simple feature:

```markdown
# Example Feature Checklist

### Planning Phase

[Standard planning tasks...]

### Implementation Phase

## API Spec Layer

- [ ] Update OpenAPI Specification
  - [ ] Review [update-spec.md](../openapi-specs/docs/03-updates.md)
  - [ ] Add new endpoint spec
  - [ ] Generate types
  - [ ] **Review Point**

## Database Layer

- [ ] Implement Schema Changes
  - [ ] Review [schema.md](../drizzle-sqlite3/docs/02-schema.md)
  - [ ] Add new table
  - [ ] Add indexes
  - [ ] **Review Point**

## API Layer

- [ ] Implement Endpoint
  - [ ] Review [adding-routes.md](../node-express/docs/02-adding-routes.md)
  - [ ] Add route
  - [ ] Add middleware
  - [ ] Add tests using [testing-middleware.md](../node-express-dev/docs/03-test-middleware.md)
  - [ ] **Review Point**

## Frontend Layer

- [ ] Add API Integration

  - [ ] Review [using-queries.md](../vue-spa/docs/04-using-queries.md)
  - [ ] Add query
  - [ ] Add tests using [query-testing.md](../vue-spa-dev/docs/query-testing.md)
  - [ ] **Review Point**

- [ ] Implement Component
  - [ ] Review [forms.md](../vue-spa/docs/05-forms.md)
  - [ ] Add form
  - [ ] Add validation
  - [ ] Add tests using [component-testing.md](../vue-spa-dev/docs/component-testing.md)
  - [ ] **Review Point**

### Testing Phase

[Standard testing tasks...]

### Final Documentation Review

- [ ] Review all documentation changes
  - [ ] Check platform changes in relevant docs from [doc-outline.md](./doc-outline.md)
  - [ ] Check product changes
  - [ ] Verify documentation matches implementation
  - [ ] **Review Point**
```
