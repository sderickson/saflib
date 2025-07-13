import { UnimplementedUsersService } from "@saflib/auth-rpcs";
import { handleGetUserProfile } from "./get-user-profile.ts";

export const UsersServiceDefinition = UnimplementedUsersService.definition;

export class UsersService extends UnimplementedUsersService {
  GetUserProfile = handleGetUserProfile;
}
