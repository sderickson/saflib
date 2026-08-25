import { inject, type InjectionKey } from "vue";
import { useListReportedErrors } from "@saflib/errors-sdk";

export function useErrorsLoader() {
  return {
    errorsQuery: useListReportedErrors(),
  };
}

export type ErrorsLoader = ReturnType<typeof useErrorsLoader>;

export const errorsLoaderKey: InjectionKey<ErrorsLoader> =
  Symbol("errorsLoader");

export function useErrorsPageLoader(): ErrorsLoader {
  return inject(errorsLoaderKey, null) ?? useErrorsLoader();
}
