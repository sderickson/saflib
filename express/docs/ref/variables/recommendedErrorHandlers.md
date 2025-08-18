[**@saflib/express**](../index.md)

***

# Variable: recommendedErrorHandlers

> `const` **recommendedErrorHandlers**: (`Handler` \| (`err`, `_req`, `res`, `_`) => `void`)[]

Recommended error handling middleware stack.
Should be used after all routes.
Includes:
1. 404 handler for undefined routes
2. Error handler for all other errors
