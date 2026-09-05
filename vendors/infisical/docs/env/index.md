# Environment Variables

This package uses environment variables. The schema for these variables is as follows:

| Variable              | Description                                                                                                                            | Type   | Required |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| INFISICAL_TOKEN       | Infisical access token for the secret store. Sentinel "mock" selects the mock Infisical client (returns env fallbacks / placeholders). | string | Yes      |
| INFISICAL_PROJECT_ID  | Infisical project id. Optional when INFISICAL_TOKEN is "mock".                                                                         | string |          |
| INFISICAL_ENVIRONMENT | Infisical environment slug (e.g. dev, staging, prod). Optional when INFISICAL_TOKEN is "mock".                                         | string |          |
