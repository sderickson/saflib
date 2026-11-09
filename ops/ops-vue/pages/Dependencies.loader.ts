import { inject, type InjectionKey } from "vue";
import { useOpsDependencies } from "../requests/queries.ts";

export function useDependenciesLoader() {
  return { dependenciesQuery: useOpsDependencies() };
}

export type DependenciesLoader = ReturnType<typeof useDependenciesLoader>;

export const dependenciesLoaderKey: InjectionKey<DependenciesLoader> = Symbol("opsDependenciesLoader");

export function useDependenciesPageLoader(): DependenciesLoader {
  return inject(dependenciesLoaderKey, null) ?? useDependenciesLoader();
}
