import type { paths } from "@saflib/base-__offshoot-name__-spec";
import { createApiClient } from "@saflib/base-sdk-common/client";

/**
 * This offshoot's API client, typed by its own spec. Requests import it as
 * `#client.ts`; the offshoot never imports the product's SDK.
 */
export const getClient = createApiClient<paths>();
