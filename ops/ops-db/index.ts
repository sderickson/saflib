export * from "./errors.ts";
export {
  OPS_TOKEN_PREFIX,
  hashOpsToken,
  looksLikeOpsToken,
  mintOpsToken,
} from "./tokens.ts";
export type { MintedOpsToken } from "./tokens.ts";

export { createToken } from "./queries/ops-tokens/create-token.ts";
export { findActiveByHash } from "./queries/ops-tokens/find-active-by-hash.ts";
export { listTokens } from "./queries/ops-tokens/list-tokens.ts";
export { revokeToken } from "./queries/ops-tokens/revoke-token.ts";
export {
  touchLastUsed,
  LAST_USED_RESOLUTION_MS,
} from "./queries/ops-tokens/touch-last-used.ts";
export type {
  CreateTokenParams,
  CreateTokenResult,
} from "./queries/ops-tokens/create-token.ts";
export type { FindActiveByHashResult } from "./queries/ops-tokens/find-active-by-hash.ts";
export type { ListTokensResult } from "./queries/ops-tokens/list-tokens.ts";
export type { RevokeTokenResult } from "./queries/ops-tokens/revoke-token.ts";
export type { TouchLastUsedResult } from "./queries/ops-tokens/touch-last-used.ts";
export { opsTokenScopes } from "./schema.ts";
export type { OpsToken, OpsTokenScope } from "./schema.ts";

import { opsDbManager } from "./instances.ts";

/**
 * For managing connections to the ops database.
 */
export const opsDb = opsDbManager.publicInterface();
