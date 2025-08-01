declare module "express-csrf-double-submit-cookie" {
  import { RequestHandler } from "express";

  function csrfDoubleSubmitCookie(): RequestHandler & {
    validate: RequestHandler;
  };

  export default csrfDoubleSubmitCookie;
}
