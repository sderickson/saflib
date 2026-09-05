# Environment Variables

This package uses environment variables. The schema for these variables is as follows:

| Variable | Description | Type | Required |
| --- | --- | --- | --- |
| KRATOS_HANDLER_HTTP_HOST | Host URL for the Ory Kratos courier callback server (e.g. recipes-monolith:3000). | string | Yes |
| KRATOS_ADMIN_API_URL | Base URL for the Ory Kratos admin API (e.g. http://kratos:4434). Used for server-side identity lookups. | string |  |

