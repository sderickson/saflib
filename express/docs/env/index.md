# Environment Variables

This package uses environment variables. The schema for these variables is as follows:

| Variable                | Description                                                                                                   | Type   | Required |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| DISABLE_MFA_ENFORCEMENT | When 'true', skip MFA gates on admin routes and operations tagged mfa-required. Useful for local development. | string |          |
