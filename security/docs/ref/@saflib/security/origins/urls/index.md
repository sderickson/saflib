[**@saflib/security**](../../../../index.md)

---

# @saflib/security/origins/urls

Origin URL helpers for security Playwright suites.

## Functions

| Function                                              | Description                                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [apexUrl](functions/apexUrl.md)                       | Apex/marketing URL on the product domain.                                                                                                |
| [apiOrigin](functions/apiOrigin.md)                   | API host origin, e.g. `http://api.example.docker.localhost`.                                                                             |
| [appOrigin](functions/appOrigin.md)                   | App SPA origin (`app.{DOMAIN}`).                                                                                                         |
| [evilOrigin](functions/evilOrigin.md)                 | Deliberately not under the product domain — stays off the prod cookie/eTLD+1 surface for cross-origin probes (CORS, CSRF leakage, etc.). |
| [getDomain](functions/getDomain.md)                   | Product domain from `DOMAIN` env (default `localhost`).                                                                                  |
| [getProtocol](functions/getProtocol.md)               | Protocol from `PROTOCOL` env (default `http`).                                                                                           |
| [kratosPublicOrigin](functions/kratosPublicOrigin.md) | Kratos public UI origin (`kratos.{DOMAIN}`).                                                                                             |
| [spaOrigin](functions/spaOrigin.md)                   | SPA subdomain origin, e.g. `http://app.example.docker.localhost`.                                                                        |
