import type { UntypedServiceImplementation } from "@grpc/grpc-js";
import { UnimplementedUsersService } from "@saflib/auth-rpcs";
import { handleGetUserProfile } from "./get-user-profile.ts";

export const UsersServiceDefinition = UnimplementedUsersService.definition;

export const UsersServiceImpl: UntypedServiceImplementation = {
  GetUserProfile: handleGetUserProfile,
};
