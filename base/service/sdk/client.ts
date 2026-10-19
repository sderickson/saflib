import type { paths } from "@saflib/base-spec";
import { createApiClient } from "@saflib/base-sdk-common/client";

/** The base API client, typed by the base spec. */
export const getClient = createApiClient<paths>();
