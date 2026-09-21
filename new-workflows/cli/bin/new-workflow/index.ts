#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { setupContext } from "@saflib/commander";
import { setServiceName } from "@saflib/node";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
import {
  AddDrizzleQueryWorkflowDefinition,
  UpdateSchemaWorkflowDefinition,
} from "@saflib/drizzle-workflows";
import {
  OpenApiRouteWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  AddEventWorkflowDefinition,
} from "@saflib/openapi-workflows";
import { AddHandlerWorkflowDefinition } from "@saflib/express-workflows";
import {
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
  AddComponentWorkflowDefinition,
} from "@saflib/sdk-workflows";
import {
  AddSpaViewWorkflowDefinition,
  AddSpaWorkflowDefinition,
  AddStaticSiteWorkflowDefinition,
  AddE2eTestWorkflowDefinition,
} from "@saflib/vue-workflows";
import {
  CronInitWorkflowDefinition,
  CronAddJobWorkflowDefinition,
} from "@saflib/cron-http-workflows";
import { AddEnvVarWorkflowDefinition } from "@saflib/env-workflows";
import {
  AddExportWorkflowDefinition,
  AddTsPackageWorkflowDefinition,
} from "@saflib/monorepo-workflows";
import { AddCallWorkflowDefinition } from "@saflib/integrations-workflows";
import { AddEmailTemplateWorkflowDefinition } from "@saflib/email-service-workflows";
import {
  JobsInitWorkflowDefinition,
  JobsAddJobWorkflowDefinition,
} from "@saflib/jobs-http-workflows";
import {
  ServiceAddStoreWorkflowDefinition,
  InitCommonWorkflowDefinition,
} from "@saflib/service-workflows";
import { SpecProjectWorkflowDefinition } from "@saflib/processes-workflows";
import { runNewWorkflowCli } from "../../index.ts";

/**
 * Hand-written registry until a scaffolding tool replaces it.
 */
const registry = [
  HelloWorkflowDefinition,
  AddDrizzleQueryWorkflowDefinition,
  UpdateSchemaWorkflowDefinition,
  OpenApiRouteWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  AddEventWorkflowDefinition,
  AddHandlerWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
  AddComponentWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
  AddSpaWorkflowDefinition,
  AddStaticSiteWorkflowDefinition,
  AddE2eTestWorkflowDefinition,
  CronInitWorkflowDefinition,
  CronAddJobWorkflowDefinition,
  AddEnvVarWorkflowDefinition,
  AddExportWorkflowDefinition,
  AddTsPackageWorkflowDefinition,
  AddCallWorkflowDefinition,
  AddEmailTemplateWorkflowDefinition,
  JobsInitWorkflowDefinition,
  JobsAddJobWorkflowDefinition,
  ServiceAddStoreWorkflowDefinition,
  InitCommonWorkflowDefinition,
  SpecProjectWorkflowDefinition,
];

setServiceName("new-workflow");

process.env.DEPLOYMENT_NAME ??= "local";
process.env.ALLOW_DB_CREATION ??= "true";

setupContext({ serviceName: "new-workflow" }, () => {
  const dbKey = newWorkflowsDbManager.connect({ onDisk: true });
  void runNewWorkflowCli(registry, dbKey);
});
