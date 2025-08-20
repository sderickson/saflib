[**@saflib/identity-spec**](../index.md)

***

# Interface: operations

## Properties

### forgotPassword

> **forgotPassword**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody

> **requestBody**: `object`

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/json

> **application/json**: `object`

##### requestBody.content.application/json.email

> **email**: `string`

Format: email

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

If the user exists, a recovery email was sent

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.message

> **message**: `string`

###### Description

A generic message indicating that if the user exists, a recovery email was sent

##### responses.200.content.application/json.success

> **success**: `boolean`

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.400

> **400**: `object`

###### Description

Invalid email format

##### responses.400.content

> **content**: `object`

##### responses.400.content.application/json

> **application/json**: `object`

##### responses.400.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.400.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.400.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### getUserProfile

> **getUserProfile**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody?

> `optional` **requestBody**: `undefined`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

User profile retrieved successfully

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.createdAt?

> `optional` **createdAt**: `string`

Format: date-time

###### Description

Date and time the user was created

##### responses.200.content.application/json.email?

> `optional` **email**: `string`

Format: email

##### responses.200.content.application/json.emailVerified?

> `optional` **emailVerified**: `boolean`

###### Description

Whether the user's email address has been verified

##### responses.200.content.application/json.familyName?

> `optional` **familyName**: `string`

###### Description

User's family name (optional)

##### responses.200.content.application/json.givenName?

> `optional` **givenName**: `string`

###### Description

User's given name (optional)

##### responses.200.content.application/json.id?

> `optional` **id**: `number`

##### responses.200.content.application/json.lastLoginAt?

> `optional` **lastLoginAt**: `string`

Format: date-time

###### Description

Date and time the user last logged in

##### responses.200.content.application/json.name?

> `optional` **name**: `string`

###### Description

User's full name (optional)

##### responses.200.content.application/json.scopes?

> `optional` **scopes**: `string`[]

###### Description

List of user's permission scopes

##### responses.200.content.application/json.verifiedAt?

> `optional` **verifiedAt**: `string`

Format: date-time

###### Description

Date and time the user's email was verified

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### listSentEmails

> **listSentEmails**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `object`

##### parameters.query.userEmail?

> `optional` **userEmail**: `string`

###### Description

The email address of the user to get sent emails to or from

#### requestBody?

> `optional` **requestBody**: `undefined`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

A list of sent emails.

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`[]

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.403

> **403**: `object`

###### Description

Forbidden - server is not mocking email sends

##### responses.403.content

> **content**: `object`

##### responses.403.content.application/json

> **application/json**: `object`

##### responses.403.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.403.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.403.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### listUsers

> **listUsers**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody?

> `optional` **requestBody**: `undefined`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

A list of user objects

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`[]

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.401

> **401**: `object`

###### Description

Unauthorized - missing or invalid auth headers, or not logged in.

##### responses.401.content

> **content**: `object`

##### responses.401.content.application/json

> **application/json**: `object`

##### responses.401.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.401.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.401.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.403

> **403**: `object`

###### Description

Forbidden - user does not have admin privileges.

##### responses.403.content

> **content**: `object`

##### responses.403.content.application/json

> **application/json**: `object`

##### responses.403.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.403.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.403.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### loginUser

> **loginUser**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody

> **requestBody**: `object`

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/json

> **application/json**: `object`

##### requestBody.content.application/json.email

> **email**: `string`

Format: email

##### requestBody.content.application/json.password

> **password**: `string`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Successful login

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.createdAt?

> `optional` **createdAt**: `string`

Format: date-time

###### Description

Date and time the user was created

##### responses.200.content.application/json.email?

> `optional` **email**: `string`

Format: email

##### responses.200.content.application/json.emailVerified?

> `optional` **emailVerified**: `boolean`

###### Description

Whether the user's email address has been verified

##### responses.200.content.application/json.familyName?

> `optional` **familyName**: `string`

###### Description

User's family name (optional)

##### responses.200.content.application/json.givenName?

> `optional` **givenName**: `string`

###### Description

User's given name (optional)

##### responses.200.content.application/json.id?

> `optional` **id**: `number`

