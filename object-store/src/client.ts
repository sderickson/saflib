import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { getSafReporters } from "@saflib/node";
import { typedEnv } from "../env.ts";
import type { AccessTier } from "@azure/storage-blob";

type AccessTierKey = "Hot" | "Cool" | "Cold";

let blobServiceClients: Record<AccessTierKey, BlobServiceClient | undefined> = {
  Hot: undefined,
  Cool: undefined,
  Cold: undefined,
};

interface GetBlobServiceClientParams {
  tier?: AccessTier;
}

export function getBlobServiceClient({
  tier = "Hot",
}: GetBlobServiceClientParams = {}): BlobServiceClient {
  let url: string | undefined;
  switch (tier) {
    case "Hot":
      url = typedEnv.AZURE_HOT_BLOB_STORAGE_URL;
      break;
    case "Cool":
      url = typedEnv.AZURE_COOL_BLOB_STORAGE_URL;
      break;
    case "Cold":
      url = typedEnv.AZURE_COLD_BLOB_STORAGE_URL;
      break;
    default:
      throw new Error(`Invalid access tier: ${tier}`);
  }
  if (!url) {
    throw new Error(`URL not found for tier: ${tier}`);
  }

  if (!blobServiceClients[tier]) {
    const { log } = getSafReporters();
    const isAzurite = url.includes("azurite");

    try {
      blobServiceClients[tier] = new BlobServiceClient(
        url,
        isAzurite
          ? new StorageSharedKeyCredential(
              "devstoreaccount1",
              "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
            )
          : new DefaultAzureCredential(),
      );
      log.info(
        `BlobServiceClient initialized with ${isAzurite ? "Azurite" : "DefaultAzureCredential"} authentication`,
      );
    } catch (error) {
      log.error("Failed to initialize BlobServiceClient:", error);
      throw error;
    }
  }
  return blobServiceClients[tier];
}

