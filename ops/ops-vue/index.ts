import OpsTokensAsync from "./pages/OpsTokensAsync.vue";
import OpsTokensPage from "./pages/OpsTokensPage.vue";
import LogsAsync from "./pages/LogsAsync.vue";
import LogsPage from "./pages/LogsPage.vue";
import IssuesAsync from "./pages/IssuesAsync.vue";
import IssuesPage from "./pages/IssuesPage.vue";
import AlertsAsync from "./pages/AlertsAsync.vue";
import AlertsPage from "./pages/AlertsPage.vue";
import OpsDigestPanel from "./components/OpsDigestPanel.vue";
import OpsGraph from "./components/OpsGraph.vue";
import OpsMetricsAsync from "./pages/OpsMetricsAsync.vue";

export { configureOpsVue } from "./client.ts";
export { useOpsAccess } from "./requests/access.ts";
export {
  AlertsAsync,
  AlertsPage,
  IssuesAsync,
  IssuesPage,
  LogsAsync,
  LogsPage,
  OpsDigestPanel,
  OpsGraph,
  OpsMetricsAsync,
  OpsTokensAsync,
  OpsTokensPage,
};
