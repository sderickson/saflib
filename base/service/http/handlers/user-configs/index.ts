import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as getMineUserConfigsOperationJsonSpec } from "@saflib/base-spec/operations/getMineUserConfigs";
import { operationJsonSpec as putMineUserConfigsOperationJsonSpec } from "@saflib/base-spec/operations/putMineUserConfigs";
import { operationJsonSpec as unsubscribeMarketingEmailsUserConfigsOperationJsonSpec } from "@saflib/base-spec/operations/unsubscribeMarketingEmailsUserConfigs";

import { getMineUserConfigsHandler } from "./get-mine.ts";
import { putMineUserConfigsHandler } from "./put-mine.ts";
import { unsubscribeMarketingEmailsUserConfigsHandler } from "./unsubscribe-marketing.ts";

/** Owner-scoped user_config routes (+ public marketing unsubscribe). */
export function createUserConfigsRouter(): IRouter {
  const router = express.Router();

  // `no-auth` OpenAPI tag skips session/CSRF on this operation.
  router.post(
    "/user-configs/unsubscribe-marketing",
    ...createOperationScopedMiddleware(
      unsubscribeMarketingEmailsUserConfigsOperationJsonSpec,
      { enforceAuth: false },
    ),
    unsubscribeMarketingEmailsUserConfigsHandler,
  );
  router.get(
    "/user-configs/mine",
    ...createOperationScopedMiddleware(getMineUserConfigsOperationJsonSpec),
    getMineUserConfigsHandler,
  );
  router.put(
    "/user-configs/mine",
    ...createOperationScopedMiddleware(putMineUserConfigsOperationJsonSpec),
    putMineUserConfigsHandler,
  );

  return router;
}
