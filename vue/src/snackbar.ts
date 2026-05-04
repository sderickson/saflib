import { ref } from "vue";

/** Opens in the snackbar action area (not passed through to VSnackbar props). */
export type ErrorSnackbarAction = { label: string; href: string };

export type ShowErrorInput =
  | string
  | {
      message: string;
      /** Optional button shown on the snackbar (e.g. link to Sentry). */
      action?: ErrorSnackbarAction;
    };

/**
 * Row as seen in `VSnackbarQueue` slots: string queue entries are coerced to `{ text }`
 * before render. Vuetify merges in other snackbar props; those are ignored here.
 */
export type ErrorSnackbarSlotItem = {
  text?: string;
  action?: ErrorSnackbarAction;
};

/**
 * Queue item for {@link VSnackbarQueue}: strings become `{ text }` internally;
 * objects may include `action` for the error snackbar `#actions` slot only.
 */
export type ErrorSnackbarQueueItem =
  | string
  | { text: string; action?: ErrorSnackbarAction };

export const errors = ref<ErrorSnackbarQueueItem[]>([]);

export const showError = (input: ShowErrorInput) => {
  if (typeof input === "string") {
    errors.value.push(input);
    return;
  }
  if (input.action) {
    errors.value.push({ text: input.message, action: input.action });
  } else {
    errors.value.push(input.message);
  }
};

export const info = ref<string[]>([]);

export const showInfo = (message: string) => {
  if (info.value.indexOf(message) !== -1) return;
  info.value.push(message);
};