##### responses.200.content.application/json.lastLoginAt?

> `optional` **lastLoginAt**: `string`

Format: date-time

###### Description

Date and time the user last logged in

##### responses.200.content.application/json.name?

> `optional` **name**: `string`

###### Description

User's full name (optional)

##### responses.200.content.application/json.scopes?

> `optional` **scopes**: `string`[]

###### Description

List of user's permission scopes

##### responses.200.content.application/json.verifiedAt?

> `optional` **verifiedAt**: `string`

Format: date-time

###### Description

Date and time the user's email was verified

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.401

> **401**: `object`

###### Description

Invalid credentials

##### responses.401.content

> **content**: `object`

##### responses.401.content.application/json

> **application/json**: `object`

##### responses.401.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.401.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.401.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### logoutUser

> **logoutUser**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody?

> `optional` **requestBody**: `undefined`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Successful logout

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `Record`\<`string`, `never`\>

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### registerUser

> **registerUser**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody

> **requestBody**: `object`

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/json

> **application/json**: `object`

##### requestBody.content.application/json.email

> **email**: `string`

Format: email

##### requestBody.content.application/json.familyName?

> `optional` **familyName**: `string`

###### Description

User's family name (optional)

##### requestBody.content.application/json.givenName?

> `optional` **givenName**: `string`

###### Description

User's given name (optional)

##### requestBody.content.application/json.name?

> `optional` **name**: `string`

###### Description

User's full name (optional)

##### requestBody.content.application/json.password

> **password**: `string`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

User registered successfully

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.createdAt?

> `optional` **createdAt**: `string`

Format: date-time

###### Description

Date and time the user was created

##### responses.200.content.application/json.email?

> `optional` **email**: `string`

Format: email

##### responses.200.content.application/json.emailVerified?

> `optional` **emailVerified**: `boolean`

###### Description

Whether the user's email address has been verified

##### responses.200.content.application/json.familyName?

> `optional` **familyName**: `string`

###### Description

User's family name (optional)

##### responses.200.content.application/json.givenName?

> `optional` **givenName**: `string`

###### Description

User's given name (optional)

##### responses.200.content.application/json.id?

> `optional` **id**: `number`

##### responses.200.content.application/json.lastLoginAt?

> `optional` **lastLoginAt**: `string`

Format: date-time

###### Description

Date and time the user last logged in

##### responses.200.content.application/json.name?

> `optional` **name**: `string`

###### Description

User's full name (optional)

##### responses.200.content.application/json.scopes?

> `optional` **scopes**: `string`[]

###### Description

List of user's permission scopes

##### responses.200.content.application/json.verifiedAt?

> `optional` **verifiedAt**: `string`

Format: date-time

###### Description

Date and time the user's email was verified

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.409

> **409**: `object`

###### Description

Email already exists

##### responses.409.content

> **content**: `object`

##### responses.409.content.application/json

> **application/json**: `object`

##### responses.409.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.409.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.409.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### resendVerification

> **resendVerification**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody?

> `optional` **requestBody**: `undefined`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Verification email sent successfully

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.message

> **message**: `string`

###### Description

A generic message indicating that the verification email was sent

##### responses.200.content.application/json.success

> **success**: `boolean`

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.401

> **401**: `object`

###### Description

User not logged in

##### responses.401.content

> **content**: `object`

##### responses.401.content.application/json

> **application/json**: `object`

##### responses.401.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.401.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.401.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### resetPassword

> **resetPassword**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody

> **requestBody**: `object`

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/json

> **application/json**: `object`

##### requestBody.content.application/json.newPassword

> **newPassword**: `string`

###### Description

The new password to set

##### requestBody.content.application/json.token

> **token**: `string`

###### Description

The temporary password token received via email

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Password successfully reset

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.success

> **success**: `boolean`

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.400

> **400**: `object`

###### Description

Invalid token or password

##### responses.400.content

> **content**: `object`

##### responses.400.content.application/json

> **application/json**: `object`

##### responses.400.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.400.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.400.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### setPassword

> **setPassword**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody

> **requestBody**: `object`

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/json

> **application/json**: `object`

##### requestBody.content.application/json.currentPassword

> **currentPassword**: `string`

