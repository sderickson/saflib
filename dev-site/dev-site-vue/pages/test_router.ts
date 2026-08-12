import { createRouter, createWebHistory } from "vue-router";
import TimelinePage from "./TimelinePage.vue";
import CommitDetailPage from "./CommitDetailPage.vue";
import ComparePage from "./ComparePage.vue";
import HubPage from "./HubPage.vue";
import CheckoutPage from "./CheckoutPage.vue";
import PackageMapPage from "./PackageMapPage.vue";
import BuildPage from "./BuildPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HubPage },
    { path: "/history", component: TimelinePage },
    { path: "/history/commits/:hash", component: CommitDetailPage },
    { path: "/history/compare", component: ComparePage },
    { path: "/checkout", component: CheckoutPage },
    { path: "/checkout/packages/:packageName", component: PackageMapPage },
    { path: "/build", component: BuildPage },
  ],
});
