import { inject } from "vue";
import {
  asyncPageErrorKey,
  type AsyncPageErrorComponent,
} from "../async-page-error.ts";
import AsyncPageError from "../components/AsyncPageError.vue";

export function useAsyncPageErrorComponent(): AsyncPageErrorComponent {
  return inject(asyncPageErrorKey, AsyncPageError);
}
