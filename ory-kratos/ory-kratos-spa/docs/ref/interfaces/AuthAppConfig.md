[**@saflib/ory-kratos-spa**](../index.md)

---

# Interface: AuthAppConfig

## Properties

### requireMfaAfterLogin

> **requireMfaAfterLogin**: `boolean`

When true (default), after password login the auth SPA probes for AAL2 and redirects
to MFA challenge or account MFA setup before honoring `return_to`. Products that treat
MFA as optional (e.g. base) should set this to false.

---

### showFlowHeaders

> **showFlowHeaders**: `boolean`

When false, Kratos flow pages hide built-in H1 titles (e.g. "Create your account")
so a host layout can supply its own headings.
