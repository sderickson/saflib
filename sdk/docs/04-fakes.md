# Fakes

For SAF components, testing is [fairly focused on testing rendering](../../vue/docs/04-testing.md#testing-interactions). In order to test how a component renders, it often needs to be provided data, and also it's a good idea to make sure the component loads itself correctly. Given these requirements, it's important to have a way to run the components on a fake version of the backends it depends on, and the SDK package is the [appropriate place to do that](../../best-practices.md#ownership-of-mocks-fakes-shims).

Fakes are built with [Mock Service Worker](https://mswjs.io/) because this intercepts network requests and so doesn't need to depend on how SAF frontend components do networking. SAF provides a helper function for creating fake handlers which enforce typechecking based on the OpenAPI spec for the service: [`typedCreateHandler`](../../vue/docs/ref/@saflib/vue/testing/functions/typedCreateHandler.md). SDK packages should export:

- An array of handlers which are the baseline behavior of endpoints to the service.
- Constants which can be referenced by tests; basically bits of the data that the server returns by default.
- An object of lists of handlers which are scenarios which can be prepended to the baseline handlers.

This way tests which depend on the SDK can quickly test on some fake data, but also test scenarios such as a user whose email is verified or not verified.
