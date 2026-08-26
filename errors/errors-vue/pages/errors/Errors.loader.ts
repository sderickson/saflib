import { inject, type InjectionKey } from "vue";
import { useListReportedErrors } from "@saflib/errors-sdk";

export type ErrorsLoader = {
  errorsQuery: ReturnType<typeof useListReportedErrors>;
};

export function useErrorsLoader(): ErrorsLoader {
  return {
    errorsQuery: useListReportedErrors(),
  };
}

export const errorsLoaderKey: InjectionKey<ErrorsLoader> =
  Symbol("errorsLoader");

export function useErrorsPageLoader(): ErrorsLoader {
  return inject(errorsLoaderKey, null) ?? useErrorsLoader();
}
