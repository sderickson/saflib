import { createRouter, createWebHistory } from "vue-router";
import TimelinePage from "./TimelinePage.vue";
import CommitDetailPage from "./CommitDetailPage.vue";
import ComparePage from "./ComparePage.vue";
import HubPage from "./HubPage.vue";
import CheckoutPage from "./CheckoutPage.vue";
import PlansPage from "./PlansPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HubPage },
    { path: "/history", component: TimelinePage },
    { path: "/history/commits/:hash", component: CommitDetailPage },
    { path: "/history/compare", component: ComparePage },
    { path: "/checkout", component: CheckoutPage },
    {
      path: "/checkout/packages/:package_name",
      redirect: (to) => ({
        path: "/checkout",
        query: { package: decodeURIComponent(to.params.package_name as string) },
      }),
    },
    { path: "/plans", component: PlansPage },
    { path: "/plans/:planName/:fileName(.+\\.md)", component: PlansPage },
    { path: "/plans/:planName/:fileName(.+\\.ya?ml)", component: PlansPage },
    { path: "/plans/:planName/:fileName", component: PlansPage },
  ],
});
