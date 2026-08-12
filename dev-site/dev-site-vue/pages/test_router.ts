import { createRouter, createWebHistory } from "vue-router";
import TimelinePage from "./TimelinePage.vue";
import CommitDetailPage from "./CommitDetailPage.vue";
import ComparePage from "./ComparePage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: TimelinePage },
    { path: "/commits/:hash", component: CommitDetailPage },
    { path: "/compare", component: ComparePage },
  ],
});
