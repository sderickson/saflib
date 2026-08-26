import { createRouter, createMemoryHistory } from "vue-router";
import AuditLogPage from "./audit-log/AuditLogPage.vue";

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/audit", component: AuditLogPage }],
});
