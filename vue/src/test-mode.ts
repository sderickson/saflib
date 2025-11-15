import { onMounted, ref } from "vue";

export type TestMode = "e2e" | null;

const testModeKey = "testMode";

export const testMode = ref<TestMode>(
  globalThis.document && document.cookie.includes("testMode=e2e")
    ? "e2e"
    : null,
);

export const setTestMode = (mode: TestMode) => {
  testMode.value = mode;
  document.cookie = `${testModeKey}=${mode || ""}; domain=.docker.localhost`;
  maybeHideVueDevTools();
};

export const isTestMode = () => {
  return testMode.value === "e2e";
};

export const hideVueDevToolsIfInTestMode = () => {
  onMounted(maybeHideVueDevTools);
};

const maybeHideVueDevTools = () => {
  if (isTestMode()) {
    const el = document.getElementById("__vue-devtools-container__");
    if (el) {
      console.log("Hiding Vue DevTools");
      el.style.display = "none";
    }
  }
};
