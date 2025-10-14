import { ref } from "vue";

export const errors = ref<string[]>([]);

export const showError = (error: string) => {
  errors.value.push(error);
};

export const info = ref<string[]>([]);

export const showInfo = (message: string) => {
  if (info.value.indexOf(message) !== -1) return;
  info.value.push(message);
};
