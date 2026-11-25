import UserRef from "./components/UserRef.vue";
import ActorChip from "./components/ActorChip.vue";

export { UserRef, ActorChip };
export type { ActorKind } from "./components/ActorChip.vue";
export { configureOryKratosVue } from "./client.ts";
export { useIdentity, resetIdentityLoaderForTests } from "./requests/identities.ts";
export { isKratosId, createIdentityBatcher } from "./lib/identity-batcher.ts";
export { configureUserLinks, type UserLinks } from "./lib/user-links.ts";
export { initialsFor } from "./lib/initials.ts";
export { user_ref } from "./components/UserRef.strings.ts";
