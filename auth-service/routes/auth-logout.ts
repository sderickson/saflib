import { createHandler } from "@saflib/node-express";

export const logoutHandler = createHandler(async (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.status(200).end();
  });
});
