[**@saflib/express**](../../index.md)

***

# Function: createScopeValidator()

> **createScopeValidator**(): `Handler`

Creates middleware that validates user scopes against OpenAPI security requirements.
Expects the auth middleware to have run first so safContext is provided.
Throws 403 if user doesn't have required scopes.

## Returns

`Handler`
