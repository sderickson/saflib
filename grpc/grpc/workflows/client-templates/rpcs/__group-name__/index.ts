import { __GroupName__Client } from "template-package-grpc-proto";
import { typedEnv } from "../../env.ts";
import * as grpc from "@grpc/grpc-js";
import { __targetName__Fake } from "./__target-name__.fake.ts";

/**
 * A stripped down type of the __TargetName____GroupName__Client, for easier mocking.
 */
export type Limited__GroupName__Client = Pick<
  __GroupName__Client,
  "__TargetName__"
>;

/**
 * The global __TargetName____GroupName__Client for the __service_name__ service.
 */
let __groupName__Client: Limited__GroupName__Client = new __GroupName__Client(
  `${typedEnv.__SERVICE_NAME___SERVICE_HOST}:${typedEnv.__SERVICE_NAME___SERVICE_GRPC_PORT}`,
  grpc.credentials.createInsecure(),
);

if (typedEnv.NODE_ENV === "test") {
  __groupName__Client = {
    __TargetName__: __targetName__Fake,
  };
}

export { __groupName__Client };
export {
  __TargetName__Request,
  __TargetName__Response,
} from "template-package-grpc-proto";
