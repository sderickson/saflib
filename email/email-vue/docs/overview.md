# @saflib/email-vue

This package exports just a `LastMockEmailPage` which should be added to the vue router
for your admin SPA. This page will let you see the last email that was sent from a given
service, and is most useful in playwright tests.

For this to work, the service which sends emails needs to run a `@saflib/express`
server on a subdomain, which uses the Express router provided by `@saflib/email` (it can just be added to the service's existing Express server).
The `LastMockEmailPage` takes as a query parameter a subdomain which it should target to find
these email API routes.

In a playwright test, when an email will have been sent, navigate to that page with
`subdomain` provided as a query parameter. The last email that was sent by that service
should appear on the page, and can be tested.

For example, here's a snippet from a playwright test for a registration flow which uses the `LastMockEmailPage` to get an email sent by the `identity` service.

```typescript
await page.goto(
  linkToHref(adminLinks.mockEmailsLast, {
    params: { subdomain: "identity" },
  }),
);
await expect(
  page.getByRole("heading", {
    name: "Email Verification",
  }),
).toBeVisible();

await page
  .getByRole("link", { name: "Click Here to Verify Your Email" })
  .click();
```

This way you can test flows which include going to your email and interacting with it,
such as receiving a code or clicking a link.
