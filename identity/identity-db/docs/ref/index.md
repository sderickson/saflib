**@saflib/identity-db**

***

# @saflib/identity-db

## Classes

| Class | Description |
| ------ | ------ |
| [EmailAuthNotFoundError](classes/EmailAuthNotFoundError.md) | - |
| [EmailConflictError](classes/EmailConflictError.md) | - |
| [EmailTakenError](classes/EmailTakenError.md) | - |
| [IdentityDatabaseError](classes/IdentityDatabaseError.md) | - |
| [TokenNotFoundError](classes/TokenNotFoundError.md) | - |
| [UserNotFoundError](classes/UserNotFoundError.md) | - |
| [VerificationTokenNotFoundError](classes/VerificationTokenNotFoundError.md) | - |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [NewEmailAuth](type-aliases/NewEmailAuth.md) | - |
| [NewUser](type-aliases/NewUser.md) | - |
| [SelectEmailAuth](type-aliases/SelectEmailAuth.md) | - |
| [UpdateEmailParams](type-aliases/UpdateEmailParams.md) | - |
| [UpdateEmailResult](type-aliases/UpdateEmailResult.md) | - |
| [UpdateProfileParams](type-aliases/UpdateProfileParams.md) | - |
| [User](type-aliases/User.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [emailAuthDb](variables/emailAuthDb.md) | Database queries for the email_auth table. The email_auth table contains email authentication information for the users. |
| [identityDb](variables/identityDb.md) | For managing connections to the identity database. |
| [usersDb](variables/usersDb.md) | Database queries for the users table. The users table contains profile information about the users, similar to the OIDC Standard Claims. |
