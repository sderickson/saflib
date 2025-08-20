// @ts-nocheck - TODO remove this line as part of workflow
// TODO: Import your request and response classes from your "@saflib/grpc-specs"-dependent package
// import { GrpcHandlerTemplateRequest, GrpcHandlerTemplateResponse } from "@your-org/rpcs";
// import { UnimplementedGrpcHandlerTemplateService } from "@your-org/rpcs";
import { status } from "@grpc/grpc-js";
import { getSafContext } from "@saflib/node";

// TODO: Replace with proper type annotation once types are imported
// should be:
// export const handleGrpcHandlerTemplate: UnimplementedGrpcHandlerTemplateService["GrpcHandlerTemplate"] = async (call, callback) => {
export const handleGrpcHandlerTemplate = async (call: any, callback: any) => {
  const { log } = getSafContext();
  const request = call.request;

  // TODO: Implement your gRPC handler logic here
  // Example:
  // const result = await someService.processRequest(request);

  // errors should look like this
  let someCheck = true;
  if (someCheck) {
    callback({
      code: status.INTERNAL,
      message: "Internal server error",
    });
    return;
  }

  log.info("GrpcHandlerTemplate handler executed successfully");

  // TODO: Replace with proper response type constructor
  // should be:
  // const response = new GrpcHandlerTemplateResponse();
  const response = {
    success: true,
    message: "Handler implemented successfully",
  };

  callback(null, response);
};
