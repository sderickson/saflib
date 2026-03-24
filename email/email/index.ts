export * from "./client/email-client.ts";
export {
  createEmailsRouter,
  type EmailsRouterOptions,
} from "./routes/emails/index.ts";
export { postKratosCourier } from "./routes/emails/post-kratos-courier.ts";
