import UserRef from "./components/UserRef.vue";
import ActorChip from "./components/ActorChip.vue";
import UserPicker from "./components/UserPicker.vue";
import UsersAsync from "./pages/users/UsersAsync.vue";

export { UserRef, ActorChip, UserPicker, UsersAsync };
export type { ActorKind } from "./components/ActorChip.vue";
export { configureOryKratosVue } from "./client.ts";
export {
  useIdentity,
  useListIdentities,
  useGetIdentityAdmin,
  resetIdentityLoaderForTests,
} from "./requests/identities.ts";
export {
  configureUsersPage,
  formatRelative,
  type UsersPageConfig,
  type UserPageLink,
} from "./lib/users-page.ts";
export { users_page } from "./pages/users/Users.strings.ts";
export { isKratosId, createIdentityBatcher } from "./lib/identity-batcher.ts";
export { configureUserLinks, type UserLinks } from "./lib/user-links.ts";
export { initialsFor } from "./lib/initials.ts";
export { user_ref } from "./components/UserRef.strings.ts";
