[**@saflib/analytics-http**](../../index.md)

---

# express/createAnalyticsRouter

## Functions

| Function                                                          | Description                                                                                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [createAnalyticsRouter](functions/createAnalyticsRouter.md)       | Product analytics ingest (always mounted): - `POST /product-events/record` — browser or API client event capture             |
| [createDevAnalyticsRouter](functions/createDevAnalyticsRouter.md) | Development-only in-memory product event viewer: - `GET /admin/product-events` — ring buffer listing (PostHog in production) |
