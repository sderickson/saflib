// import * as grpc from "@grpc/grpc-js";
// import type { DbKey } from "@saflib/drizzle";

// interface ApiContext {
//   dbKey: DbKey;
// }

// export class ApiServerInterceptingCall extends grpc.ServerInterceptingCall {
//   constructor(call: grpc.ServerInterceptingCallInterface, ctx: ApiContext) {
//     super(call);
//     this.apiContext = ctx;
//   }
//   apiContext: ApiContext;
// }

// export const createApiInterceptor = (dbKey: DbKey): grpc.ServerInterceptor => {
//   return (
//     _methodDescriptor: grpc.ServerMethodDefinition<any, any>,
//     call: grpc.ServerInterceptingCallInterface,
//   ): grpc.ServerInterceptingCall => {
//     const context = { dbKey };
//     const c = new ApiServerInterceptingCall(call, context);
//     return c;
//   };
// };

/*
  Just keeping this here because it took me a while to figure out how to do this and also type it.
*/
