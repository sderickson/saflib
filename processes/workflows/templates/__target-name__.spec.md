# Feature Specification Template

## Overview

[Provide a brief description of the feature, its purpose, and how it fits into the overall product. Include the main goals and objectives of this feature.]

## User Stories

[List the user stories that this feature addresses. Format them as "As a [type of user], I want [goal] so that [benefit]."]

- As a [user type], I want [action/goal] so that [benefit/value].
- As a [user type], I want [action/goal] so that [benefit/value].
- ...

## Packages to Modify

- [package directory, e.g. `/saflib/auth-service`]: (describe what needs to be done)

## Database Schema Updates

[Only if schema changes are needed. If not, remove this section. For the sake of simplicity in database queries and http routes, erron the side of grouping data (using json fields) rather than having every table consist only of primitive data types. If the product might need things normalized later, ask the person for clarification to make the right decision. Also, table names are singular, not plural.]

## Business Objects

[List any new objects which need to be added to API routes. These are separate from the database schema, as these are the contract between frontend and backend. While the objects themselves may have nested data (such as for compound data like addresses), different business objects should not be nested, and instead have id references to one another. See (productName)/service/spec/schemas for existing business objects that may be reused.]

1. [Business Object Name]
   - Description: [description]
   - Properties: [list properties]

## API Endpoints

[List the API endpoints that need to be created or modified. Include only essential details. See (productName)/service/spec/routes for existing routes.]

1. [HTTP Method] [Path]
   - Purpose: [brief description]
   - Request parameters: [list parameters]
   - Request body: [describe structure, may include business object values]
   - Response: [describe structure, should generally be a business object, or an object with business object values, or business object array values]
   - Error responses: [list possible errors]
   - Authorization requirements: [describe who can access]

2. ...

## Frontend Pages

[Describe the frontend pages that need to be created or modified. Focus on essential functionality.]

1. [Page Name]
   - Purpose: [brief description]
   - Key features: [list essential features]
   - User interactions: [describe essential interactions]

## Future Enhancements / Out of Scope

[List potential future enhancements or extensions to this feature that are out of scope for the current implementation.]

- [Future enhancement 1]
- [Future enhancement 2]
- ...

## Questions and Clarifications

[List any questions or areas that need clarification before or during implementation.]

- [Question 1]
- [Question 2]
- ...
