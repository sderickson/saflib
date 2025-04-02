# Feature Specification Template

To get started:

1. Create a folder in `/notes` with the name of the feature, prefixed with the date, e.g. `2025-03-23-add-auth-scopes`. Use the `/notes` folder in the _root_ of the repo, not in the `saflib` folder.
2. Make a copy of this file in that folder, call it `spec.md`
3. Remove this "To get started" section, fill in "## Overview" onwards.

## Overview

[Provide a brief description of the feature, its purpose, and how it fits into the overall product. Include the main goals and objectives of this feature.]

## Files to Modify

List only the files or folders that will definitely need changes. Organize them by layer:

### API Specification

- [path/to/file] - Brief description of changes needed

### Backend

- [path/to/file] - Brief description of changes needed

### Frontend

- [path/to/file] - Brief description of changes needed

## User Stories

[List the user stories that this feature addresses. Format them as "As a [type of user], I want [goal] so that [benefit]."]

- As a [user type], I want [action/goal] so that [benefit/value].
- As a [user type], I want [action/goal] so that [benefit/value].
- ...

## Technical Requirements

### Database Schema Updates

[Only if schema changes are needed. If not, remove this section.]

### API Endpoints

[List the API endpoints that need to be created or modified. Include only essential details.]

1. [HTTP Method] [Path]

   - Purpose: [brief description]
   - Request parameters: [list parameters]
   - Request body: [describe structure]
   - Response: [describe structure]
   - Error responses: [list possible errors]
   - Authorization requirements: [describe who can access]

2. ...

### Frontend SPA

[Describe which SPA this feature will make changes to. If a new SPA is needed, name it and describe why here.]

### Frontend Pages

[Describe the frontend pages that need to be created or modified. Focus on essential functionality.]

1. [Page Name]
   - Purpose: [brief description]
   - Key features: [list essential features]
   - User interactions: [describe essential interactions]

## Implementation Considerations

[List any important considerations, constraints, or challenges that should be kept in mind during implementation.]

- Security considerations
- Performance considerations
- Accessibility requirements
- ...

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

## File Linking Guidelines

When referencing files in the specification:

1. Only list files that will definitely need changes
2. Use absolute paths from the repository root, e.g. `/saflib/auth-service/routes/auth.ts`
3. Use markdown links with descriptive text, e.g. `[auth.ts](/saflib/auth-service/routes/auth.ts)`
4. Group files by architectural layer (API Spec, Backend, Frontend)
5. Include any new files that need to be created
6. Note any files that need to be deleted
