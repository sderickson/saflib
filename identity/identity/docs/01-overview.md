# Overview

The `@saflib/identity` package is a set of packages for all things identity, authorization, and authentication. It is a complete service which can be used across packages for a straightforward, email-based system.

## Usage

To run both the HTTP and gRPC servers, use the `startIdentityService` function. Provide it options for how the database should be run, and what should happen when events occur in the service.

A startup script might look like this:

```ts
#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { startIdentityService } from "@saflib/identity";
import { callbacks } from "../callbacks.ts";
import { addLokiTransport, collectSystemMetrics } from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "../env.schema.combined.json" with { type: "json" };

validateEnv(process.env, envSchema);
setServiceName("auth");
addLokiTransport();
collectSystemMetrics();

startIdentityService({
  dbOptions: {
    onDisk: true,
    doNotCreate: true,
  },
  callbacks,
});
```

For this to work, make sure to run `npm exec saf-env generate -- --combined` from the package which runs this service. The resulting schema file will enumerate all the env variables you'll need to provide.

## Identity Subdomain

To enable sign-up/sign-in flows with the identity service, you'll need to serve the HTTP server at the `identity` subdomain of your site, for example `identity.example.com`. Here's an example with Caddy:

```caddy
# Other subdomains depend on identity verifying users have access to subdomains (via forward_auth)
{$PROTOCOL}://identity.{$DOMAIN} {
	@identity {
		host identity.{$DOMAIN}
		path /auth*
	}

	# auth routes do not go through the "verify" endpoint; they manage their own access
	handle @identity {
		reverse_proxy identity:3000
	}

	# all other routes, such as "/users", go through the "verify" endpoint
	import api-proxy identity:3000
}
```

## Forward Auth

The service is built to handle forward auth requests from reverse proxies like Caddy. The above Caddyfile example above actually does that for `/users` endpoints for the identity service, ensuring those who try to access it have authorization to do so. The Caddyfile snippet looks like this:

```caddy
(api-proxy) {
	forward_auth identity:3000 {
		uri /auth/verify?
		header_up X-Request-ID {http.request.uuid}
		copy_headers X-User-ID X-User-Email X-User-Scopes
		header_up X-Csrf-Token {http.request.header.X-CSRF-Token}
	}
	reverse_proxy {args[0]} {
		import reverse_proxy_common
	}
}
```

This verify endpoint also accepts headers which can be used to configure how it behaves, including:

```
header_up X-Csrf-Skip true # Skips CSRF check
header_up X-Require-Admin true # Only users signed in and validated with an email provided # via the env variable `IDENTITY_SERVICE_ADMIN_EMAILS` are authorized.
```

## Auth Client

`identity` is a service, `auth` is a client. You can use the `@saflib/auth` package to build a client for the auth service which covers all the basic authentication flows:

- Login
- Logout
- Register
- Forgot Password
- Verify Email

Create a `@saflib/vue` client at the subdomain `auth` with the router provided by `createAuthRouter`. You can customize it from there by wrapping the provided pages with your own components and passing those into `createAuthRouter` to override page defaults.

If you need to redirect users _to_ the auth client, use `@saflib/auth-links` in conjunction with `@saflib/links` to create links to the auth client.

These packages assume the `identity` subdomain is the HTTP server, and the `auth` subdomain is the Vue client. So be sure to configure them as such.

## Related Packages

### Public Packages

- `@saflib/auth` - the complete frontend for authentication flows.
- [`@saflib/auth-links`](../../auth-links/docs/ref/index.md) - links to pages in `@saflib/auth`. Useful for tests and redirects from servers or other clients.
- [`@saflib/identity-rpcs`](../../identity-rpcs/docs/ref/index.md) - gRPC client for making requests to the identity service.

### Private Packages

Used only for internal development of the identity service.

- [`@saflib/identity-common`](../../identity-common/docs/ref/index.md) - shared code for the identity service.
- [`@saflib/identity-db`](../../identity-db/docs/ref/index.md) - the database for the identity service.
- [`@saflib/identity-grpc`](../../identity-grpc/docs/ref/index.md) - the gRPC server for the identity service.
- [`@saflib/identity-http`](../../identity-http/docs/ref/index.md) - the HTTP server for the identity service.
- [`@saflib/identity-spec`](../../identity-spec/docs/ref/index.md) - the OpenAPI specification for the identity service.
