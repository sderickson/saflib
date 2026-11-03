import type {
  ResponseBody,
  RequestBody,
} from "@saflib/base-spec/operations/putMineUserConfigs";
import { createHandler } from "@saflib/express";
import { baseServiceStorage } from "@saflib/base-service-common/context";
import { getSafContextWithAuth } from "@saflib/node";
import createError from "http-errors";

import { mapUserConfigEntityToApi } from "./_helpers.ts";
import { upsertUserConfig } from "@saflib/base-db/queries/user-config/upsert";

const DISPLAY_NAME_MAX_LENGTH = 80;

export const putMineUserConfigsHandler = createHandler(async (req, res) => {
  const ctx = baseServiceStorage.getStore()!;
  const { auth } = getSafContextWithAuth();
  const data: RequestBody["putMineUserConfigs"] = req.body;

  const display_name = data.display_name.trim();
  if (!display_name) {
    throw createError(400, "display_name must be non-empty after trim");
  }
  if (display_name.length > DISPLAY_NAME_MAX_LENGTH) {
    throw createError(
      400,
      `display_name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
    );
  }

  const { result, error } = await upsertUserConfig(ctx.baseDbKey, {
    user_id: auth.userId,
    display_name,
    marketing_emails_opt_in: data.marketing_emails_opt_in,
    agreeToTermsOfServiceNow: data.terms_of_service_agreed_at === "now",
  });

  if (error) {
    throw error satisfies never;
  }

  const response: ResponseBody["putMineUserConfigs"][200] = {
    user_config: mapUserConfigEntityToApi(result!),
  };

  res.status(200).json(response);
});
