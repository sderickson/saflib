# Best Practices

The following are rules that should be followed for _any_ software stack that aims to enable both human and AI agents work quickly and effectively. This stack follows and serves as an example implementation of these rules.

## Pass Objects

As a general rule, give an object as a single parameter to a function. Even if you are adding the first and only parameter, wrap it in an object so that if more options are added later, the function signature does not need to change.

## Return Errors

Some languages (such as Go) expect errors to be returned by functions. Others (such as Java) let you specify what they throw. Many do neither.

For those that do neither, instead of `throw`ing exceptions or errors, adopt a common interface which returns either an error **or** a result (never both, never neither). With TypeScript for example, an operation which may fail in normal operations should result in something like this:

```typescript
const { result, error } = await unsafeOperation();
if (error) {
  switch (true) {
    case error instanceof ErrorClass:
      // handle
    default:
      // Type check fails if not every type of error is handled
      throw error satisfies never;
    }
  }
}
// Through the magic of typing, at this point TypeScript
// recognizes "result" is defined.
use(result.someValue);
```

Note that logic may still `throw` exceptions, but this should be truly exceptional. Exceptions should only be thrown in cases where, if it _actually_ happens in a test or in production, it will be fixed.

## Keep Files Small

This is most applicable to parts of the codebase where there are a number of the same thing. Components, routes, database queries. Each of these should live in a single file, rather than being grouped by domain (such as all CRUD operations for a single entity in one file). If any single instance of those grows to a larger size, it should be broken up into smaller pieces, such as sub-components, library methods, or transactions which depend on smaller queries.

This makes it simpler to provide the right context, and for that context to be contained. It also speeds up editing of these files as there's less surface area for the agent to work with when making changes.

## Keep Code Modular

Software should be broken up into packages which have a well-defined purpose, a public interface, and a list of dependencies. These packages should also not become too large in any of these regards.

This has similar benefits to "Keep Files Small"; it limits the required context for humans or agents to work.

## Specify and Enforce Shared APIs, Models, and Strings

Anything that is shared across system boundaries, such data structures or interfaces, should have a clear, independent source of truth. That source of truth should be used to enforce that model holds such as through type checking and/or schema validation.

This provides quick and straightforward feedback when a shared contract changes. It's easy to find what needs to adapt to the new contract, without the need for running automated tests, and is faster than even well-written and speedy unit tests.

There are many solutions for APIs and schemas, such as proto or OpenAPI. These are also good places to store shared models, which can be readily used as parameters or properties for functions or components as well as the network communications they help specify. Strings (such as urls and user-facing copy) can simply be stored independently from application logic, in maps such as JSON, where they can be referenced across components and tests.

## Mock, Fake, and Shim Service Boundaries

Mocks are code that behaves basically as the actual service would, responding and changing based on unsafe operations. Fakes are simply data which is returned, but does not handle unsafe network calls. Shims sit between the service and the consumer to limit access to what is needed.

Any non-trivial app will reach a point where it depends on separate services, either first or third party, and those should provide mocks and fakes as appropriate. This allows services to write unit or integration tests which don't depend on a live or fully-featured service. If the service is a large one with many features where the consumer only needs a subset, a shim will help manage how much of the service is truly depended on, and reduce the surface area to mock or provide fakes for.

Mocks are recommended for network calls between services (such as an application server making a grpc call to an identity server) or to external services (such as to a payment processor or LLM). Fakes are recommended for frontend applications, to ensure components render correctly given a set of network responses. Interactions with frontend that depend on network calls are better covered through E2E tests such as with playwright.

### Ownership of Mocks, Fakes, Shims

Mocks and fake data are often found adjacent to the consumer code that depends on them, but this logic should live with the service or integration owner. In practice, consumers of the mocks and fakes will end up writing and contributing most of them, most likely, but these should be kept and managed in a central location so to reduce redundant work and updates when shared models change.

Automated test are the next bulwark against breaking changes after static analysis. To test pieces of the application in isolation requires work at the integration points, and having clear expectations of who owns that work helps make sure that work gets done and is not done repeatedly.

## Have Thorough Test Coverage

Where possible test logic in pure functions with no dependencies.

In practice, that's often not practical, at least when it comes to web applications.

A solid automated test suite will include:

- Pure unit tests on library or utility code.
- Unit tests on database queries with an in-memory instance of the database.
- Integration tests for each operation such as web and grpc endpoints, FSM states, and background jobs, with in-memory database instances and mocked external and internal service dependencies.
- Integration (or component) tests for frontend web pages and components, where network requests are faked. Focus mainly on testing renders, not interactions.
- E2E tests with all external dependencies mocked and all internal dependencies fully running.

Packages should be measured for how covered _their_ code is by _their_ tests. A majority of code should be tested at least, with at least one unit or integration test per file (component, endpoint, query, etc). In addition, these files should be immediately adjacent to the file they test (no separate "tests" directories).

Tests should stick to testing the package, API, or user interface they are targeting as much as possible. They should avoid reaching behind and checking, for example, database entries directly. This is not a hard-and-fast rule however; here are some exceptions:

- Checking product events or key metrics are recorded correctly after a user behavior or endpoint call.
- Viewing emails sent in order to make sure they do get sent, or to get some contents such as an email verification code.

## Document Technical Decisions In the Codebase

There needs to be a source of truth for how to do things the right way specific to your stack, and the closer those decisions are to the code the better. To that end:

- For important or non-trivial interfaces, document those functions or classes in the source code itself, such as with [JSDoc](https://jsdoc.app/).
- For packages or modules, include documents on how to use them in the same directory. These documents should tend to be **Explanation** and **Tutorial** docs.
- **Reference** documentation should be generated from source, such as through [Typedoc](https://github.com/TypeStrong/typedoc) or [Redoc](https://github.com/Redocly/redoc).
- **How-To Guides** are great fodder for agentic workflows, and human-readable docs should be generated from those.

The above types of docs are defined by [Diátaxis](https://diataxis.fr/).