###### Description

The user's current password for verification

##### requestBody.content.application/json.newPassword

> **newPassword**: `string`

###### Description

The new password to set

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Password changed successfully

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.success

> **success**: `boolean`

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.401

> **401**: `object`

###### Description

User not logged in or invalid current password

##### responses.401.content

> **content**: `object`

##### responses.401.content.application/json

> **application/json**: `object`

##### responses.401.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.401.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.401.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### updateUserProfile

> **updateUserProfile**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody

> **requestBody**: `object`

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/json

> **application/json**: `object`

##### requestBody.content.application/json.email?

> `optional` **email**: `string`

Format: email

###### Description

User's email address

##### requestBody.content.application/json.emailVerified?

> `optional` **emailVerified**: `boolean`

###### Description

Whether the user's email address has been verified

##### requestBody.content.application/json.familyName?

> `optional` **familyName**: `null` \| `string`

###### Description

User's family name (last name)

##### requestBody.content.application/json.givenName?

> `optional` **givenName**: `null` \| `string`

###### Description

User's given name (first name)

##### requestBody.content.application/json.name?

> `optional` **name**: `null` \| `string`

###### Description

User's full name

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

User profile updated successfully

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.createdAt?

> `optional` **createdAt**: `string`

Format: date-time

###### Description

Date and time the user was created

##### responses.200.content.application/json.email?

> `optional` **email**: `string`

Format: email

##### responses.200.content.application/json.emailVerified?

> `optional` **emailVerified**: `boolean`

###### Description

Whether the user's email address has been verified

##### responses.200.content.application/json.familyName?

> `optional` **familyName**: `string`

###### Description

User's family name (optional)

##### responses.200.content.application/json.givenName?

> `optional` **givenName**: `string`

###### Description

User's given name (optional)

##### responses.200.content.application/json.id?

> `optional` **id**: `number`

##### responses.200.content.application/json.lastLoginAt?

> `optional` **lastLoginAt**: `string`

Format: date-time

###### Description

Date and time the user last logged in

##### responses.200.content.application/json.name?

> `optional` **name**: `string`

###### Description

User's full name (optional)

##### responses.200.content.application/json.scopes?

> `optional` **scopes**: `string`[]

###### Description

List of user's permission scopes

##### responses.200.content.application/json.verifiedAt?

> `optional` **verifiedAt**: `string`

Format: date-time

###### Description

Date and time the user's email was verified

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.400

> **400**: `object`

###### Description

Invalid request data

##### responses.400.content

> **content**: `object`

##### responses.400.content.application/json

> **application/json**: `object`

##### responses.400.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.400.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.400.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.401

> **401**: `object`

###### Description

User not authenticated

##### responses.401.content

> **content**: `object`

##### responses.401.content.application/json

> **application/json**: `object`

##### responses.401.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.401.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.401.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.409

> **409**: `object`

###### Description

