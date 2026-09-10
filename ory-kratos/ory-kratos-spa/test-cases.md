# Auth SPA — test cases & user stories

Generic Ory Kratos flows shared by SAF clients. Product clients send users to the auth subdomain with a full `redirect` URL (`return_to`); after login, registration, verification, or recovery, the browser should land on the app that initiated the flow when that URL is still known.

Use this doc for manual QA, Playwright scenarios, and aligning behavior when something is wrong.

---

## Cross-cutting conventions

- **`?redirect=`** — Full URL used as Kratos `return_to` where supported (see `hub/clients/links/auth-links.ts` per route).
- **`?flow=`** — Kratos flow id after a browser flow is created (refresh-safe).
- **Auth “home” `/`** — Redirects to `/login` and preserves query params (`router.ts`).

---

## Entry from a logged-out product

1. **As a visitor on a product’s logged-out root**, when I choose sign in or register, I am taken to the auth app on the correct route (login or registration) and the URL includes a `redirect` parameter pointing at that product’s post-auth destination (e.g. hub app home, recipes home).

2. **As a visitor who lands on auth without a `redirect`**, I can still complete login or registration; the app should send me to a sensible default when no `return_to` is available (intended: **hub** as the product-neutral home — verify against current behavior, which may still default to another app in some flows).

---

## Login

3. **As a user with a valid session who opens the login page** (e.g. bookmarked), I am not stuck on the form: existing session handling sends me toward the appropriate place (per `Login` loader / page behavior).

4. **As a user who signs in successfully with email already verified**, I am redirected to the URL from `redirect` / flow `return_to`, or the configured fallback when none was provided.

5. **As a user who signs in successfully but email is not verified**, I am sent to the verify wall (or equivalent) with `redirect` preserved so that after verification I can reach the product I came from.

---

## Registration

6. **As a new user completing registration**, after success I follow the same redirect / fallback rules as login (including verify wall if the identity is not verified yet).

---

## Email verification (`/verification`)

Behavior is owned by `Verification.vue`, `useVerificationRouteSync.ts`, the `/new-verification` route, and `useVerificationFlow.ts` (redirect only when the flow reaches `passed_challenge`).

7. **As a logged-out user on `/verification` without `?flow=`**, I am redirected to login, with a return path that brings me back to verification when appropriate.

8. **As a logged-out user who opens a verification link from email** (`?flow=` / optional `?token=` from courier), I can complete the code flow without signing in first; the flow loads by id and behaves like the logged-in path for code entry and “send a new code” (new browser flow + URL updated).

9. **As a signed-in user whose email is already verified**, I see a confirmation state (“you are verified”) and a **Continue** action to `?redirect=` or the configured post-auth fallback—not the code form.

10. **As a signed-in user who still needs verification and has no `?flow=` yet**, I see an explanation and a **Send a code** action that creates a browser verification flow and updates the URL with `?flow=` so refresh keeps the same flow.

11. **As a signed-in user on `/verification` with `?flow=`** (after send-a-code or from a link), I enter the code from email; I can **Send a new code**, which starts a **new** browser flow and replaces `?flow=` in the URL. Submitting the code only navigates away after Kratos reports the flow as completed (`passed_challenge`); intermediate steps (e.g. email-only) do not send me to the app early.

12. **As a user who completes verification successfully** (code accepted), I land on `return_to` from the flow or the fallback when absent—same destination rules as before.

---

## Verify wall (`/verify-wall`)

Behavior is owned by `VerifyWall.vue` and `useVerifyWallPage.ts` (no automatic full-page redirect when verified).

13. **As a logged-out user who hits `/verify-wall`**, I am redirected to login, with **`redirect`** preserved on the login return URL when it was present.

14. **As a signed-in user with unverified email**, I see messaging to check my email; I can **Continue to app** (same `redirect` / fallback as elsewhere—the copy warns that access may be limited until verified) or **Sign out**. There is **no** primary CTA deep-linking into the verification flow from this page (verification is handled on `/verification`).

15. **As a signed-in user who is already verified**, I see a confirmation state and a **Continue** control to `?redirect=` or the fallback—I am **not** auto-redirected by a `window.location` side effect; I choose when to leave.

---

## Recovery (password reset)

16. **As a user using recovery from email or the browser**, I can complete the flow and end up at `redirect` / `return_to` or the fallback.

---

## Settings (authenticated)

17. **As a signed-in user on settings**, I can manage profile/password per Kratos configuration; session loss redirects me to login with a way to return to settings (`useSettingsRouteSync` / related).

---

## Logout

18. **As a signed-in user who hits the auth logout route**, I am sent through Kratos logout and then land on the URL in `?redirect=` when provided.

19. **As a user who logs out without a `redirect`**, I land on the **logged-out root** default (auth SPA uses hub home as `return_to` when `redirect` is missing — see `LogoutAsync.vue`).

---

## Deep links & resilience

20. **As a user or email client that drops query params**, if `redirect` is lost mid-flow, the completed flow should still send me somewhere safe (intended: **hub**); treat mismatches here as bugs to fix.

21. **As a user hitting unknown paths on the auth app**, I see the global not-found page (`/:pathMatch(.*)*`).

---

## UI & accessibility

22. **As a user stepping through a multi-step Kratos flow** (e.g. registration: email then password), when the flow UI updates after a successful step, **keyboard focus moves to the first newly shown field** so focus is not left on a stale control.

23. **As a user entering a password**, the field is **masked** (treated as `type="password"`) even when Kratos returns `type="text"` for a field named `password` (or `traits.password`).

24. **As a user submitting a flow update**, the form is **non-interactive while the request runs**: controls are disabled, the primary action shows a **loading state** (spinner on the submit control), and the form is marked **busy** for assistive tech.

25. **As a user choosing how to sign in**, **Login**, **Registration**, and **Recovery** pages expose **cross-links** to each other (with the same `?redirect=` preserved when present): register ↔ login, and login → recovery.

---

## Notes for automation

- Prefer asserting **final `window.location` or navigation** for flows that assign location after Kratos success.
- For **email verification**, only expect a full navigation to the app after the flow state is **completed** (`passed_challenge`), not after intermediate updates (e.g. resend / email step).
- Matrix worth covering later: **hub vs recipes vs notebook** entry points × **login | register | verify | recovery | logout** × **with vs without `redirect`**.

When you add or change a story, link to the route (`authLinks.*`) and any composable or loader that owns the behavior so fixes stay localized.
