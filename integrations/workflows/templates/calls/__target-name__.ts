import { __integrationName__, isMocked } from "../client.ts";
import { mock__TargetName__ } from "./__target-name__.mocks.ts";

// TODO: Define the return type for this call.
export interface __TargetName__Result {
  [key: string]: unknown;
}

// TODO: Add parameters if needed.
// export interface __TargetName__Params { ... }

/**
 * TODO: Describe what this call does.
 */
export async function __targetName__(): Promise<__TargetName__Result> {
  if (isMocked) {
    return mock__TargetName__();
  }

  // TODO: Implement the real call using the scoped client.
  void __integrationName__;
  return {};
}
