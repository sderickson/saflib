[**@saflib/analytics-vue**](../../../index.md)

---

# Function: registerDevBackendProductEventConnector()

> **registerDevBackendProductEventConnector**(): `void`

In development, POST product events to the backend ring buffer so they appear
in @saflib/analytics-vue/pages/AnalyticsEventsPage.vue. Registers a
connector on @saflib/vue's commonEventLogger — call once
before wiring `makeProductEventLogger` → `commonEventLogger`.

## Returns

`void`
