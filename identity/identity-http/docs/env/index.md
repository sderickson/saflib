# Environment Variables

This package uses environment variables. The schema for these variables is as follows:

| Variable                               | Description                                                                                                    | Type   | Required |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| IDENTITY_SERVICE_HTTP_PORT             | undefined                                                                                                      | string | Yes      |
| IDENTITY_SERVICE_ADMIN_EMAILS          | Comma-separated list of emails who will get the 'admin' scope. Emails must be validated to receive this scope. | string |          |
| IDENTITY_SERVICE_DISABLE_RATE_LIMITING | Whether to disable rate limiting. Set to 'true' to disable.                                                    | string |          |