Email already exists (if trying to update email to one that's already taken)

##### responses.409.content

> **content**: `object`

##### responses.409.content.application/json

> **application/json**: `object`

##### responses.409.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.409.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.409.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### verifyAuth

> **verifyAuth**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody?

> `optional` **requestBody**: `undefined`

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

User is authenticated

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.createdAt?

> `optional` **createdAt**: `string`

Format: date-time

###### Description

Date and time the user was created

##### responses.200.content.application/json.email?

> `optional` **email**: `string`

Format: email

##### responses.200.content.application/json.emailVerified?

> `optional` **emailVerified**: `boolean`

###### Description

Whether the user's email address has been verified

##### responses.200.content.application/json.familyName?

> `optional` **familyName**: `string`

###### Description

User's family name (optional)

##### responses.200.content.application/json.givenName?

> `optional` **givenName**: `string`

###### Description

User's given name (optional)

##### responses.200.content.application/json.id?

> `optional` **id**: `number`

##### responses.200.content.application/json.lastLoginAt?

> `optional` **lastLoginAt**: `string`

Format: date-time

###### Description

Date and time the user last logged in

##### responses.200.content.application/json.name?

> `optional` **name**: `string`

###### Description

User's full name (optional)

##### responses.200.content.application/json.scopes?

> `optional` **scopes**: `string`[]

###### Description

List of user's permission scopes

##### responses.200.content.application/json.verifiedAt?

> `optional` **verifiedAt**: `string`

Format: date-time

###### Description

Date and time the user's email was verified

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.200.headers.X-User-Email?

> `optional` **X-User-Email**: `string`

###### Description

The authenticated user's email

##### responses.200.headers.X-User-Email-Verified?

> `optional` **X-User-Email-Verified**: `"true"` \| `"false"`

###### Description

Whether the authenticated user's email is verified ('true' or 'false')

##### responses.200.headers.X-User-ID?

> `optional` **X-User-ID**: `string`

###### Description

The authenticated user's ID

##### responses.200.headers.X-User-Scopes?

> `optional` **X-User-Scopes**: `string`

###### Description

Comma-separated list of user's permission scopes

##### responses.401

> **401**: `object`

###### Description

User is not authenticated

##### responses.401.content

> **content**: `object`

##### responses.401.content.application/json

> **application/json**: `object`

##### responses.401.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.401.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.401.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.403

> **403**: `object`

###### Description

CSRF token mismatch

##### responses.403.content

> **content**: `object`

##### responses.403.content.application/json

> **application/json**: `object`

##### responses.403.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.403.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.403.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

***

### verifyEmail

> **verifyEmail**: `object`

#### parameters

> **parameters**: `object`

##### parameters.cookie?

> `optional` **cookie**: `undefined`

##### parameters.header?

> `optional` **header**: `undefined`

##### parameters.path?

> `optional` **path**: `undefined`

##### parameters.query?

> `optional` **query**: `undefined`

#### requestBody

> **requestBody**: `object`

##### requestBody.content

> **content**: `object`

##### requestBody.content.application/json

> **application/json**: `object`

##### requestBody.content.application/json.token

> **token**: `string`

###### Description

The verification token sent in the email

#### responses

> **responses**: `object`

##### responses.200

> **200**: `object`

###### Description

Email verified successfully

##### responses.200.content

> **content**: `object`

##### responses.200.content.application/json

> **application/json**: `object`

##### responses.200.content.application/json.createdAt?

> `optional` **createdAt**: `string`

Format: date-time

###### Description

Date and time the user was created

##### responses.200.content.application/json.email?

> `optional` **email**: `string`

Format: email

##### responses.200.content.application/json.emailVerified?

> `optional` **emailVerified**: `boolean`

###### Description

Whether the user's email address has been verified

##### responses.200.content.application/json.familyName?

> `optional` **familyName**: `string`

###### Description

User's family name (optional)

##### responses.200.content.application/json.givenName?

> `optional` **givenName**: `string`

###### Description

User's given name (optional)

##### responses.200.content.application/json.id?

> `optional` **id**: `number`

##### responses.200.content.application/json.lastLoginAt?

> `optional` **lastLoginAt**: `string`

Format: date-time

###### Description

Date and time the user last logged in

##### responses.200.content.application/json.name?

> `optional` **name**: `string`

###### Description

User's full name (optional)

##### responses.200.content.application/json.scopes?

> `optional` **scopes**: `string`[]

###### Description

List of user's permission scopes

##### responses.200.content.application/json.verifiedAt?

> `optional` **verifiedAt**: `string`

Format: date-time

###### Description

Date and time the user's email was verified

##### responses.200.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.400

> **400**: `object`

###### Description

Invalid or expired token

##### responses.400.content

> **content**: `object`

##### responses.400.content.application/json

> **application/json**: `object`

##### responses.400.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.400.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.400.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.401

> **401**: `object`

###### Description

User not logged in

##### responses.401.content

> **content**: `object`

##### responses.401.content.application/json

> **application/json**: `object`

##### responses.401.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.401.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.401.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`

##### responses.403

> **403**: `object`

###### Description

User not authorized to verify email

##### responses.403.content

> **content**: `object`

##### responses.403.content.application/json

> **application/json**: `object`

##### responses.403.content.application/json.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### responses.403.content.application/json.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

##### responses.403.headers

> **headers**: `object`

###### Index Signature

\[`name`: `string`\]: `unknown`
