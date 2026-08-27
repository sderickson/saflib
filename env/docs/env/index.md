# Environment Variables

This package uses environment variables. The schema for these variables is as follows:

| Variable          | Description                                                                                                                                                                                       | Type   | Required |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| CLIENT_SUBDOMAINS | Comma-separated list of client subdomains, e.g. 'www,app,auth,'. Include an empty string (such as in the example) to indicate there's a client for the root domain.                               | string | Yes      |
| DEPLOYMENT_NAME   | The name of the deployment, e.g. 'production', 'staging', 'development'. This may be used in strings such as database file names and logging metadata; each deployment should have a unique name. | string | Yes      |
| DOMAIN            | The root domain of the deployment, e.g. 'saf.com'.                                                                                                                                                | string | Yes      |
| NODE_ENV          | The environment of the deployment. Generally should avoid using this, consider its use deprecated, prefer instead more specific environment variables.                                            | string | Yes      |
| PROTOCOL          | The protocol of the deployment, e.g. 'https'                                                                                                                                                      | string | Yes      |
| TZ                | The timezone of the deployment, e.g. 'America/New_York'. Must be UTC.                                                                                                                             | string | Yes      |
