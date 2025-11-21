import type {
  ContainerGetPropertiesResponse,
  PublicAccessType,
  AccessTier,
} from "@azure/storage-blob";
import { typedEnv } from "../env.ts";
import { getBlobServiceClient } from "./client.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { getSafReporters } from "@saflib/node";

export interface UpsertContainerParams {
  name: string;
  accessLevel: "blob" | "container" | "private";
  tier?: AccessTier;
}

export interface ContainerResult {
  success: boolean;
  created?: boolean;
  updated?: boolean;
  skipped?: boolean;
  url?: string;
}

export class ContainerCreationError extends Error {
  constructor(containerName: string, cause?: Error) {
    super(`Failed to create container ${containerName}`);
    this.name = "ContainerCreationError";
    if (cause) {
      this.cause = cause;
    }
  }
}

export class ContainerUpdateError extends Error {
  constructor(containerName: string, cause?: Error) {
    super(`Failed to update container ${containerName}`);
    this.name = "ContainerUpdateError";
    if (cause) {
      this.cause = cause;
    }
  }
}

export class AzureContainerError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "AzureContainerError";
    this.cause = cause;
  }
}

let containersUpserted = new Set<string>();

export async function upsertContainer({
  name,
  accessLevel,
  tier = "Hot",
}: UpsertContainerParams): Promise<
  ReturnsError<
    ContainerResult,
    ContainerCreationError | ContainerUpdateError | AzureContainerError
  >
> {
  const { log, logError } = getSafReporters();
  if (typedEnv.NODE_ENV === "test") {
    return {
      result: {
        success: true,
        created: true,
        url: `https://mock-storage.blob.core.windows.net/${name}`,
      },
    };
  }

  if (containersUpserted.has(name)) {
    return {
      result: {
        success: true,
        skipped: true,
      },
    };
  }

  const blobServiceClient = getBlobServiceClient({ tier });
  const containerClient = blobServiceClient.getContainerClient(name);

  let created = false;
  let updated = false;
  let exists: boolean | undefined = undefined;
  let properties: ContainerGetPropertiesResponse | undefined = undefined;

  log.info(`Upserting azure blob storage container ${name}`);

  try {
    exists = await containerClient.exists();
  } catch (error) {
    logError(error);
    return {
      error: new AzureContainerError(
        "Error checking if container exists",
        error instanceof Error ? error : undefined,
      ),
    };
  }

  if (!exists) {
    log.info(`Container ${name} does not exist, creating`);
    const publicAccess: PublicAccessType | undefined =
      accessLevel === "private" ? undefined : accessLevel;
    try {
      await containerClient.create({ access: publicAccess });
      created = true;
      log.info(`Container created.`);
    } catch (error) {
      logError(error);
      return {
        error: new AzureContainerError(
          "Error creating container",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  } else {
    try {
      properties = await containerClient.getProperties();
    } catch (error) {
      logError(error);
      return {
        error: new AzureContainerError(
          "Error getting container properties",
          error instanceof Error ? error : undefined,
        ),
      };
    }
    const currentAccess = properties.blobPublicAccess;

    const needsUpdate =
      (accessLevel === "private" && currentAccess !== undefined) ||
      (accessLevel === "blob" && currentAccess !== "blob") ||
      (accessLevel === "container" && currentAccess !== "container");

    if (needsUpdate) {
      log.info(
        `Container ${name} needs update, updating access level to ${accessLevel}`,
      );
      const publicAccess: PublicAccessType | undefined =
        accessLevel === "private"
          ? undefined
          : (accessLevel as PublicAccessType);
      try {
        await containerClient.setAccessPolicy(publicAccess);
        updated = true;
        log.info(`Container access level updated.`);
      } catch (error) {
        logError(error);
        return {
          error: new AzureContainerError(
            "Error updating container access level",
            error instanceof Error ? error : undefined,
          ),
        };
      }
    }
  }

  containersUpserted.add(name);

  return {
    result: {
      success: true,
      created,
      updated,
      url: containerClient.url,
    },
  };
}

