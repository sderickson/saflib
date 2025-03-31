# Checklist Generation Guide

## Overview

This guide provides a comprehensive approach to generating feature implementation checklists. A well-structured checklist ensures:

- Consistent implementation quality
- Proper consideration of all architectural layers
- Complete test coverage
- Thorough documentation updates
- Clear review points for team collaboration

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
  - [ ] Review relevant docs from /saflib
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
  - [ ] Check platform changes
  - [ ] Check product changes
  - [ ] Verify documentation matches implementation
  - [ ] **Review Point**

## Implementation Order and Layers

Features should be implemented following this layer order:

1. **API Spec Layer**

   - Update OpenAPI specifications
   - Generate updated types
   - Reference: /saflib/openapi-specs/docs/update-spec.md

2. **Database Layer**

   - Schema changes
   - Query implementations
   - Reference: /saflib/drizzle-sqlite3/docs/schema.md

3. **API Layer**

   - Endpoint implementations
   - Middleware updates
   - Reference: /saflib/node-express/docs/adding-routes.md

4. **Frontend Layer**
   - TanStack Query implementations
   - Component implementations
   - Page implementations
   - References:
     - /saflib/vue-spa/docs/using-queries.md
     - /saflib/vue-spa/docs/forms.md
     - /saflib/vue-spa/docs/writing-components.md

## Layer-Specific Guidelines

### API Spec Layer

- Always start with API spec updates
- Include request/response types
- Document error cases
- Generate and verify types
- Testing: Verify type generation

### Database Layer

- Review existing schema
- Add necessary indexes
- Implement queries
- Testing: Unit tests for queries

### API Layer

- Implement endpoints
- Add middleware if needed
- Add logging
- Testing: Middleware and endpoint tests

### Frontend Layer

1. TanStack Query Layer

   - Implement queries/mutations
   - Add error handling
   - Testing: Query tests

2. Component Layer

   - Implement base components
   - Add form validation
   - Testing: Component tests

3. Page Layer
   - Implement page components
   - Add loading states
   - Testing: Page-level tests

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

   - Update all relevant documentation
   - Include both platform and product docs

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
  - [ ] Add new endpoint spec
  - [ ] Generate types
  - [ ] **Review Point**

## Database Layer

- [ ] Implement Schema Changes
  - [ ] Add new table
  - [ ] Add indexes
  - [ ] **Review Point**

## API Layer

- [ ] Implement Endpoint
  - [ ] Add route
  - [ ] Add middleware
  - [ ] Add tests
  - [ ] **Review Point**

## Frontend Layer

- [ ] Add API Integration

  - [ ] Add query
  - [ ] Add tests
  - [ ] **Review Point**

- [ ] Implement Component
  - [ ] Add form
  - [ ] Add validation
  - [ ] Add tests
  - [ ] **Review Point**

### Testing Phase

[Standard testing tasks...]

### Final Documentation Review

[Standard documentation review tasks...]
```
