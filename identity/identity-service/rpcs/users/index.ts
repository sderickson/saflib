import { users } from "@saflib/identity-rpcs";
import { handleGetUserProfile } from "./get-user-profile.ts";

export const UsersServiceDefinition =
  users.UnimplementedUsersService.definition;

export class UsersService extends users.UnimplementedUsersService {
  GetUserProfile = handleGetUserProfile;
}
