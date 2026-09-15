import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { stringify } from "yaml";
import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type {
  NewWorkflowsRequestBody,
  NewWorkflowsResponseBody,
} from "@saflib/new-workflows-spec";
import { validateWorkflowConfigBody } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";

const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const createPlanHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  if (!ctx.plansRoot) {
    throw createError(500, "This host hasn't configured a plans folder.");
  }
  const body = req.body as NewWorkflowsRequestBody["createPlan"];

  if (!NAME_PATTERN.test(body.name)) {
    throw createError(400, `"name" must be kebab-case (e.g. "add-list-users-query"), got "${body.name}"`);
  }

  const { result: configBody, error } = validateWorkflowConfigBody(body.body);
  if (error) throw createError(400, error.message);

  const date = new Date().toISOString().split("T")[0];
  const folder = `${date}-${body.name}`;
  const fileName = `${body.name}.yaml`;
  const folderPath = path.join(ctx.plansRoot, folder);
  mkdirSync(folderPath, { recursive: true });
  writeFileSync(path.join(folderPath, fileName), stringify(configBody));

  const response: NewWorkflowsResponseBody["createPlan"][201] = {
    plan: {
      folder,
      name: body.name,
      files: [
        {
          name: fileName,
          path: path.relative(ctx.defaultCwd, path.join(folderPath, fileName)),
        },
      ],
    },
  };
  res.status(201).json(response);
});
