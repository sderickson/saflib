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

  const displayName = data.displayName.trim();
  if (!displayName) {
    throw createError(400, "displayName must be non-empty after trim");
  }
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw createError(
      400,
      `displayName must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
    );
  }

  const { result, error } = await upsertUserConfig(ctx.baseDbKey, {
    userId: auth.userId,
    displayName,
    marketingEmailsOptIn: data.marketingEmailsOptIn,
    agreeToTermsOfServiceNow: data.termsOfServiceAgreedAt === "now",
  });

  if (error) {
    throw error satisfies never;
  }

  const response: ResponseBody["putMineUserConfigs"][200] = {
    userConfig: mapUserConfigEntityToApi(result!),
  };

  res.status(200).json(response);
});
