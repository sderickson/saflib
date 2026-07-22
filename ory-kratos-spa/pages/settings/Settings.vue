<template>
  <template v-if="queryData instanceof SettingsFlowFetched && flow">
    <div class="settings-page text-start">
      <SettingsIntro v-if="!embedded" />

      <v-alert
        v-if="showPasswordRecoveryPrompt"
        type="info"
        variant="tonal"
        class="mb-4"
        density="comfortable"
      >
        {{ t(passwordRecoveryStrings.prompt) }}
      </v-alert>

      <v-alert
        v-if="submitError"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="clearSubmitError"
      >
        {{ submitError }}
      </v-alert>

      <div
        class="settings-body d-flex flex-column flex-md-row ga-6 align-md-start"
        :class="{ 'settings-body--embedded': embedded }"
      >
        <nav
          v-if="!embedded"
          class="settings-nav flex-shrink-0"
          :aria-label="t(tabs.nav_aria_label)"
        >
          <v-list class="pa-0 settings-nav-list" density="comfortable" nav>
            <v-list-item
              v-for="item in sidebarItems"
              :key="item.value"
              :active="tab === item.value"
              color="primary"
              rounded="lg"
              link
              class="mb-1"
              :aria-current="tab === item.value ? 'page' : undefined"
              @click="tab = item.value"
            >
              <v-list-item-title class="text-body-2 text-wrap">
                {{ item.title }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </nav>

        <div class="settings-panel flex-grow-1">
          <v-window v-model="tab" class="settings-window">
            <v-window-item value="email">
              <SettingsGroupUi
                :flow="flow"
                group="profile"
                :submitting="submitting"
                id-prefix="settings-profile"
                :message-filter="settingsMessageFilter"
                @submit="submitSettingsForm"
              />
            </v-window-item>
            <v-window-item value="password">
              <SettingsGroupUi
                :flow="flow"
                group="password"
                :submitting="submitting"
                id-prefix="settings-password"
                :message-filter="settingsMessageFilter"
                @submit="submitSettingsForm"
              />
            </v-window-item>
            <v-window-item v-if="hasTotpSettings" value="totp">
              <SettingsGroupUi
                :flow="flow"
                group="totp"
                :submitting="submitting"
                id-prefix="settings-totp"
                :message-filter="settingsMessageFilter"
                @submit="submitSettingsForm"
              />
            </v-window-item>
            <v-window-item value="sessions">
              <v-alert
                v-if="sessionsBanner"
                type="error"
                variant="tonal"
                class="mb-4"
                density="comfortable"
                closable
                @click:close="clearSessionsBanner"
              >
                {{ sessionsBanner }}
              </v-alert>
              <div class="d-flex flex-wrap ga-2 mb-4">
                <v-btn
                  color="error"
                  variant="tonal"
                  :disabled="otherSessionsCount === 0"
                  :loading="disableMyOtherSessions.isPending.value"
                  @click="signOutOtherDevices"
                >
                  {{ t(sessionsStrings.sign_out_others) }}
                </v-btn>
              </div>
              <v-card>
                <v-card-text
                  v-if="sessionsTableLoading"
                  class="text-center py-8"
                >
                  <v-progress-circular indeterminate color="primary" />
                </v-card-text>
                <v-card-text
                  v-else-if="(mySessionsQuery.data.value ?? []).length === 0"
                  class="text-medium-emphasis"
                >
                  —
                </v-card-text>
                <v-table v-else>
                  <thead>
                    <tr>
                      <th class="text-left">
                        {{ t(sessionsStrings.table_device) }}
                      </th>
                      <th class="text-left">
                        {{ t(sessionsStrings.table_ip) }}
                      </th>
                      <th class="text-left">
                        {{ t(sessionsStrings.table_signed_in) }}
                      </th>
                      <th class="text-left">
                        {{ t(sessionsStrings.table_actions) }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in sessionsSorted" :key="row.id">
                      <td>
                        <span class="text-body-2">{{
                          sessionUserAgent(row)
                        }}</span>
                        <v-chip
                          v-if="row.id === currentSessionId"
                          class="ml-2"
                          size="small"
                          color="primary"
                          variant="flat"
                        >
                          {{ t(sessionsStrings.badge_this_device) }}
                        </v-chip>
                      </td>
                      <td>{{ sessionIp(row) }}</td>
                      <td>{{ formatSessionTime(row.authenticated_at) }}</td>
                      <td>
                        <v-btn
                          v-if="row.id === currentSessionId"
                          color="error"
                          variant="text"
                          size="small"
                          :loading="browserLogoutPending"
                          @click="signOutThisDevice"
                        >
                          {{ t(sessionsStrings.sign_out_this) }}
                        </v-btn>
                        <v-btn
                          v-else
                          color="error"
                          variant="text"
                          size="small"
                          :loading="
                            disableMySession.isPending.value &&
                            disableMySession.variables.value === row.id
                          "
                          @click="revokeSession(row.id)"
                        >
                          {{ t(sessionsStrings.revoke) }}
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-window-item>
          </v-window>
        </div>
      </div>
    </div>
  </template>

  <SettingsAalReauthRedirect
    v-else-if="queryData instanceof BrowserRedirectRequired"
    :redirect-browser-to="queryData.payload.redirect_browser_to"
  />

  <FlowGonePanel
    v-else-if="queryData instanceof FlowGone"
    :restart-path="flowCreatePath"
    :restart-query="settingsRestartQuery"
    :result="queryData"
  />
  <CsrfViolationPanel
    v-else-if="queryData instanceof SecurityCsrfViolation"
    :restart-path="flowCreatePath"
    :restart-query="settingsRestartQuery"
    :result="queryData"
  />
  <UnhandledResponsePanel v-else :result="queryData" />
</template>

<script setup lang="ts">
import { computed, ref, toValue, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getTanstackErrorMessage, TanstackError } from "@saflib/sdk";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import type { Session, SettingsFlow, UiText } from "@ory/client";
import {
  BrowserRedirectRequired,
  FlowGone,
  SecurityCsrfViolation,
  SettingsFlowFetched,
  useDisableMyOtherSessionsMutation,
  useDisableMySessionMutation,
  useKratosMySessions,
  useKratosSession,
} from "@saflib/ory-kratos-sdk";
import SettingsGroupUi from "./SettingsGroupUi.vue";
import SettingsIntro from "./SettingsIntro.vue";
import type { KratosFlowUiMessageFilterContext } from "../common/kratosUiMessages.ts";
import {
  KRATOS_SETTINGS_PASSWORD_RECOVERY_MESSAGE_ID,
  parseSettingsTabQuery,
  settingsFlowHasPasswordRecoveryMessage,
  type SettingsTabQueryValue,
} from "./Settings.logic.ts";
import {
  settings_password_recovery as passwordRecoveryStrings,
  settings_sessions as sessionsStrings,
  settings_tabs as tabs,
} from "./Settings.strings.ts";
import { useSettingsFlow } from "./useSettingsFlow.ts";
import { useSettingsLoader } from "./Settings.loader.ts";
import CsrfViolationPanel from "../common/CsrfViolationPanel.vue";
import FlowGonePanel from "../common/FlowGonePanel.vue";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import SettingsAalReauthRedirect from "./SettingsAalReauthRedirect.vue";
import { useKratosBrowserLogout } from "../registration/useKratosBrowserLogout.ts";

const props = withDefaults(
  defineProps<{
    /**
     * When set (typically with `embedded`), force this settings section and skip
     * the in-page sidebar. Host layouts supply their own nav.
     */
    section?: SettingsTabQueryValue;
    /** Hide intro + sidebar (account SPA nest). */
    embedded?: boolean;
    /** Path used to restart an expired / CSRF settings flow. */
    flowCreatePath?: string;
  }>(),
  {
    embedded: false,
    flowCreatePath: "/new-settings",
  },
);

const { t } = useReverseT();
const route = useRoute();
const router = useRouter();
const { getSettingsFlowQuery } = useSettingsLoader();

const queryData = computed(() => toValue(getSettingsFlowQuery.data));

const flow = computed((): SettingsFlow | null => {
  const d = queryData.value;
  if (d instanceof SettingsFlowFetched) {
    return d.flow;
  }
  return null;
});

const flowIdForSubmit = computed(() => flow.value?.id ?? "");

type SettingsSectionTab = Exclude<SettingsTabQueryValue, "passkey">;

const tab = ref<SettingsSectionTab>("email");

const { data: kratosSession, isPending: kratosSessionPending } =
  useKratosSession();

const mySessionsEnabled = computed(
  () => !kratosSessionPending.value && kratosSession.value != null,
);
const mySessionsQuery = useKratosMySessions({
  enabled: mySessionsEnabled,
});

const currentSessionId = computed(() => kratosSession.value?.id ?? "");

const sessionsSorted = computed(() => {
  const list = [...(mySessionsQuery.data.value ?? [])];
  const cid = currentSessionId.value;
  list.sort((a, b) => {
    const aFirst = a.id === cid ? 0 : 1;
    const bFirst = b.id === cid ? 0 : 1;
    return aFirst - bFirst;
  });
  return list;
});

const otherSessionsCount = computed(
  () =>
    (mySessionsQuery.data.value ?? []).filter(
      (s) => s.id !== currentSessionId.value,
    ).length,
);

const sessionsTableLoading = computed(
  () =>
    mySessionsEnabled.value &&
    mySessionsQuery.isPending.value &&
    mySessionsQuery.data.value === undefined,
);

const disableMySession = useDisableMySessionMutation();
const disableMyOtherSessions = useDisableMyOtherSessionsMutation();

const sessionsActionError = ref("");

const { pending: browserLogoutPending, startBrowserLogout } =
  useKratosBrowserLogout();

function sessionUserAgent(s: Session): string {
  const devices = s.devices ?? [];
  const d = devices[devices.length - 1] ?? devices[0];
  const ua = d?.user_agent?.trim();
  return ua || "—";
}

function sessionIp(s: Session): string {
  const devices = s.devices ?? [];
  const d = devices[devices.length - 1] ?? devices[0];
  return d?.ip_address?.trim() || "—";
}

function formatSessionTime(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleString();
}

const sessionsBanner = computed(() => {
  if (sessionsActionError.value) return sessionsActionError.value;
  const e = mySessionsQuery.error.value;
  if (e instanceof TanstackError) return getTanstackErrorMessage(e);
  if (e) return t(sessionsStrings.load_failed);
  return "";
});

function clearSessionsBanner() {
  sessionsActionError.value = "";
  void mySessionsQuery.refetch();
}

async function revokeSession(id: string) {
  sessionsActionError.value = "";
  try {
    await disableMySession.mutateAsync(id);
  } catch (e) {
    sessionsActionError.value =
      e instanceof TanstackError
        ? getTanstackErrorMessage(e)
        : t(sessionsStrings.action_failed);
  }
}

async function signOutOtherDevices() {
  sessionsActionError.value = "";
  try {
    await disableMyOtherSessions.mutateAsync();
  } catch (e) {
    sessionsActionError.value =
      e instanceof TanstackError
        ? getTanstackErrorMessage(e)
        : t(sessionsStrings.action_failed);
  }
}

function signOutThisDevice() {
  sessionsActionError.value = "";
  void startBrowserLogout();
}

const { submitting, submitError, clearSubmitError, submitSettingsForm } =
  useSettingsFlow(flowIdForSubmit);

/** Hide stale Kratos flow-level banners (e.g. “saved”) after switching tabs; cleared when a submit finishes. */
const suppressFlowLevelKratosMessages = ref(false);

const hasTotpSettings = computed(() =>
  Boolean(flow.value?.ui.nodes.some((node) => node.group === "totp")),
);

const sidebarItems = computed((): { value: SettingsSectionTab; title: string }[] => {
  const items: { value: SettingsSectionTab; title: string; show: boolean }[] = [
    { value: "email", title: t(tabs.general), show: true },
    { value: "password", title: t(tabs.password), show: true },
    { value: "totp", title: t(tabs.totp), show: hasTotpSettings.value },
    { value: "sessions", title: t(tabs.sessions), show: true },
  ];
  return items.filter((i) => i.show).map(({ value, title }) => ({ value, title }));
});

const showPasswordRecoveryPrompt = computed(() =>
  flow.value ? settingsFlowHasPasswordRecoveryMessage(flow.value) : false,
);

const settingsMessageFilter = computed(
  (): ((msg: UiText, ctx: KratosFlowUiMessageFilterContext) => boolean) => {
    return (msg, ctx) => {
      if (
        ctx.kind === "flow" &&
        Number(msg.id) === KRATOS_SETTINGS_PASSWORD_RECOVERY_MESSAGE_ID
      ) {
        return false;
      }
      if (ctx.kind === "flow" && suppressFlowLevelKratosMessages.value) {
        return false;
      }
      return true;
    };
  },
);

function asSectionTab(
  value: SettingsTabQueryValue | undefined,
): SettingsSectionTab | null {
  if (!value || value === "passkey") return null;
  return value;
}

watch(
  [flow, () => route.query.tab, () => props.section, hasTotpSettings],
  () => {
    const f = flow.value;
    if (f && settingsFlowHasPasswordRecoveryMessage(f)) {
      if (props.embedded && props.section && props.section !== "password") {
        const flowId =
          typeof route.query.flow === "string" ? route.query.flow : undefined;
        void router.replace({
          path: "/password",
          query: flowId ? { flow: flowId } : {},
        });
        return;
      }
      tab.value = "password";
      return;
    }
    const fromProp = asSectionTab(props.section);
    if (fromProp) {
      if (fromProp === "totp" && !hasTotpSettings.value) return;
      tab.value = fromProp;
      return;
    }
    const fromQuery = parseSettingsTabQuery(route.query.tab);
    const fromQueryTab = asSectionTab(fromQuery ?? undefined);
    if (!fromQueryTab) return;
    if (fromQueryTab === "totp" && !hasTotpSettings.value) return;
    tab.value = fromQueryTab;
  },
  { immediate: true },
);

watch([tab, hasTotpSettings], () => {
  if (tab.value === "totp" && !hasTotpSettings.value) tab.value = "email";
});

watch(tab, (next, prev) => {
  if (next !== "sessions") {
    sessionsActionError.value = "";
  }
  if (prev !== undefined) {
    suppressFlowLevelKratosMessages.value = true;
  }
});

watch(submitting, (now, was) => {
  if (was && !now) {
    suppressFlowLevelKratosMessages.value = false;
  }
});

/** Preserve `return_to` when restarting from CSRF or expired flow. */
const settingsRestartQuery = computed(() => {
  const q: Record<string, string> = {};
  if (
    typeof route.query.return_to === "string" &&
    route.query.return_to.trim()
  ) {
    q.return_to = route.query.return_to.trim();
  }
  if (props.embedded && props.section && props.section !== "passkey") {
    return q;
  }
  const tabQ = parseSettingsTabQuery(route.query.tab);
  if (tabQ && tabQ !== "passkey") {
    q.tab = tabQ;
  }
  return q;
});
</script>

<style scoped>
.settings-page {
  width: 100%;
}

.settings-body {
  width: 100%;
}

.settings-body--embedded {
  display: block;
}

.settings-nav {
  width: 100%;
}

@media (min-width: 960px) {
  .settings-nav {
    width: 220px;
    position: sticky;
    align-self: flex-start;
    top: 8px;
  }
}

.settings-panel {
  max-width: 800px;
  width: 100%;
  min-width: 0;
}
</style>
