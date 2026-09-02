[**@saflib/utils**](../index.md)

---

# auth-error-codes

## Type Aliases

| Type Alias                                             | Description |
| ------------------------------------------------------ | ----------- |
| [AuthGateErrorCode](type-aliases/AuthGateErrorCode.md) | -           |

## Variables

| Variable                                                                                      | Description                                                                                  |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED](variables/AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED.md) | Returned as JSON `code` on 403 from auth middleware when email is not verified.              |
| [AUTH_ERROR_MFA_REQUIRED](variables/AUTH_ERROR_MFA_REQUIRED.md)                               | Returned as JSON `code` on 403 when the route requires MFA (AAL2+) and the session does not. |
