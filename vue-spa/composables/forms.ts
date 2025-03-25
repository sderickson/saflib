import { ref, watch } from "vue";
import type { Ref } from "vue";

/**
 * Creates a form ref that syncs with a remote data ref
 * @param remoteRef The ref containing remote data
 * @param selector Function to select the specific property from the remote data
 * @param defaultValue Optional default value to use if remote data is not available
 * @returns A ref that can be used for form input, initialized with remote data when available
 */
export function useFormRefForRemoteRef<T, K>(
  remoteRef: Ref<T | undefined>,
  selector: (data: T) => K | undefined,
  defaultValue: K,
) {
  // Create a local ref for the form value
  const formRef = ref<K>(defaultValue);

  // Watch for changes in the remote data and update the form value if it's not set
  watch(
    remoteRef,
    (newData) => {
      if (newData) {
        const selectedValue = selector(newData);
        if (selectedValue !== undefined) {
          formRef.value = selectedValue;
        }
      }
    },
    { immediate: true },
  );

  return formRef;
}
