# Application Layers

For most web application features, the implementation is spread across the following types of packages or folders:

- `db`: Database
- `integration`: External API integrations
- `service`: API Servicer
- `spec`: OpenAPI Spec
- `requests`: Tanstack-powered Queries and Mutations
- `pages`: Vue 3 Page Components

## Developing Within Them

Any project that involves adding a new feature will likely have to make changes to areas of the codebase in most of these categories. When building them, focus first on adding to each category separately and then integrating them together. For example:

1. Add to the API spec, generate it
2. Implement a stub endpoint, test it
3. Implement an integration function
4. Implement a database query
5. Finally, use the integration function and/or the database query in the endpoint

Same with frontend:

1. Add a request function, test it
2. Add a static component, test it
3. Integrate the request function and the component
4. Add the component to the page component
