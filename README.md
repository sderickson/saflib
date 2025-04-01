# ChangeForgottenPasswordPage test case

Right now in this commit, if you do:

```bash
cd auth-vue
npm run test
```

You'll see this error:

```
 FAIL  src/components/ChangeForgottenPasswordPage.test.ts > ChangeForgottenPasswordPage > should show success message and hide form after successful password reset
Error: Timed out in waitUntil!
 ❯ src/components/ChangeForgottenPasswordPage.test.ts:173:35
    171|
    172|     // Wait for success message
    173|     const successAlert = await vi.waitUntil(() => {
       |                                   ^
    174|       const alerts = wrapper.findAllComponents({ name: "v-alert" });
    175|       return alerts.find((alert) => alert.props("type") === "success");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  src/components/ChangeForgottenPasswordPage.test.ts > ChangeForgottenPasswordPage > should show error message when token is invalid
AssertionError: expected 'Failed to reset password. Please try …' to contain 'Invalid or expired token'

Expected: "Invalid or expired token"
Received: "Failed to reset password. Please try again."

 ❯ src/components/ChangeForgottenPasswordPage.test.ts:209:32
    207|       { timeout: 1000 },
    208|     );
    209|     expect(errorAlert?.text()).toContain("Invalid or expired token");
       |                                ^
    210|   });
    211| });
```

There are two issues:

1. The first is tricky: the implementation is wonky because it pulls in a non-existent token from the url, and then sends that to the endpoint. To fix this, we'd get rid of the token from the url, and use the "temporary password" input as the token. Probably also rename things so they're not so confusing.
2. The second is simpler: the test is checking for the server message response, but it should be checking what the page renders.

I've tried having Cursor fix these a few ways, but it's not working. I think this seems like a good test for evaluating coding agents. So I'm saving this as a branch for later.
